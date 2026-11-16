import { useEffect, useRef, useState } from "react";
import { accountCall, ApiError, ignoreBody } from "../data/account";
import { Button, cx } from "../ui";
import { useLocale } from "../use-locale";

type GoogleId = {
  initialize: (config: { client_id: string; nonce: string; callback: (response: { credential?: string }) => void; ux_mode: "popup"; auto_select: boolean; context: "signin"; itp_support: boolean }) => void;
  renderButton: (parent: HTMLElement, options: { type: "standard"; theme: "outline" | "filled_black"; size: "large"; text: "signin_with"; shape: "pill"; logo_alignment: "left"; width: number; locale: string }) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsi: Promise<GoogleId> | undefined;

/** Loads the Google Identity Services script once, only when someone opens the sign-in dialog. The CSP allows exactly this script and its frames. */
const loadGoogleId = () =>
  (gsi ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    const timeout = window.setTimeout(() => {
      gsi = undefined;
      script.remove();
      reject(new Error("Google Identity Services timed out"));
    }, 10000);
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else {
        gsi = undefined;
        script.remove();
        reject(new Error("Google Identity Services did not load"));
      }
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      gsi = undefined;
      script.remove();
      reject(new Error("Google Identity Services did not load"));
    };
    document.head.append(script);
  }));

const prefersDark = () => {
  const theme = document.documentElement.dataset.theme;
  return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
};

/** Google has its own loading and error state; switching to email cancels setup and ignores late callbacks. */
export function GoogleLogin({ clientId, onBusyChange, onSignedIn }: { clientId: string; onBusyChange: (busy: boolean) => void; onSignedIn: () => void }) {
  const { t, tw } = useLocale();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "signing-in" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: incrementing attempt requests a fresh single-use challenge and renders a new Google button
  useEffect(() => {
    let cancelled = false;
    let submitting = false;
    const controller = new AbortController();
    setState("loading");
    void (async () => {
      try {
        const google = await loadGoogleId();
        if (cancelled) return;
        const challenge = await accountCall("/api/auth/challenge", async value => {
          const { z } = await import("zod");
          return z.object({ challenge_id: z.string(), nonce: z.string() }).parse(value);
        }, { method: "POST", body: { provider: "google" }, signal: controller.signal });
        if (cancelled || !buttonRef.current) return;
        google.initialize({
          client_id: clientId, nonce: challenge.nonce, ux_mode: "popup", auto_select: false, context: "signin", itp_support: true,
          callback: async ({ credential }) => {
            if (!credential || cancelled || submitting) return;
            submitting = true;
            setState("signing-in");
            onBusyChange(true);
            try {
              await accountCall("/api/auth/login", ignoreBody, { method: "POST", body: { challenge_id: challenge.challenge_id, credential }, signal: controller.signal });
              if (!cancelled) onSignedIn();
            } catch (error) {
              if (cancelled) return;
              const code = error instanceof ApiError ? error.code : "";
              setMessage(code === "account_banned" ? "该账号已被停用。" : code === "rate_limit_exceeded" ? "尝试次数过多，请稍后再试。" : "Google 登录失败，请重试或使用邮箱登录。");
              setAttempt(value => value + 1);
            } finally {
              if (!cancelled) onBusyChange(false);
            }
          },
        });
        buttonRef.current.replaceChildren();
        google.renderButton(buttonRef.current, { type: "standard", theme: prefersDark() ? "filled_black" : "outline", size: "large", text: "signin_with", shape: "pill", logo_alignment: "left", width: 260, locale: tw ? "zh-TW" : "zh-CN" });
        setState("ready");
      } catch {
        if (cancelled) return;
        setMessage("暂时无法连接 Google，请重试或使用邮箱登录。");
        setState("failed");
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [attempt, clientId, onBusyChange, onSignedIn, tw]);

  return (
    <div className="grid min-h-11 justify-items-center gap-3">
      <div ref={buttonRef} className={cx(state !== "ready" && "hidden")} />
      {state === "loading" && <p className="m-0 text-sm text-muted" role="status">{t("正在准备 Google 登录…")}</p>}
      {state === "signing-in" && <p className="m-0 text-sm text-muted" role="status">{t("正在登录…")}</p>}
      {message && <p className="m-0 text-sm text-warn" role="alert">{t(message)}</p>}
      {state === "failed" && <Button variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>{t("重试")}</Button>}
    </div>
  );
}
