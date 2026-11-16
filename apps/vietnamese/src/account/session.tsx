import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { accountCall, authConfigQuery, hasSessionHint, ignoreBody, meQuery, SESSION_HINT_KEY, setSessionHint, SIGNED_OUT_EVENT, webLoginAvailable } from "../data/account";
import type { Me } from "../data/schemas";
import { useToast } from "../ui";
import { useSearchReady } from "../use-page-search";
import { useLocale } from "../use-locale";
import { LoginDialog } from "./login-dialog";

/*
 * Who is signed in, for the header and every page that reacts to it. The session itself is a pair of HttpOnly cookies the page cannot read (shared/site-session.ts); this only asks `/api/me` and remembers, through a localStorage hint, whether there is any point asking.
 */

export type SessionStatus = "unknown" | "signed-out" | "signed-in";

type AccountContextValue = {
  /** `unknown` while the static HTML hydrates and while `/api/me` is answering for a browser that has signed in before. */
  status: SessionStatus;
  me: Me | null;
  /** Whether this site offers web sign-in (`/api/auth/config` has email or a Google client). Read only for signed-out visitors; `undefined` while it is unknown, including for everyone else. When `false` the page offers no 登录 and points to the App instead. */
  loginAvailable: boolean | undefined;
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

  // `/api/me` said the session is gone (a 401 other than `session_retry`, which `meQuery` reports as an error instead of `null`): the cookies expired or were cleared elsewhere, so stop asking on every page.
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
  // Only a signed-out visitor needs to know, so the signed-in pay nothing for it; the answer is cached for the page's life, and the sign-in dialog reads the same entry.
  const authConfig = useQuery({ ...authConfigQuery(), enabled: status === "signed-out" });
  const loginAvailable = webLoginAvailable(authConfig.data, authConfig.isError);
  const value = useMemo<AccountContextValue>(() => ({ status, me: me.data ?? null, loginAvailable, openLogin, signOut }), [status, me.data, loginAvailable, openLogin, signOut]);

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
