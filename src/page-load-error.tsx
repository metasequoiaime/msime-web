import { useEffect } from "react";

import { recoverUpdatedPage } from "./module-recovery";
import { Button, Card, Container, buttonClass } from "./ui";

/**
 * Shown when a route chunk or the app itself fails to load (usually a deploy replaced the hashed assets).
 *
 * It also renders from app.tsx outside the router when start-up fails, so it cannot use the router hooks behind `useLocale().t` or `LocaleLink`: the locale comes from the URL and both scripts are written out, and the home link is a plain full-page navigation, which is what a broken client needs anyway.
 */
export function PageLoadError({ error }: { error: unknown }) {
  const tw = typeof window !== "undefined" && window.location.pathname.startsWith("/zh-TW/");
  useEffect(() => {
    void recoverUpdatedPage(error);
  }, [error]);

  return (
    <main className="w-full py-[clamp(48px,10vw,120px)]">
      <Container width="narrow">
        <Card as="section" tone="raised" className="rounded-panel p-[clamp(28px,5vw,48px)]" role="alert">
          <p className="m-0 text-sm font-semibold text-accent-ink">{tw ? "載入失敗" : "加载失败"}</p>
          <h1 className="m-0 mt-3 font-heading text-[clamp(26px,3.6vw,36px)] leading-[1.3] font-bold text-ink">
            {tw ? "頁面暫時無法載入" : "页面暂时无法加载"}
          </h1>
          <p className="m-0 mt-3 max-w-[56ch] text-base leading-[1.85] text-body">
            {tw ? "網站可能剛剛更新，或網路連線暫時中斷。請重新載入頁面。" : "网站可能刚刚更新，或网络连接暂时中断。请重新加载页面。"}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>{tw ? "重新載入" : "重新加载"}</Button>
            <a className={buttonClass({ variant: "secondary" })} href={tw ? "/zh-TW/" : "/"}>
              {tw ? "返回首頁" : "返回首页"}
            </a>
          </div>
        </Card>
      </Container>
    </main>
  );
}
