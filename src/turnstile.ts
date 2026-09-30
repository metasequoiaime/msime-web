// Shared by the forms that submit through a Turnstile-protected Pages Function.
export type Turnstile = {
  render: (element: HTMLElement, options: { sitekey: string; action: string; size: "compact"; language: "zh-TW" | "zh-CN"; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }
let turnstileLoader: Promise<Turnstile> | undefined;
export function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!turnstileLoader) {
    turnstileLoader = new Promise<Turnstile>((resolve, reject) => {
      const script = document.createElement("script");
      const timer = window.setTimeout(() => fail(), 15_000);
      const fail = () => { clearTimeout(timer); script.remove(); turnstileLoader = undefined; reject(new Error("验证组件加载失败，请刷新页面重试。")); };
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        if (window.turnstile) resolve(window.turnstile); else fail();
      };
      script.onerror = fail;
      document.head.appendChild(script);
    });
  }
  return turnstileLoader;
}
