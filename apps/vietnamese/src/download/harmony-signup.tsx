import { type FormEvent, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { BACKEND_ORIGIN } from "../../shared/words";
import { fieldLabelClass, hintClass, inputClass } from "../feedback/styles";
import { readFeedbackResponse } from "../feedback-response";
import { loadTurnstile } from "../turnstile";
import { Button, cx } from "../ui";
import { useLocale } from "../use-locale";

/** msime-cloud 把账号加进 AppGallery Connect 的外部测试群组；同一路径的 GET 返回是否开放和 Turnstile 站点密钥。 */
const HARMONY_SIGNUP_URL = `${BACKEND_ORIGIN}/v1/community/harmony-testers`;
const settingsSchema = z.object({ enabled: z.boolean(), site_key: z.string() });
const registeredSchema = z.object({ registered: z.literal(true) });
const MAX_ACCOUNT_LENGTH = 256;

type Phase = "loading" | "ready" | "unavailable" | "done";

/**
 * 鸿蒙内测的自助登记：AppTest 只放行登记过的华为账号，访客在这里填自己的账号，登记后再扫码或输入邀请码。
 * 服务端没开放、取不到设置或 Turnstile 加载失败时，回到原来的做法：把账号发到 QQ 群由管理员登记。
 */
export function HarmonySignup({ qqGroup }: { qqGroup: string }) {
  const { t, tw } = useLocale();
  const [phase, setPhase] = useState<Phase>("loading");
  const [account, setAccount] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const formShown = phase === "loading" || phase === "ready";

  // 验证组件在表单里，登记成功后表单被换掉；回到表单时重新渲染，否则「登记其他账号」会留下一个空容器。
  useEffect(() => {
    if (!formShown) return;
    let active = true;
    const controller = new AbortController();
    setToken("");
    async function setup() {
      try {
        const response = await fetch(HARMONY_SIGNUP_URL, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        const settings = settingsSchema.safeParse(await readFeedbackResponse(response, ""));
        if (!response.ok || !settings.success || !settings.data.enabled || !settings.data.site_key) throw new Error("unavailable");
        const api = await loadTurnstile();
        if (!active || !widget.current) return;
        // interaction-only：大多数访客看不到验证组件，只有 Cloudflare 需要人工确认时才显示。
        widgetId.current = api.render(widget.current, {
          sitekey: settings.data.site_key,
          action: "harmony",
          size: "normal",
          appearance: "interaction-only",
          language: tw ? "zh-TW" : "zh-CN",
          callback: value => { if (active) setToken(value); },
          "expired-callback": () => { if (active) setToken(""); },
          "error-callback": () => { if (active) { setToken(""); setError(true); setMessage("验证失败，请检查网络后刷新页面重试。"); } },
        });
        setPhase("ready");
      } catch {
        if (active) setPhase("unavailable");
      }
    }
    void setup();
    return () => {
      active = false;
      controller.abort();
      if (widgetId.current !== undefined) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [tw, formShown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const value = account.trim();
    if (!value) { setError(true); setMessage("请填写登录华为账号用的手机号或邮箱。"); input.current?.focus(); return; }
    if (!token) { setError(false); setMessage("正在完成提交验证，请稍候再点登记。"); return; }
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch(HARMONY_SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: value, token }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = await readFeedbackResponse(response, "");
      if (!response.ok || !registeredSchema.safeParse(data).success) {
        throw new Error(typeof data.error === "string" && data.error ? data.error : "登记失败，请稍后再试。");
      }
      setAccount("");
      setPhase("done");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error && reason.message && !(reason instanceof TypeError) && !(reason instanceof DOMException) ? reason.message : "登记失败，请检查网络后重试。");
    } finally {
      // 令牌只能用一次，不论成败都重新验证。
      setToken("");
      if (widgetId.current !== undefined) window.turnstile?.reset(widgetId.current);
      setBusy(false);
    }
  }

  if (phase === "unavailable") {
    return (
      <p className="m-0 mt-4 text-sm leading-[1.8] text-body">
        {t("加入前：先到 QQ 群 ")}
        <span className="select-all font-semibold text-ink tabular-nums">{qqGroup}</span>
        {t(" 把你登录华为账号用的邮箱或手机号发给小莫，登记到测试名单后再扫码或输入邀请码。")}
      </p>
    );
  }

  if (phase === "done") {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" role="status">
        <p className="m-0 text-sm leading-[1.8] font-semibold text-ink">{t("已登记到测试名单，现在扫码或输入邀请码加入测试。")}</p>
        <Button variant="ghost" size="sm" onClick={() => { setMessage(""); setError(false); setPhase("loading"); }}>{t("登记其他账号")}</Button>
      </div>
    );
  }

  return (
    <form className="mt-4 grid gap-2" onSubmit={submit} noValidate>
      <label className={fieldLabelClass} htmlFor="harmony-account">{t("加入前：登记你登录华为账号用的手机号或邮箱，再扫码或输入邀请码。")}</label>
      <div className="flex max-w-[520px] items-end gap-2">
        <input
          ref={input}
          id="harmony-account"
          className={inputClass}
          name="account"
          value={account}
          maxLength={MAX_ACCOUNT_LENGTH}
          placeholder={t("手机号或邮箱")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          data-msime="off"
          aria-invalid={error || undefined}
          aria-describedby="harmony-account-status"
          disabled={busy}
          onChange={event => { setAccount(event.target.value); if (error) { setError(false); setMessage(""); } }}
        />
        <Button type="submit" variant="primary" size="sm" className="h-11 flex-none px-5" disabled={busy || phase === "loading"}>{t(busy ? "登记中…" : "登记")}</Button>
      </div>
      <div ref={widget} />
      <p id="harmony-account-status" className={cx(hintClass, error && "text-warn")} aria-live="polite">
        {t(message || "大陆手机号直接写 11 位，其他地区写成「+区号 号码」。账号只用于登记到华为的测试名单，水杉不保存。")}
      </p>
    </form>
  );
}
