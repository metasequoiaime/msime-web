import type { ReactNode } from "react";
import { useLocale, type Messages } from "./i18n";
import { PageHero } from "./page-hero";
import { Rich } from "./rich";
import { Card, Container, PlatformIcon } from "./ui";

type SectionKey = keyof Messages["guide"]["sections"];
const SECTION_ORDER: readonly SectionKey[] = ["install", "typing", "mixed", "zkey", "hints", "lookup", "dictionary"];
const INSTALL_ORDER = ["macos", "linux", "android", "windows", "ios"] as const;

function Section({ id, title, children }: { id: SectionKey; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="m-0 font-heading text-[clamp(24px,2.6vw,30px)] leading-[1.35] font-bold text-ink">
        {title}
      </h2>
      <div className="mt-5 grid gap-4 text-[15.5px] leading-[1.95] text-body">{children}</div>
    </section>
  );
}

const Paragraph = ({ text }: { text: string }) => (
  <p className="m-0">
    <Rich text={text} />
  </p>
);

function List({ items, ordered = false }: { items: readonly string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={ordered ? "m-0 grid list-decimal gap-2 pl-6 marker:font-semibold marker:text-accent-ink" : "m-0 grid list-disc gap-2 pl-6 marker:text-accent"}>
      {items.map((item) => (
        <li key={item} className="pl-1">
          <Rich text={item} />
        </li>
      ))}
    </Tag>
  );
}

export function GuidePage() {
  const { messages } = useLocale();
  const guide = messages.guide;
  return (
    <main>
      <PageHero title={guide.title} lead={guide.lead} />
      <Container width="inner" className="grid items-start gap-[clamp(24px,4vw,48px)] 2xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={guide.toc} className="2xl:sticky 2xl:top-24">
          <p className="m-0 mb-2 text-xs font-semibold text-muted">{guide.toc}</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0 2xl:grid 2xl:gap-1">
            {SECTION_ORDER.map((key) => (
              <li key={key}>
                <a className="inline-flex rounded-tab px-3 py-1.5 text-sm font-medium text-body shadow-ring-2 hover:bg-panel-2 hover:text-ink 2xl:flex 2xl:shadow-none" href={`#${key}`}>
                  {guide.sections[key]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid min-w-0 gap-[clamp(48px,6vw,72px)]">
          <Section id="install" title={guide.sections.install}>
            <div className="grid gap-4">
              {INSTALL_ORDER.map((platform) => (
                <Card as="article" key={platform} id={`install-${platform}`} className="scroll-mt-24 rounded-tile p-[clamp(18px,2.6vw,28px)]">
                  <h3 className="m-0 flex items-center gap-2.5 text-lg font-semibold text-ink">
                    <PlatformIcon platform={platform} size={20} />
                    {messages.platforms[platform]}
                  </h3>
                  <div className="mt-3 grid gap-3">
                    <List items={guide.install[platform].steps} ordered />
                    <p className="m-0 text-sm leading-[1.85] text-muted">
                      <Rich text={guide.install[platform].note} />
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <Section id="typing" title={guide.sections.typing}>
            <Paragraph text={guide.typing.intro} />
            <List items={guide.typing.rules} />
            <Card className="overflow-x-auto rounded-tile p-0">
              <table className="w-full border-collapse text-left text-[15px]">
                <caption className="px-5 pt-4 text-left text-sm font-semibold text-muted">{guide.typing.examplesTitle}</caption>
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="px-5 py-2 font-semibold">{guide.typing.columns.keys}</th>
                    <th className="px-5 py-2 font-semibold">{guide.typing.columns.result}</th>
                    <th className="px-5 py-2 font-semibold">{guide.typing.columns.note}</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.typing.examples.map((row) => (
                    <tr key={row.keys} className="shadow-divider-t">
                      <td className="px-5 py-3 font-code font-semibold text-accent-ink">{row.keys}</td>
                      <td className="px-5 py-3 font-semibold text-ink">{row.result}</td>
                      <td className="px-5 py-3 text-muted">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </Section>

          <Section id="mixed" title={guide.sections.mixed}>
            <Paragraph text={guide.mixed.body} />
            <Paragraph text={guide.mixed.defaults} />
          </Section>

          <Section id="zkey" title={guide.sections.zkey}>
            <h3 className="m-0 text-lg font-semibold text-ink">{guide.zkey.lookupTitle}</h3>
            <Paragraph text={guide.zkey.lookup} />
            <h3 className="m-0 text-lg font-semibold text-ink">{guide.zkey.wildcardTitle}</h3>
            <Paragraph text={guide.zkey.wildcard} />
          </Section>

          <Section id="hints" title={guide.sections.hints}>
            <Paragraph text={guide.hints.body} />
          </Section>

          <Section id="lookup" title={guide.sections.lookup}>
            <Paragraph text={guide.lookup.body} />
            <List items={guide.lookup.where} />
          </Section>

          <Section id="dictionary" title={guide.sections.dictionary}>
            <Paragraph text={guide.dictionary.intro} />
            <pre className="code-block">
              <code>{guide.dictionary.sample}</code>
            </pre>
            <List items={guide.dictionary.platforms} />
            <Paragraph text={guide.dictionary.rime} />
          </Section>

          <p className="m-0 text-sm text-muted">
            <Rich text={guide.more} />
          </p>
        </div>
      </Container>
    </main>
  );
}
