import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountCall, authConfigQuery, hasSessionHint, ignoreBody, meQuery, SESSION_HINT_KEY, setSessionHint, SIGNED_OUT_EVENT } from "../data/account";
import type { Me } from "../data/schemas";
import { Button, CloseIcon, cx, useToast } from "../ui";
import { useSearchReady } from "../use-page-search";
import { useLocale } from "../use-locale";
import { LocaleLink } from "../locale-link";

/*
 * Who is signed in, for the header and every page that reacts to it. The session itself is a pair of HttpOnly cookies the page cannot read (shared/site-session.ts); this only asks `/api/me` and remembers, through a localStorage hint, whether there is any point asking.
 */

export type SessionStatus = "unknown" | "signed-out" | "signed-in";

type AccountContextValue = {
  /** `unknown` while the static HTML hydrates and while `/api/me` is answering for a browser that has signed in before. */
  status: SessionStatus;
  me: Me | null;
  openLogin: () => void;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const ready = useSearchReady();
  const [hinted, setHinted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    setHinted(hasSessionHint());
    // Another tab signing in or out changes the hint; follow it.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_HINT_KEY) return;
      setHinted(event.newValue === "1");
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  const me = useQuery({ ...meQuery(), enabled: ready && hinted });

  const signedOut = useCallback(() => {
    setSessionHint(false);
    setHinted(false);
    queryClient.setQueryData(meQuery().queryKey, null);
    void queryClient.invalidateQueries({ queryKey: ["account"], predicate: query => query.queryKey[1] !== "me" });
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener(SIGNED_OUT_EVENT, signedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, signedOut);
  }, [signedOut]);

  // `/api/me` said 401: the cookies expired or were cleared elsewhere, so stop asking on every page.
  useEffect(() => {
    if (me.data === null && hinted) setSessionHint(false);
  }, [me.data, hinted]);

  const signedIn = useCallback(() => {
    setSessionHint(true);
    setHinted(true);
    void queryClient.invalidateQueries({ queryKey: ["account"] });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await accountCall("/api/auth/logout", ignoreBody, { method: "POST" });
    } catch {
      // The Function clears the cookies whatever the backend says; a failed call here is a network error, and the page still forgets the session.
    }
    signedOut();
    show(t("已退出登录"));
  }, [signedOut, show, t]);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const status: SessionStatus = !ready ? "unknown" : !hinted ? "signed-out" : me.isPending ? "unknown" : me.data ? "signed-in" : "signed-out";
  const value = useMemo<AccountContextValue>(() => ({ status, me: me.data ?? null, openLogin, signOut }), [status, me.data, openLogin, signOut]);

  return (
    <AccountContext.Provider value={value}>
      {children}
      {loginOpen && <LoginDialog onClose={closeLogin} onSignedIn={signedIn} />}
    </AccountContext.Provider>
  );
}

export const useAccount = () => {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside AccountProvider");
  return value;
};

// ---- Google Identity Services ----

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
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error("Google Identity Services did not load")));
    script.onerror = () => {
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

type LoginState = "loading" | "ready" | "signing-in" | "disabled" | "failed";

const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: "Google 登录没有通过验证，请重试。",
  account_banned: "该账号已被停用。",
  rate_limit_exceeded: "尝试次数过多，请稍后再试。",
  provider_disabled: "网页登录暂未开放。",
};

/**
 * The sign-in dialog: one Google button. Each attempt gets a fresh backend challenge, whose nonce Google signs into the ID token; the token goes straight to `/api/auth/login`, which keeps the resulting session in cookies.
 */
function LoginDialog({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  const { t, tw } = useLocale();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoginState>("loading");
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` is not read in the body; bumping it is how a retry asks for a new challenge and a new Google button
  useEffect(() => {
    let cancelled = false;
    setState("loading");
    void (async () => {
      try {
        const config = await queryClient.fetchQuery(authConfigQuery());
        if (cancelled) return;
        if (!config.google_client_id) {
          setState("disabled");
          return;
        }
        const challenge = await accountCall("/api/auth/challenge", async value => {
          const { z } = await import("zod");
          return z.object({ challenge_id: z.string(), nonce: z.string() }).parse(value);
        }, { method: "POST" });
        const google = await loadGoogleId();
        if (cancelled || !buttonRef.current) return;
        google.initialize({
          client_id: config.google_client_id,
          nonce: challenge.nonce,
          ux_mode: "popup",
          auto_select: false,
          context: "signin",
          itp_support: true,
          callback: async ({ credential }) => {
            if (!credential) return;
            setState("signing-in");
            try {
              await accountCall("/api/auth/login", ignoreBody, { method: "POST", body: { challenge_id: challenge.challenge_id, credential } });
              onSignedIn();
              show(t("已登录"));
              onClose();
            } catch (error) {
              const code = error instanceof Error && "code" in error ? String(error.code) : "";
              setMessage(LOGIN_ERRORS[code] ?? "登录失败，请稍后再试。");
              // A challenge is single-use; the next attempt needs a new one.
              setAttempt(value => value + 1);
            }
          },
        });
        buttonRef.current.replaceChildren();
        google.renderButton(buttonRef.current, { type: "standard", theme: prefersDark() ? "filled_black" : "outline", size: "large", text: "signin_with", shape: "pill", logo_alignment: "left", width: 260, locale: tw ? "zh-TW" : "zh-CN" });
        setState("ready");
      } catch (error) {
        if (cancelled) return;
        const code = error instanceof Error && "code" in error ? String(error.code) : "";
        if (code === "provider_disabled") setState("disabled");
        else {
          setMessage(LOGIN_ERRORS[code] ?? "暂时无法连接登录服务，请检查网络后重试。");
          setState("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, queryClient, onSignedIn, onClose, show, t, tw]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="login-title"
      className="m-auto w-[min(calc(100vw-32px),380px)] rounded-card border-0 bg-panel p-0 text-ink shadow-card backdrop:bg-black/40"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="relative px-6 pt-6 pb-5">
        <button type="button" className="absolute top-3 right-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted hover:bg-panel-2 hover:text-ink" aria-label={t("关闭")} onClick={() => dialogRef.current?.close()}>
          <CloseIcon />
        </button>
        <h2 id="login-title" className="m-0 font-heading text-lg font-bold">{t("登录水杉输入法账号")}</h2>
        <p className="m-0 mt-2 text-[13.5px] leading-[1.75] text-muted">{t("使用 Google 账号登录，与 App 中的账号相同。登录后可以收藏、评分，并在「我的」中管理词库、快捷短语和云剪贴板。")}</p>
        <div className="mt-5 grid min-h-11 place-items-center">
          <div ref={buttonRef} className={cx(state !== "ready" && "hidden")} />
          {state === "loading" && <p className="m-0 text-sm text-muted" role="status">{t("正在准备登录…")}</p>}
          {state === "signing-in" && <p className="m-0 text-sm text-muted" role="status">{t("正在登录…")}</p>}
          {state === "disabled" && <p className="m-0 text-sm text-muted" role="status">{t("网页登录暂未开放，请在水杉输入法 App 中登录。")}</p>}
          {state === "failed" && (
            <Button variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>
              {t("重试")}
            </Button>
          )}
        </div>
        {message && state !== "disabled" && <p className="m-0 mt-3 text-center text-[13px] text-warn" role="alert">{t(message)}</p>}
        <p className="m-0 mt-5 text-center text-xs leading-[1.7] text-muted">
          {t("登录即表示你了解")}
          <LocaleLink to="/privacy/" onClick={() => dialogRef.current?.close()}>{t("隐私说明")}</LocaleLink>
        </p>
      </div>
    </dialog>
  );
}
