import { useLocale } from "./use-locale";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

export type Screenshot = { id: string; url: string; file: File };

// The viewer keeps a fixed dark surface in every theme and season so screenshots are judged against a neutral backdrop.
const viewerButton = "min-h-11 flex-none cursor-pointer rounded-row border border-solid border-[#555560] bg-[#2c2c35] px-3 py-2.5 font-sans text-sm text-white hover:bg-[#383843] disabled:cursor-default disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#aebfff]";

export function ScreenshotViewer({ images, selected, onClose }: { images: Screenshot[]; selected: string | null; onClose: () => void }) {
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [original, setOriginal] = useState(false);
  useEffect(() => {
    if (!selected) return;
    setIndex(Math.max(0, images.findIndex(image => image.id === selected)));
    setOriginal(false);
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [selected, images]);
  const current = images[index];
  const move = (offset: number) => { setIndex(value => (value + offset + images.length) % images.length); setOriginal(false); };
  return <dialog ref={dialog} className="m-auto h-[94dvh] max-h-[94dvh] w-[96vw] max-w-[1500px] overflow-hidden rounded-[14px] border border-solid border-[#454550] bg-[#18181e] p-0 text-white backdrop:bg-black/80 open:flex open:flex-col max-sm:h-dvh max-sm:max-h-dvh max-sm:w-screen max-sm:max-w-none max-sm:rounded-none" aria-label={t("截图预览")} onCancel={onClose} onClose={onClose} onKeyDown={event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
  }}>
    {current && <>
      <header className="flex flex-none items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm font-semibold">{current.file.name}</strong>
          <span className="text-xs text-[#bcbcc8]">{index + 1} / {images.length}</span>
        </div>
        <button type="button" className={viewerButton} onClick={onClose} aria-label={t("关闭截图预览")}>{t("关闭 ✕")}</button>
      </header>
      <div className={cx("min-h-0 flex-1 overflow-auto p-3", original ? "block" : "grid place-items-center")} key={`${current.id}-${original}`}>
        <img className={cx("block object-contain", original ? "m-auto max-w-none" : "max-h-full min-h-0 max-w-full")} src={current.url} alt={current.file.name} />
      </div>
      <footer className="flex flex-none items-center justify-between gap-3 px-4 py-3 max-sm:gap-1.5 max-sm:p-2.5">
        <button type="button" className={viewerButton} disabled={images.length < 2} onClick={() => move(-1)}>{t("← 上一张")}</button>
        <button type="button" className={viewerButton} aria-pressed={original} onClick={() => setOriginal(value => !value)}>{t(original ? "适应窗口" : "原始尺寸")}</button>
        <button type="button" className={viewerButton} disabled={images.length < 2} onClick={() => move(1)}>{t("下一张 →")}</button>
      </footer>
    </>}
  </dialog>;
}
