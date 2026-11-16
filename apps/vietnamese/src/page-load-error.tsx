import { useEffect } from "react";

import { recoverUpdatedPage } from "./module-recovery";
import { Button, Card, Container, buttonClass } from "./ui";

const TEXT = {
  vi: { label: "Lỗi tải trang", title: "Tạm thời chưa tải được trang", body: "Có thể trang vừa được cập nhật hoặc kết nối mạng bị gián đoạn. Hãy tải lại trang.", reload: "Tải lại", home: "Về trang chủ", homeHref: "/" },
  zh: { label: "加载失败", title: "页面暂时无法加载", body: "网站可能刚刚更新，或网络连接暂时中断。请重新加载页面。", reload: "重新加载", home: "返回首页", homeHref: "/zh/" },
};

/**
 * Shown when a route chunk or the app itself fails to load (usually a deploy replaced the hashed assets).
 *
 * It also renders from app.tsx outside the router when start-up fails, so it cannot use the router hooks behind `useLocale` or `LocaleLink`: the locale comes from the URL, and the home link is a plain full-page navigation, which is what a broken client needs anyway.
 */
export function PageLoadError({ error }: { error: unknown }) {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const text = path === "/zh" || path.startsWith("/zh/") ? TEXT.zh : TEXT.vi;
  useEffect(() => {
    void recoverUpdatedPage(error);
  }, [error]);

  return (
    <main className="w-full py-[clamp(48px,10vw,120px)]">
      <Container width="narrow">
        <Card as="section" tone="raised" className="rounded-panel p-[clamp(28px,5vw,48px)]" role="alert">
          <p className="m-0 text-sm font-semibold text-accent-ink">{text.label}</p>
          <h1 className="m-0 mt-3 font-heading text-[clamp(26px,3.6vw,36px)] leading-[1.3] font-bold text-ink">{text.title}</h1>
          <p className="m-0 mt-3 max-w-[56ch] text-base leading-[1.85] text-body">{text.body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>{text.reload}</Button>
            <a className={buttonClass({ variant: "secondary" })} href={text.homeHref}>
              {text.home}
            </a>
          </div>
        </Card>
      </Container>
    </main>
  );
}
