import { Card, ExternalIcon } from "../ui";
import { useLocale } from "../use-locale";

/** 友链。图标放在 public/img/friends/ 自托管：CSP 的 img-src 不放行第三方图床。加一个项目就在这里加一项。 */
const FRIEND_LINKS = [
  {
    name: "TempX",
    tag: "临时邮箱",
    url: "https://tempx.yldm.ai/",
    host: "tempx.yldm.ai",
    icon: "/img/friends/tempx.svg",
    desc: "提供免注册的临时邮箱，以及在线收短信和邮箱别名功能，适合临时注册和保护日常邮箱隐私。",
  },
  {
    name: "指尖冒险 TapTapGo",
    tag: "打字练习",
    url: "https://taptapgo.yldm.ai/",
    host: "taptapgo.yldm.ai",
    icon: "/img/friends/taptapgo.svg",
    desc: "从基准键开始闯关学盲打，提供指法练习、打字测速和打字游戏，支持英语、拼音、日语和编程等多种练习语言。",
  },
  {
    name: "EveryAPI",
    tag: "AI 模型网关",
    url: "https://everyapi.ai/",
    host: "everyapi.ai",
    icon: "/img/friends/everyapi.svg",
    desc: "一个 API Key 接入多家供应商的 AI 模型，按用量计费，余额长期有效。",
  },
  {
    name: "Petra",
    tag: "AI 桌宠",
    url: "https://petra.xin/",
    host: "petra.xin",
    icon: "/img/friends/petra.png",
    desc: "跨 Windows、macOS、Linux 的开源 AI 桌宠：会漫游、会躲鼠标、视线追着光标跑，还能陪你聊天、帮你打开想用的软件。",
  },
  {
    name: "sugi.moe",
    tag: "图床",
    url: "https://sugi.moe/",
    host: "sugi.moe",
    icon: "/img/friends/sugi.svg",
    desc: "免注册的匿名免费图床：拖进图片或短视频就拿到直链，可以永久保存，也可以设成 1 小时到 3 天后自动删除。",
  },
  {
    name: "Awesome MyGo",
    tag: "Go 桌面 GUI",
    url: "https://awesomemygo.dev/",
    host: "awesomemygo.dev",
    icon: "/img/friends/awesome-mygo.png",
    desc: "Go 语言跨平台桌面 GUI 框架 MyGo 的作品集：收录用它做的应用、UI 组件、插件和文档，原生 UI 或 WebView 前端都能写 macOS、Windows、Linux 应用。",
  },
  {
    name: "鼠输入法 NanoMouse",
    tag: "iOS 输入法",
    url: "https://apps.apple.com/cn/app/%E9%BC%A0%E8%BE%93%E5%85%A5%E6%B3%95-nanomouse/id6757662900",
    host: "apps.apple.com",
    icon: "/img/friends/nanomouse.webp",
    desc: "基于 Rime 的 iOS 输入法，支持多种输入方案、AI 语音输入，以及通过 iCloud 跨设备同步常用短语和剪贴板内容。",
  },
] as const;

/** 关于页底部的友情链接：互相推荐的项目，整张卡片可点，新标签页打开。 */
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
