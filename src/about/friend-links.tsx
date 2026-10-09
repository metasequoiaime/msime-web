import { Card, ExternalIcon } from "../ui";
import { useLocale } from "../use-locale";

/** 友链。图标放在 public/img/friends/ 自托管：CSP 的 img-src 不放行第三方图床。加一个项目就在这里加一项。 */
const FRIEND_LINKS = [
  {
    name: "Petra",
    tag: "AI 桌宠",
    url: "https://petra.xin/",
    host: "petra.xin",
    icon: "/img/friends/petra.png",
    desc: "跨 Windows、macOS、Linux 的开源 AI 桌宠：会漫游、会躲鼠标、视线追着光标跑，还能陪你聊天、帮你打开想用的软件。",
  },
] as const;

/** 关于页底部的友情链接：互相推荐的开源项目，整张卡片可点，新标签页打开。 */
export function FriendLinks({ eyebrowClass }: { eyebrowClass: string }) {
  const { t } = useLocale();

  return (
    <section className="mt-[clamp(64px,8vw,104px)]" aria-labelledby="about-friends" data-reveal>
      <p className={eyebrowClass}>{t("友情链接")}</p>
      <h2 id="about-friends" className="m-0 mt-3.5 font-heading text-[clamp(24px,2.8vw,32px)] leading-[1.4] font-bold text-ink">
        {t("其他好玩的项目")}
      </h2>
      <ul className="m-0 mt-6 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-4 p-0">
        {FRIEND_LINKS.map((friend) => (
          <Card as="li" key={friend.url} className="min-w-0 rounded-tile transition-shadow hover:shadow-card">
            <a href={friend.url} target="_blank" rel="noopener" className="group flex h-full gap-4 px-7 py-[26px] text-inherit no-underline sm:gap-5">
              <img src={friend.icon} alt="" width={64} height={64} loading="lazy" decoding="async" className="size-14 flex-none rounded-field sm:size-16" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h3 className="m-0 font-heading text-[19px] font-bold text-ink">{friend.name}</h3>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-ink">{t(friend.tag)}</span>
                </div>
                <p className="m-0 mt-2 text-[15px] leading-[1.9] text-body">{t(friend.desc)}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink group-hover:text-ink">
                  {friend.host}
                  <ExternalIcon size={13} className="flex-none" />
                </span>
              </div>
            </a>
          </Card>
        ))}
      </ul>
      <p className="m-0 mt-4 text-sm leading-[1.85] text-muted">{t("想互换友链？欢迎通过上面的社区渠道或邮件联系我们。")}</p>
    </section>
  );
}
