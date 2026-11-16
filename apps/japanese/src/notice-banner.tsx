import { lazy, Suspense, useEffect, useState } from "react";
import { useNoticesQuery } from "./data/queries";
import { readDismissed, rememberDismissed, visibleNotices } from "./notices";
import { recognizePlatform, type Platform } from "./platform";
import { CloseIcon, cx } from "./ui";
import { useLocale } from "./use-locale";

const NoticeBody = lazy(() => import("./notice-body").then(module => ({ default: module.NoticeBody })));

const BODY_CLASS = cx(
  "mt-1 text-sm leading-[1.8] text-body [overflow-wrap:anywhere]",
  "[&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_:is(p,ul,ol,blockquote)]:my-1.5 [&_:is(ul,ol)]:pl-5",
  "[&_a]:text-accent-ink [&_a]:underline [&_a:hover]:text-ink"
);

/**
 * Notices published to the website channel in the admin console, shown under the header on every page. Client-only: the prerendered HTML has no notice and hydration starts with none, so nothing changes for the static pages and their tests. Nothing renders while loading, on an error or when every notice is dismissed.
 */
export function NoticeBanner({ inert }: { inert?: boolean }) {
  const { t } = useLocale();
  const items = useNoticesQuery().data?.items;
  // Read after mount, never during render, so the hydrating render matches the static HTML.
  const [client, setClient] = useState<{ platform: Platform | null; dismissed: Set<string> } | null>(null);

  useEffect(() => {
    setClient({ platform: recognizePlatform(), dismissed: readDismissed(window.localStorage) });
  }, []);

  if (!items || !client) return null;
  const notices = visibleNotices(items, client.platform, client.dismissed);
  if (notices.length === 0) return null;

  const dismiss = (id: string) => {
    setClient({ ...client, dismissed: rememberDismissed(window.localStorage, id, items.map(item => item.id)) });
  };

  return (
    <aside className="mx-auto mt-3 grid max-w-[calc(1240px+2*clamp(16px,3.6vw,40px))] gap-2 px-[clamp(16px,3.6vw,40px)]" aria-label={t("公告")} inert={inert}>
      {notices.map(notice => (
        <section key={notice.id} className="flex items-start gap-3 rounded-group bg-panel px-4 py-3 shadow-ring-2" aria-labelledby={`notice-${notice.id}`}>
          <div className="min-w-0 flex-1">
            {/* Not a heading: the banner sits above each page's h1 and must not start the outline. */}
            <p id={`notice-${notice.id}`} className="m-0 text-[15px] leading-snug font-semibold text-ink">
              {t(notice.title)}
            </p>
            {notice.body.trim() && (
              <Suspense fallback={null}>
                <NoticeBody source={t(notice.body)} className={BODY_CLASS} />
              </Suspense>
            )}
          </div>
          <button
            type="button"
            className="inline-flex size-8 flex-none items-center justify-center rounded-full text-muted transition-colors hover:bg-panel-2 hover:text-ink"
            aria-label={t(`关闭公告：${notice.title}`)}
            title={t("关闭")}
            onClick={() => dismiss(notice.id)}
          >
            <CloseIcon />
          </button>
        </section>
      ))}
    </aside>
  );
}
