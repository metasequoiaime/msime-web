import { HOME_DEMO } from "./i18n/examples";
import { AnchorButton, LinkButton } from "./ui/button";
import { Container } from "./ui/container";
import { AndroidIcon, AppleIcon, ArrowRightIcon, DownloadIcon, LinuxIcon, WindowsIcon } from "./ui/icons";
import { Grove } from "./ui/tree";
import { useLocale } from "./use-locale";

const PLATFORM_ICONS = [<AppleIcon key="macos" />, <LinuxIcon key="linux" />, <AndroidIcon key="android" />, <WindowsIcon key="windows" />, null];

/** Far row faint, near row solid, as in the official home hero. */
const GROVE = {
  far: [[18, 70, 0.5], [120, 52, 0.62], [236, 76, 0.48]],
  near: [[64, 22, 0.82], [182, 38, 0.74]],
} as const;

function TypingDemo() {
  const { messages } = useLocale();
  const syllables = HOME_DEMO.keys.split(" ");
  return (
    <figure className="m-0 rounded-card bg-panel p-6 shadow-card">
      <figcaption className="mb-4 text-sm font-semibold text-muted">{messages.home.demoTitle}</figcaption>
      <p className="m-0 text-xs font-semibold text-muted">{messages.home.demoKeys}</p>
      <p className="mt-1 mb-5 flex flex-wrap items-center gap-1.5 font-code text-[17px] text-ink">
        {syllables.map((syllable, index) => (
          <span key={syllable} className="flex items-center gap-1.5">
            <span className="rounded-row bg-panel-2 px-2 py-0.5">{syllable}</span>
            {index < syllables.length - 1 && <kbd className="rounded-row px-1.5 py-0.5 text-xs text-muted shadow-ring-2">Space</kbd>}
          </span>
        ))}
      </p>
      <p className="m-0 text-xs font-semibold text-muted">{messages.home.demoResult}</p>
      <p className="tibetan-sample m-0 mt-1 text-[28px]" lang="bo">
        {HOME_DEMO.result}
      </p>
    </figure>
  );
}

export function HomePage() {
  const { messages } = useLocale();
  const home = messages.home;
  return (
    <main className="page-enter copy">
      <Container width="page" className="grid items-center gap-10 pt-[clamp(40px,7vw,96px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold tracking-wide text-accent-ink">{home.eyebrow}</p>
          <h1 className="mt-3 mb-4 text-[clamp(30px,4.6vw,52px)] leading-[1.35] font-bold">{home.title}</h1>
          <p className="m-0 max-w-[40rem] text-[17px] leading-[1.9] text-body">{home.lead}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton size="lg" to="/download/">
              <DownloadIcon />
              {home.download}
            </LinkButton>
            <LinkButton size="lg" variant="secondary" to="/guide/">
              {home.guide}
              <ArrowRightIcon />
            </LinkButton>
          </div>
        </div>
        <div className="relative min-w-0">
          <svg className="pointer-events-none absolute -top-10 right-2 hidden h-40 w-72 lg:block" viewBox="0 0 300 200" aria-hidden="true">
            <Grove trees={GROVE.far} opacity={0.18} />
            <Grove trees={GROVE.near} opacity={0.32} />
          </svg>
          <div className="relative">
            <TypingDemo />
          </div>
        </div>
      </Container>

      <Container width="page" as="section" className="mt-20">
        <h2 className="m-0 mb-6 text-[clamp(22px,2.6vw,30px)] font-bold">{home.featuresTitle}</h2>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
          {home.features.map(feature => (
            <li key={feature.title} className="rounded-tile bg-panel p-5 shadow-card">
              <h3 className="m-0 mb-2 text-[17px] font-semibold">{feature.title}</h3>
              <p className="m-0 text-[15.5px] text-body">{feature.body}</p>
            </li>
          ))}
        </ul>
      </Container>

      <Container width="page" as="section" className="mt-16">
        <h2 className="m-0 mb-6 text-[clamp(22px,2.6vw,30px)] font-bold">{home.platformsTitle}</h2>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-5">
          {home.platforms.map((platform, index) => (
            <li key={platform.name} className={`flex items-start gap-3 rounded-tile p-4 shadow-ring ${platform.available ? "bg-panel" : "bg-transparent text-muted"}`}>
              <span className={platform.available ? "text-ink" : "text-muted"}>{PLATFORM_ICONS[index]}</span>
              <span className="min-w-0">
                <span className={`block font-semibold ${platform.available ? "text-ink" : "text-muted"}`}>{platform.name}</span>
                <span className="block text-sm text-muted">{platform.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>

      <Container width="page" as="section" className="mt-16">
        <div className="flex flex-col gap-5 rounded-card bg-panel-2 p-7 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 className="m-0 mb-2 text-[22px] font-bold">{home.fullTitle}</h2>
            <p className="m-0 max-w-[44rem] text-body">{home.fullBody}</p>
          </div>
          <AnchorButton variant="secondary" href="https://msime.app/" target="_self" className="flex-none">
            {home.fullLink}
            <ArrowRightIcon />
          </AnchorButton>
        </div>
      </Container>
    </main>
  );
}
