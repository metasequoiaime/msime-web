import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountCall, ApiError, ignoreBody } from "../data/account";
import { inputClass } from "../feedback/styles";
import { Button } from "../ui";
import { useLocale } from "../use-locale";

const ERRORS: Record<string, string> = {
  invalid_target: "请输入有效的邮箱地址。",
  invalid_credentials: "验证码错误或已失效，请检查后重试，或重新发送。",
  account_banned: "该账号已被停用。",
  rate_limit_exceeded: "尝试次数过多，请稍后再试。",
  provider_disabled: "邮箱登录暂未开放，请稍后再试。",
};

type Challenge = { challenge_id: string; expires_in: number; expiresAt: number };

/** `confirmConsent` is the dialog's consent gate: it runs before any request and returns false (and prompts) while the box is unticked. */
export function EmailLogin({ confirmConsent, onBusyChange, onSignedIn }: { confirmConsent: () => boolean; onBusyChange: (busy: boolean) => void; onSignedIn: () => void }) {
  const { t } = useLocale();
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState<"sending" | "signing-in" | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = challenge !== null && challenge.expiresAt <= now;
  const ticking = seconds > 0 || (challenge !== null && !expired);

  useEffect(() => () => { pending.current?.abort(); }, []);
  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  useEffect(() => { if (challenge) codeRef.current?.focus(); }, [challenge]);

  const perform = async (action: "sending" | "signing-in") => {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(action);
    onBusyChange(true);
    setMessage("");
    setNotice("");
    try {
      if (action === "sending") {
        const value = await accountCall("/api/auth/challenge", async response => {
          const { z } = await import("zod");
          return z.object({ challenge_id: z.string().min(1), expires_in: z.number().int().positive().max(300) }).parse(response);
        }, { method: "POST", body: { provider: "email", target: email.trim() }, signal: controller.signal });
        if (controller.signal.aborted) return;
        const timestamp = Date.now();
        setNow(timestamp);
        setChallenge({ ...value, expiresAt: timestamp + value.expires_in * 1000 });
        setResendAt(timestamp + 60_000);
        setCode("");
        setNotice("验证码已发送，请查收邮件；未收到时请检查垃圾邮件。");
      } else {
        if (!challenge || challenge.expiresAt <= Date.now()) {
          setMessage("验证码已过期，请重新发送。");
          setNow(Date.now());
          return;
        }
        await accountCall("/api/auth/login", ignoreBody, { method: "POST", body: { challenge_id: challenge.challenge_id, credential: code }, signal: controller.signal });
        if (!controller.signal.aborted) onSignedIn();
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const errorCode = error instanceof ApiError ? error.code : "";
      setMessage(ERRORS[errorCode] ?? (action === "sending" ? "暂时无法发送验证码，请稍后再试。" : "登录失败，请检查网络后重试。"));
      if (errorCode === "rate_limit_exceeded") {
        setNow(Date.now());
        setResendAt(Date.now() + 60_000);
      }
    } finally {
      if (!controller.signal.aborted) {
        pending.current = null;
        setBusy(null);
        onBusyChange(false);
      }
    }
  };

  const sendCode = () => {
    if (Date.now() < resendAt || !confirmConsent() || !emailRef.current?.reportValidity()) return;
    void perform("sending");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!challenge) sendCode();
    else if (/^\d{6}$/.test(code) && confirmConsent()) void perform("signing-in");
  };

  return (
    <form onSubmit={submit} aria-label={t("邮箱验证码登录")} aria-busy={Boolean(busy)}>
      <label htmlFor="login-email" className="block text-sm text-ink">{t("邮箱")}</label>
      <input ref={emailRef} id="login-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} data-msime="off" required maxLength={254} className={inputClass} value={email} disabled={Boolean(busy)} onChange={event => { setEmail(event.target.value); setChallenge(null); setCode(""); setMessage(""); setNotice(""); }} />
      {challenge && (
        <>
          <label htmlFor="login-code" className="mt-4 block text-sm text-ink">{t("六位验证码")}</label>
          <input ref={codeRef} id="login-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" data-msime="off" required pattern="[0-9]{6}" maxLength={6} className={inputClass} value={code} disabled={Boolean(busy) || expired} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} aria-describedby={expired ? "login-code-expired" : undefined} />
          {expired && <p id="login-code-expired" className="m-0 mt-2 text-sm text-warn" role="status">{t("验证码已过期，请重新发送。")}</p>}
        </>
      )}
      <Button type="submit" className="mt-4 w-full" disabled={Boolean(busy) || !email.trim() || (challenge ? expired || !/^\d{6}$/.test(code) : seconds > 0)}>
        {t(busy === "sending" ? "正在发送…" : busy === "signing-in" ? "正在登录…" : challenge ? "登录" : "发送验证码")}
      </Button>
      {(challenge || seconds > 0) && (
        <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={Boolean(busy) || seconds > 0 || !email.trim()} onClick={sendCode}>
          {t(seconds > 0 ? `${seconds} 秒后可重新发送` : "重新发送验证码")}
        </Button>
      )}
      {notice && <p className="m-0 mt-3 text-sm text-muted" role="status">{t(notice)}</p>}
      {message && <p className="m-0 mt-3 text-sm text-warn" role="alert">{t(message)}</p>}
    </form>
  );
}
