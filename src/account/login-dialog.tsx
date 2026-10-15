import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { authConfigQuery, webLoginAvailable } from "../data/account";
import { LocaleLink } from "../locale-link";
import { Button, CloseIcon, useToast } from "../ui";
import { useLocale } from "../use-locale";
import { EmailLogin } from "./login-email";
import { GoogleLogin } from "./login-google";

/** Email is the default when available. Google loads only after choosing it, so a blocked Google connection cannot hold up email sign-in. */
export function LoginDialog({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  const { t } = useLocale();
  const { show } = useToast();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const config = useQuery(authConfigQuery());
  const [method, setMethod] = useState<"email" | "google">("email");
  const [busy, setBusy] = useState(false);
  const email = config.data?.email_enabled === true;
  const google = config.data?.google_client_id;
  const selected = email ? method : "google";
  const signedIn = useCallback(() => {
    onSignedIn();
    show(t("已登录"));
    onClose();
  }, [onSignedIn, show, t, onClose]);

  useEffect(() => { dialogRef.current?.showModal(); }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="login-title"
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(calc(100vw-32px),400px)] overflow-y-auto rounded-card border-0 bg-panel p-0 text-ink shadow-card backdrop:bg-black/40"
      onClose={onClose}
      onCancel={event => { if (busy) event.preventDefault(); }}
    >
      <div className="relative px-6 pt-6 pb-5">
        <button type="button" className="absolute top-3 right-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-panel-2 hover:text-ink disabled:opacity-45" aria-label={t("关闭")} disabled={busy} onClick={() => dialogRef.current?.close()}>
          <CloseIcon />
        </button>
        <h2 id="login-title" className="m-0 pr-6 font-heading text-lg font-bold">{t("登录水杉输入法账号")}</h2>
        <p className="m-0 mt-2 text-[13.5px] leading-[1.75] text-muted">{t("登录后可以收藏、评分，并在「我的」中管理词库、快捷短语和云剪贴板。请使用你在 App 中绑定的登录方式。")}</p>
        <div className="mt-5">
          {config.isPending ? <p className="m-0 text-sm text-muted" role="status">{t("正在读取登录方式…")}</p> : config.isError ? (
            <div>
              <p className="m-0 text-sm text-warn" role="alert">{t("暂时无法读取登录方式，请检查网络后重试。")}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => void config.refetch()}>{t("重试")}</Button>
            </div>
          ) : !webLoginAvailable(config.data, false) ? (
            <p className="m-0 text-sm text-muted" role="status">{t("网页登录暂未开放，请在水杉输入法 App 中登录。")}</p>
          ) : (
            <>
              {selected === "email" && email && <EmailLogin onBusyChange={setBusy} onSignedIn={signedIn} />}
              {selected === "google" && google && <GoogleLogin clientId={google} onBusyChange={setBusy} onSignedIn={signedIn} />}
              {email && google && (
                <Button variant="ghost" size="sm" className="mt-4 w-full" disabled={busy} onClick={() => setMethod(selected === "email" ? "google" : "email")}>
                  {t(selected === "email" ? "使用 Google 登录" : "使用邮箱登录")}
                </Button>
              )}
            </>
          )}
        </div>
        <p className="m-0 mt-5 text-center text-xs leading-[1.7] text-muted">
          {t("登录即表示你了解")}
          <LocaleLink to="/privacy/" onClick={onClose}>{t("隐私说明")}</LocaleLink>
        </p>
      </div>
    </dialog>
  );
}
