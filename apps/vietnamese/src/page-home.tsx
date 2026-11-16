import { MSIME_ORIGIN } from "../shared/site-seo";
import { usePageMeta } from "./page-meta";
import { Rich } from "./rich";
import { HERO_DEMO } from "./typing";
import { AnchorButton, ArrowRightIcon, Badge, Card, Container, DownloadIcon, LinkButton, Pill, PlatformIcon, SectionHeading, type PlatformId } from "./ui";
import { useLocale } from "./use-locale";

const PLATFORMS: readonly { id: PlatformId; name: string; kind: "separate" | "viaFull" | "preview" }[] = [
  { id: "macos", name: "macOS", kind: "separate" },
  { id: "linux", name: "Linux", kind: "separate" },
  { id: "android", name: "Android", kind: "separate" },
  { id: "ios", name: "iOS · iPadOS", kind: "viaFull" },
  { id: "windows", name: "Windows", kind: "preview" },
];

/** Keystrokes and the word they make, as in the hero card. */
function DemoRow({ method, words }: (typeof HERO_DEMO)[number]) {
  const { messages } = useLocale();
  return (
    <div className="grid gap-3 rounded-tile bg-panel-2 p-4 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
      <p className="m-0 text-sm font-semibold text-accent-ink">{method}</p>
      <div className="grid gap-2">
        <p className="m-0 flex flex-wrap items-center gap-1.5">
          <span className="sr-only">{messages.home.demoTyped}: </span>
          {words.map(([keys]) => (
            <kbd key={keys} className="rounded-[8px] bg-panel px-2 py-1 font-code text-[15px] text-ink shadow-hair">
              {keys}
            </kbd>
          ))}
        </p>
        <p className="m-0 flex items-center gap-2 text-[clamp(24px,3vw,30px)] leading-tight font-bold text-ink" lang="vi">
          <ArrowRightIcon className="flex-none text-muted" />
          <span className="sr-only">{messages.home.demoResult}: </span>
          {words.map(([, word]) => word).join(" ")}
        </p>
      </div>
    </div>
  );
}

export function HomePage() {
  const { messages } = useLocale();
  const text = messages.home;
  usePageMeta();

  return (
    <main className="w-full">
      <Container width="page" className="page-enter grid items-center gap-[clamp(32px,5vw,64px)] pt-[clamp(32px,6vw,88px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Badge>{text.badge}</Badge>
          <p className="m-0 mt-6 text-base font-semibold text-accent-ink" lang="zh-CN">
            水杉越南语 · MSIME Vietnamese
          </p>
          <h1 className="m-0 mt-2 font-heading text-[clamp(36px,5.2vw,60px)] leading-[1.15] font-bold text-ink [text-wrap:balance]">{text.title}</h1>
          <p className="m-0 mt-5 max-w-[60ch] text-[17px] leading-[1.85] text-body">{text.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/download/">
              <DownloadIcon size={18} />
              {text.download}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {text.guide}
            </LinkButton>
          </div>
          <a className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-medium" href={`${MSIME_ORIGIN}/`} target="_blank" rel="noreferrer">
            {text.fullApp}
            <ArrowRightIcon size={16} />
          </a>
        </div>

        <Card as="section" tone="raised" className="grid gap-3 rounded-panel p-[clamp(16px,2.4vw,24px)]" aria-label={text.demoLabel}>
          {HERO_DEMO.map((demo) => (
            <DemoRow key={demo.method} {...demo} />
          ))}
        </Card>
      </Container>

      <Container width="page" as="section" className="mt-[clamp(64px,9vw,120px)]">
        <SectionHeading title={text.featuresTitle} />
        <ul className="m-0 mt-8 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {text.features.map((feature) => (
            <Card as="li" key={feature.title} className="p-6">
              <h3 className="m-0 text-lg font-bold text-ink">{feature.title}</h3>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.8] text-body">
                <Rich text={feature.body} />
              </p>
            </Card>
          ))}
        </ul>
      </Container>

      <Container width="page" as="section" className="mt-[clamp(64px,9vw,120px)]">
        <SectionHeading title={text.platformsTitle} lead={text.platformsLead} />
        <ul className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-5">
          {PLATFORMS.map((platform) => (
            <Card as="li" key={platform.id} className="flex flex-col p-5">
              <div className="flex items-center gap-2.5">
                <PlatformIcon platform={platform.id} size={24} />
                <h3 className="m-0 text-base font-bold text-ink">{platform.name}</h3>
              </div>
              <Pill className="mt-3 self-start" tone={platform.kind === "separate" ? "accent" : platform.kind === "preview" ? "warn" : "neutral"}>
                {text[platform.kind]}
              </Pill>
              <p className="m-0 mt-3 text-sm leading-[1.75] text-body">{text.platforms[platform.id]}</p>
            </Card>
          ))}
        </ul>
        <div className="mt-6">
          <LinkButton variant="soft" to="/download/">
            {messages.shell.nav.download}
            <ArrowRightIcon size={16} />
          </LinkButton>
        </div>
      </Container>

      <Container width="page" as="section" className="mt-[clamp(64px,9vw,120px)]">
        <Card tone="accent" className="flex flex-wrap items-center justify-between gap-6 rounded-panel p-[clamp(24px,4vw,40px)]">
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="m-0 font-heading text-[clamp(22px,2.6vw,30px)] leading-[1.3] font-bold text-ink">{text.fullTitle}</h2>
            <p className="m-0 mt-2.5 max-w-[68ch] text-[15.5px] leading-[1.8] text-body">{text.fullBody}</p>
          </div>
          <AnchorButton href={`${MSIME_ORIGIN}/`}>{text.fullCta}</AnchorButton>
        </Card>
      </Container>
    </main>
  );
}
