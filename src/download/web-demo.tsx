import { useEffect, useState } from "react";
import { ExternalIcon } from "../ui";
import { useLocale } from "../use-locale";

/** The online demo of @msime/web-engine, deployed from the msime repository's packages/web-engine/demo to GitHub Pages under the custom domain wasm.msime.app (metasequoiaime.github.io/msime/ redirects there, and a redirected frame would fail frame-src and the height message's origin check). `?embed` shows only its playground. */
export const WEB_DEMO_URL = "https://wasm.msime.app/";
const DEMO_ORIGIN = new URL(WEB_DEMO_URL).origin;

/** Before the embedded page reports its height: tall enough for the playground on a desktop, so the frame rarely jumps. */
const INITIAL_HEIGHT = 760;
/** Heights outside this range are not from a sane report and are ignored. */
const MIN_HEIGHT = 320;
const MAX_HEIGHT = 2400;

/**
 * 下载页选中 Web 时，在选择卡和接入指南之间嵌入在线演示：引擎在 iframe 里的演示页中运行，本站的 CSP 只需在 frame-src 放行演示页的源，不用为 wasm 放开 script-src。iframe 懒加载，访客没有滚到这里就不下载引擎和词库。演示页加载时不抢焦点，并用 postMessage 报告内容高度，这里据此调整 iframe 的高度，免得出现第二条滚动条。
 */
export function WebDemo() {
  const { t } = useLocale();
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== DEMO_ORIGIN) return;
      const data = event.data as { type?: unknown; height?: unknown } | null;
      if (data?.type !== "msime-demo:height" || typeof data.height !== "number") return;
      if (data.height < MIN_HEIGHT || data.height > MAX_HEIGHT) return;
      setHeight(Math.ceil(data.height));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <section aria-labelledby="web-demo-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="web-demo-title" className="m-0 font-heading text-2xl leading-[1.4] font-bold text-ink">
          {t("在线试用")}
        </h2>
        <a className="inline-flex items-center gap-1 text-sm text-accent-ink hover:text-ink" href={WEB_DEMO_URL} target="_blank" rel="noreferrer">
          {t("打开完整演示")}
          <ExternalIcon size={13} />
        </a>
      </div>
      <p className="m-0 mt-2 max-w-[68ch] text-[15px] leading-[1.85] text-body">
        {t("下面就是嵌入了 @msime/web-engine 的页面：引擎在你的浏览器里运行，不用切换系统输入法，直接打字。右侧可以换皮肤、布局和方案，完整演示里还能看到对应的接入代码。")}
      </p>
      <iframe
        className="mt-5 block w-full rounded-panel border-0 bg-transparent"
        style={{ height }}
        src={`${WEB_DEMO_URL}?embed`}
        title={t("水杉输入法网页版在线试用")}
        loading="lazy"
        allow="clipboard-write"
      />
    </section>
  );
}
