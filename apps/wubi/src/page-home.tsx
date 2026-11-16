import { useLocale } from "./i18n";
import { Rich } from "./rich";
import { AnchorButton, ArrowRightIcon, Badge, Card, Container, DownloadIcon, Grove, LinkButton, PlatformIcon, Pill, SectionHeading, type PlatformIconId } from "./ui";

const HERO_GROVE = {
  far: [[18, 70, 0.5], [118, 58, 0.56], [228, 76, 0.48]],
  near: [[62, 16, 0.84], [176, 28, 0.76]],
} as const;

const PLATFORM_ORDER = ["macos", "linux", "android", "windows", "ios"] as const satisfies readonly PlatformIconId[];
const STANDALONE = new Set<PlatformIconId>(["macos", "linux", "android"]);

function CodeSample() {
  const { messages } = useLocale();
  const sample = messages.home.sample;
  return (
    <Card tone="raised" className="relative overflow-hidden rounded-panel p-[clamp(20px,3vw,28px)]">
      <svg className="pointer-events-none absolute -right-6 -bottom-2 w-[260px] opacity-60" viewBox="0 0 300 200" aria-hidden="true">
        <Grove trees={HERO_GROVE.far} opacity={0.14} />
        <Grove trees={HERO_GROVE.near} opacity={0.22} />
      </svg>
      <h2 className="relative m-0 text-sm font-semibold text-muted">{sample.title}</h2>
      <dl className="relative m-0 mt-4 grid gap-2.5">
        {sample.rows.map((row) => (
          <div key={row.keys} className="flex min-w-0 items-center gap-3 rounded-field bg-panel-2 px-4 py-3">
            <dt className="w-[5.5rem] flex-none font-code text-[17px] font-semibold tracking-[.06em] text-accent-ink">{row.keys}</dt>
            <dd className="m-0 flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <span className="truncate text-[19px] font-semibold text-ink">{row.result}</span>
              <span className="flex-none text-xs text-muted">{row.note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function HomePage() {
  const { messages } = useLocale();
  const home = messages.home;
  return (
    <main>
      <Container width="page" className="page-enter grid items-center gap-[clamp(32px,5vw,72px)] pt-[clamp(40px,7vw,96px)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <Badge>{home.badge}</Badge>
          <h1 className="mt-5 mb-0 font-heading text-[clamp(44px,7vw,80px)] leading-[1.1] font-bold tracking-[.02em] text-ink">{home.title}</h1>
          <p className="m-0 mt-5 max-w-[60ch] text-[clamp(16px,1.6vw,18.5px)] leading-[1.85] text-body">{home.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/download/">
              <DownloadIcon size={18} />
              {home.download}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {home.guide}
            </LinkButton>
          </div>
          <p className="m-0 mt-5 text-sm leading-[1.8] text-muted">
            <Rich text={home.fullNote} />
          </p>
        </div>
        <CodeSample />
      </Container>

      <Container width="page" as="section" className="mt-[clamp(72px,10vw,128px)]">
        <SectionHeading title={home.featuresTitle} lead={home.featuresLead} />
        <ul className="m-0 mt-9 grid list-none gap-4 p-0 lg:grid-cols-2 2xl:grid-cols-4">
          {home.features.map((feature) => (
            <Card as="li" key={feature.title} className="rounded-tile p-6">
              <h3 className="m-0 text-[17px] font-semibold text-ink">{feature.title}</h3>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.85] text-body">
                <Rich text={feature.body} />
              </p>
            </Card>
          ))}
        </ul>
      </Container>

      <Container width="page" as="section" className="mt-[clamp(72px,10vw,128px)]">
        <SectionHeading title={home.platformsTitle} lead={home.platformsLead} />
        <ul className="m-0 mt-9 grid list-none gap-4 p-0 lg:grid-cols-2 xl:grid-cols-3">
          {PLATFORM_ORDER.map((platform) => (
            <Card as="li" key={platform} className="flex flex-col rounded-tile p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-[17px] font-semibold text-ink">
                  <PlatformIcon platform={platform} size={22} />
                  {messages.platforms[platform]}
                </span>
                <Pill tone={STANDALONE.has(platform) ? "accent" : "neutral"}>{STANDALONE.has(platform) ? home.standalone : home.viaFull}</Pill>
              </div>
              <p className="m-0 mt-3 text-[15px] leading-[1.85] text-body">
                <Rich text={home.platformCards[platform]} />
              </p>
            </Card>
          ))}
        </ul>
      </Container>

      <Container width="page" as="section" className="mt-[clamp(72px,10vw,128px)]">
        <Card tone="accent" className="flex flex-wrap items-center justify-between gap-6 rounded-hero p-[clamp(28px,5vw,56px)]">
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="m-0 font-heading text-[clamp(26px,3vw,36px)] leading-[1.3] font-bold text-ink">{home.ctaTitle}</h2>
            <p className="m-0 mt-3 text-base leading-[1.8] text-body">{home.ctaBody}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton size="lg" to="/download/">
              {home.ctaDownload}
              <ArrowRightIcon size={18} />
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {home.ctaGuide}
            </LinkButton>
            <AnchorButton size="lg" variant="ghost" href="https://msime.app/">
              msime.app
            </AnchorButton>
          </div>
        </Card>
      </Container>
    </main>
  );
}
