import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "../ui";
import { useLocale } from "../use-locale";
import { CATEGORY_NAMES, GALLERY_SEASON_NAMES, imageUrl, type GalleryItem } from "./data";

const control = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-panel-2 px-4 text-sm font-medium text-ink transition-colors hover:bg-accent-soft hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-40";

export function GalleryViewer({ items, initialIndex, onClose }: { items: readonly GalleryItem[]; initialIndex: number; onClose: () => void }) {
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const direction = useRef(1);
  const [index, setIndex] = useState(initialIndex);
  const item = items[index];
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element?.animate([{ opacity: 0, transform: "translateY(12px) scale(.98)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.7,.3,1)" });
    }
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const move = (offset: number) => {
    direction.current = offset;
    setIndex(value => (value + offset + items.length) % items.length);
  };
  return (
    <dialog ref={dialog} className="m-auto max-h-[94dvh] w-[min(94vw,960px)] max-w-none overflow-auto rounded-panel border-0 bg-panel p-0 text-ink shadow-card backdrop:bg-black/70" aria-label={t("水杉娘图片预览")} onCancel={onClose} onClose={onClose} onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }
    }}>
      <header className="flex items-center justify-between gap-4 px-5 py-3">
        <div aria-live="polite">
          <p className="m-0 font-heading text-base font-bold">{t(item.name)}</p>
          <p className="m-0 mt-1 text-xs text-muted">{t(GALLERY_SEASON_NAMES[item.season])} · {t(CATEGORY_NAMES[item.category])} <span className="ml-2 font-mono">{index + 1} / {items.length}</span></p>
        </div>
        <button type="button" className={control} onClick={onClose} aria-label={t("关闭预览")}><CloseIcon size={18} /></button>
      </header>
      <div className="flex justify-center overflow-hidden bg-white">
        <img key={item.path} src={imageUrl(item, 1536)} alt={t(`水杉娘 · ${item.name}`)} width={1536} height={1536} className="block aspect-square max-h-[66dvh] w-full object-contain" onLoad={event => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          event.currentTarget.animate([
            { opacity: 0, transform: `translateX(${direction.current * 20}px) scale(.99)` },
            { opacity: 1, transform: "none" },
          ], { duration: 260, easing: "cubic-bezier(.2,.7,.3,1)" });
        }} />
      </div>
      <footer className="flex items-center justify-between gap-3 px-5 py-3">
        <button type="button" className={control} disabled={items.length < 2} onClick={() => move(-1)}>{t("← 上一张")}</button>
        <span className="hidden text-xs text-muted sm:block">{t("← → 切换 · Esc 关闭")}</span>
        <button type="button" className={control} disabled={items.length < 2} onClick={() => move(1)}>{t("下一张 →")}</button>
      </footer>
    </dialog>
  );
}
