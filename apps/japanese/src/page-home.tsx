import { Rich } from "./i18n/rich";
import { usePageMeta } from "./page-meta";
import { AnchorButton, ArrowRightIcon, Badge, Card, Container, DownloadIcon, LinkButton, LogoMark, Pill, PlatformIcon, SectionHeading } from "./ui";
import { useLocale } from "./use-locale";

const SECTION_SPACING = "pt-[clamp(72px,9vw,112px)]";

/** The hero's right column: what the visitor types and the reading the edition shows before conversion, in the shape of a candidate window. */
function TypingDemo() {
  const { messages } = useLocale();
  const { home } = messages;
  return (
    <Card tone="raised" as="figure" className="m-0 w-full max-w-[460px] justify-self-center overflow-hidden rounded-panel p-0 lg:justify-self-end">
      <div className="flex items-center gap-2 px-5 py-3.5 shadow-divider-b">
        <LogoMark size={22} />
        <span className="text-[13px] font-semibold text-ink">{messages.common.productName}</span>
      </div>
      <dl className="m-0 grid gap-0 p-2">
        {home.demo.map((row) => (
          <div key={row.keys} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] items-center gap-3 rounded-field px-3.5 py-3 odd:bg-panel-2">
            <dt className="m-0 font-code text-[15px] text-body">{row.keys}</dt>
            <ArrowRightIcon size={16} className="text-muted" />
            <dd className="m-0 min-w-0">
              <span lang="ja" className="block text-[22px] leading-tight font-semibold text-ink">
                {row.result}
              </span>
              <span className="block text-xs text-muted">{row.note}</span>
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="px-5 pt-1 pb-4 text-xs text-muted">{home.demoCaption}</figcaption>
    </Card>
  );
}

export function HomePage() {
  const { messages } = useLocale();
  const { home, common } = messages;
  usePageMeta();

  return (
    <main className="w-full">
      <Container as="section" width="page" className="page-enter grid items-center gap-[clamp(36px,5vw,64px)] pt-[clamp(40px,7vw,96px)] lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Badge>{home.eyebrow}</Badge>
          <h1 className="m-0 mt-5 font-heading text-[clamp(40px,6vw,68px)] leading-[1.12] font-bold tracking-[.01em] text-ink">{home.title}</h1>
          <p className="m-0 mt-2 font-code text-[15px] text-muted">MSIME Japanese</p>
          <p className="m-0 mt-6 max-w-[38em] text-[17px] leading-[1.9] text-body">
            <Rich text={home.lead} />
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/download/">
              <DownloadIcon size={18} />
              {home.primaryAction}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {home.secondaryAction}
            </LinkButton>
          </div>
        </div>
        <TypingDemo />
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING} aria-labelledby="home-features">
        <SectionHeading id="home-features" title={home.featuresTitle} />
        <div className="mt-[clamp(28px,3.6vw,44px)] grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {home.features.map((feature) => (
            <Card key={feature.title} className="min-w-0 p-[clamp(22px,2.8vw,30px)]">
              <h3 className="m-0 text-[19px] leading-snug font-bold text-ink">{feature.title}</h3>
              <p className="m-0 mt-2.5 text-[15px] leading-[1.9] text-body">
                <Rich text={feature.body} />
              </p>
            </Card>
          ))}
          <Card tone="muted" className="min-w-0 p-[clamp(22px,2.8vw,30px)]">
            <h3 className="m-0 text-[19px] leading-snug font-bold text-ink">{home.limitsTitle}</h3>
            <ul className="m-0 mt-2.5 grid list-disc gap-2 pl-5 text-[15px] leading-[1.85] text-body marker:text-muted">
              {home.limits.map((item) => (
                <li key={item}>
                  <Rich text={item} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING} aria-labelledby="home-platforms">
        <SectionHeading id="home-platforms" title={home.platformsTitle} lead={home.platformsLead} />
        <ul className="m-0 mt-[clamp(28px,3.6vw,44px)] grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-5">
          {home.platforms.map((platform) => (
            <Card as="li" key={platform.id} className="flex min-w-0 flex-col p-6">
              <div className="flex items-center justify-between gap-3">
                <PlatformIcon platform={platform.id} size={26} />
                <Pill tone={platform.id === "windows" || platform.id === "ios" ? "neutral" : "accent"}>{platform.status}</Pill>
              </div>
              <h3 className="m-0 mt-4 text-lg font-bold text-ink">{platform.name}</h3>
              <p className="m-0 mt-2 text-sm leading-[1.8] text-body">
                <Rich text={platform.body} />
              </p>
            </Card>
          ))}
        </ul>
        <div className="mt-8">
          <LinkButton variant="soft" to="/download/">
            {common.download}
            <ArrowRightIcon size={16} />
          </LinkButton>
        </div>
      </Container>

      <Container as="section" width="page" className={SECTION_SPACING} aria-labelledby="home-full">
        <Card tone="accent" className="grid gap-6 rounded-hero p-[clamp(28px,4.4vw,56px)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h2 id="home-full" className="m-0 font-heading text-[clamp(24px,2.8vw,32px)] leading-[1.35] font-bold text-ink">
              {home.fullTitle}
            </h2>
            <p className="m-0 mt-3 max-w-[48em] text-base leading-[1.85] text-body">
              <Rich text={home.fullBody} />
            </p>
          </div>
          <AnchorButton href="https://msime.app/" size="lg" variant="secondary">
            {home.fullAction}
            <ArrowRightIcon size={16} />
          </AnchorButton>
        </Card>
      </Container>
    </main>
  );
}
