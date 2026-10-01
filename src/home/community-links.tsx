import type { ReactNode } from "react";
import { useLocale } from "../use-locale";
import { CopyIcon, ExternalIcon, QQIcon, TelegramIcon, copyText, cx, useToast } from "../ui";

const TELEGRAM_URL = "https://t.me/msimegroup";
const QQ_GROUP = "829919142";

const pillClass =
  "group inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border-0 bg-accent-soft px-3.5 text-[13.5px] font-medium text-ink no-underline transition-colors hover:bg-accent-ring focus-visible:bg-accent-ring";

/** Content revealed on hover or keyboard focus, sliding open by animating its grid track from 0fr to 1fr. Touch screens have no hover, so they show it from the start. */
function Reveal({ children }: { children: ReactNode }) {
  return (
    <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-200 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none [@media(hover:none)]:grid-cols-[1fr]">
      <span className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">{children}</span>
    </span>
  );
}

/** 首屏顶部的加群入口：QQ 群悬停展开群号，点击整颗胶囊复制；Telegram 悬停露出 ↗，点击跳转加群链接。 */
export function CommunityLinks({ className }: { className?: string }) {
  const { t } = useLocale();
  const { show } = useToast();

  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        className={pillClass}
        title={t("点击复制群号")}
        aria-label={t(`QQ 群 ${QQ_GROUP}`)}
        onClick={async () => {
          show(t((await copyText(QQ_GROUP)) ? `已复制 QQ 群号 ${QQ_GROUP}` : `QQ 群号：${QQ_GROUP}`));
        }}
      >
        <QQIcon size={15} className="flex-none" />
        {t("QQ 群")}
        <Reveal>
          <span className="font-mono tracking-[.02em]">{QQ_GROUP}</span>
          <CopyIcon size={14} className="flex-none" />
        </Reveal>
      </button>
      <a className={pillClass} href={TELEGRAM_URL} target="_blank" rel="noreferrer">
        <TelegramIcon size={15} className="flex-none" />
        Telegram
        <Reveal>
          <ExternalIcon size={13} className="flex-none" />
        </Reveal>
      </a>
    </div>
  );
}
