import { useEffect } from "react";
import { localeOf, localePath } from "../shared/locales";
import { MESSAGES } from "./i18n";
import { recoverUpdatedPage } from "./module-recovery";
import { Button, Card, Container, buttonClass } from "./ui";

/**
 * Shown when a route chunk or the app itself fails to load (usually a deploy replaced the hashed assets).
 *
 * It also renders from app.tsx outside the router when start-up fails, so it reads the locale from the URL instead of the router, and the home link is a plain full-page navigation, which is what a broken client needs anyway.
 */
export function PageLoadError({ error }: { error: unknown }) {
  const locale = localeOf(typeof window === "undefined" ? "/" : window.location.pathname);
  const text = MESSAGES[locale].loadError;
  useEffect(() => {
    void recoverUpdatedPage(error);
  }, [error]);

  return (
    <main className="w-full py-[clamp(48px,10vw,120px)]">
      <Container width="narrow">
        <Card as="section" tone="raised" className="rounded-panel p-[clamp(28px,5vw,48px)]" role="alert">
          <p className="m-0 text-sm font-semibold text-accent-ink">{text.eyebrow}</p>
          <h1 className="m-0 mt-3 font-heading text-[clamp(26px,3.6vw,36px)] leading-[1.3] font-bold text-ink">{text.title}</h1>
          <p className="m-0 mt-3 max-w-[56ch] text-base leading-[1.85] text-body">{text.body}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>{text.reload}</Button>
            <a className={buttonClass({ variant: "secondary" })} href={localePath("/", locale)}>
              {text.home}
            </a>
          </div>
        </Card>
      </Container>
    </main>
  );
}
