import type { ReactNode } from "react";
import { MSIME_ORIGIN } from "../shared/site-seo";
import { editionDownloads } from "./data/edition";
import { usePlatformsQuery } from "./data/queries";
import { usePageMeta } from "./page-meta";
import { Rich } from "./rich";
import { LETTERS, TELEX_WORDS, TONE_STYLES, TONES, VNI_WORDS, type Example } from "./typing";
import { AnchorButton, Card, Container, PlatformIcon, type PlatformId } from "./ui";
import { useLocale } from "./use-locale";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/bUzPvyqt";

const INSTALL_SECTIONS: readonly PlatformId[] = ["macos", "linux", "android", "ios", "windows"];

function Code({ children }: { children: string }) {
  return (
    <pre className="m-0 mt-3 overflow-x-auto rounded-field bg-panel-2 px-4 py-3 font-code text-[13.5px] leading-[1.7] text-ink">
      <code>{children}</code>
    </pre>
  );
}

function Section({ id, title, icon, children }: { id: string; title: string; icon?: PlatformId; children: ReactNode }) {
  return (
    <Card as="section" id={id} className="rounded-panel p-[clamp(20px,3vw,32px)]" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="m-0 flex items-center gap-2.5 font-heading text-[clamp(20px,2.2vw,26px)] leading-[1.3] font-bold text-ink">
        {icon && <PlatformIcon platform={icon} size={24} />}
        {title}
      </h3>
      {children}
    </Card>
  );
}

const paragraph = "m-0 mt-3 text-[15.5px] leading-[1.85] text-body";

/** Numbered steps; `after` puts a code block (or anything else) under the step with that index. */
function Steps({ steps, after = {} }: { steps: readonly string[]; after?: Record<number, ReactNode> }) {
  return (
    <ol className="m-0 mt-4 grid gap-3 pl-6 text-[15.5px] leading-[1.85] text-body marker:font-semibold marker:text-accent-ink">
      {steps.map((step, index) => (
        <li key={step} className="pl-1">
          <Rich text={step} />
          {after[index]}
        </li>
      ))}
    </ol>
  );
}

const cell = "border-b border-hair px-3 py-2.5 text-left align-top";

function Table({ head, rows }: { head: readonly string[]; rows: readonly (readonly ReactNode[])[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[15px] text-body">
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className={`${cell} text-[13px] font-semibold text-muted`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed tables that never reorder.
            <tr key={index}>
              {row.map((value, column) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns.
                <td key={column} className={cell}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Keys = ({ children }: { children: string }) => <kbd className="rounded-[6px] bg-panel-2 px-1.5 py-0.5 font-code text-[14px] text-ink shadow-hair">{children}</kbd>;
const Word = ({ children }: { children: string }) => (
  <span lang="vi" className="font-semibold text-ink">
    {children}
  </span>
);
const exampleCell = ([keys, word]: Example) => (
  <span className="inline-flex flex-wrap items-center gap-1.5">
    <Keys>{keys}</Keys>→<Word>{word}</Word>
  </span>
);

function MethodTables({ method }: { method: "telex" | "vni" }) {
  const { messages } = useLocale();
  const text = messages.guide;
  const columns = text.columns;
  return (
    <>
      <h4 className="m-0 mt-6 text-base font-bold text-ink">{text.tonesTitle}</h4>
      <Table head={[columns.mark, columns.key, columns.typed]} rows={TONES.map((tone) => [<span key="mark"><Word>{tone.mark}</Word> · {text.tones[tone.id]}</span>, <Keys key="key">{tone[method]}</Keys>, exampleCell(method === "telex" ? tone.telexExample : tone.vniExample)])} />
      <h4 className="m-0 mt-6 text-base font-bold text-ink">{text.lettersTitle}</h4>
      <Table head={[columns.letter, columns.key, columns.typed]} rows={LETTERS.map((letter) => [<Word key="letter">{letter.letter}</Word>, <Keys key="key">{letter[method]}</Keys>, exampleCell(method === "telex" ? letter.telexExample : letter.vniExample)])} />
      {method === "telex" && (
        <p className={paragraph}>
          <Rich text={text.wOnItsOwn} />
        </p>
      )}
      <h4 className="m-0 mt-6 text-base font-bold text-ink">{text.wordsTitle}</h4>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-2.5 p-0 text-[15px] text-body">
        {(method === "telex" ? TELEX_WORDS : VNI_WORDS).map((example) => (
          <li key={example[0]}>{exampleCell(example)}</li>
        ))}
      </ul>
    </>
  );
}

export function GuidePage() {
  const { messages } = useLocale();
  const text = messages.guide;
  const platforms = usePlatformsQuery();
  usePageMeta();
  const linux = editionDownloads(platforms.data).linux.release;
  const version = linux?.version ?? "<version>";
  const toc: { id: string; label: string }[] = [
    ...INSTALL_SECTIONS.map((id) => ({ id, label: text[id].title })),
    { id: "telex", label: text.telex.title },
    { id: "vni", label: text.vni.title },
    { id: "tone-style", label: text.toneStyle.title },
    { id: "keys", label: text.keys.title },
    { id: "settings", label: text.settings.title },
  ];

  return (
    <main className="w-full">
      <Container className="page-enter pt-[clamp(32px,5vw,64px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,50px)] leading-[1.2] font-bold text-ink">{text.title}</h1>
        <p className="m-0 mt-4 max-w-[72ch] text-[16.5px] leading-[1.85] text-body">{text.lead}</p>

        <nav aria-label={text.tocLabel} className="mt-8">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {toc.map((item) => (
              <li key={item.id}>
                <a className="inline-flex h-9 items-center rounded-full bg-panel px-3.5 text-sm font-medium text-ink no-underline shadow-hair hover:text-accent-ink" href={`#${item.id}`}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <h2 className="m-0 mt-12 font-heading text-[clamp(26px,3vw,36px)] font-bold text-ink">{text.installTitle}</h2>
        <div className="mt-6 grid gap-6">
          <Section id="macos" title={text.macos.title} icon="macos">
            <Steps steps={text.macos.steps} />
            <p className={paragraph}>{text.macos.homebrew}</p>
            <Code>brew install --cask metasequoiaime/tap/msime-vietnamese</Code>
            <p className={paragraph}>{text.macos.macos27}</p>
            <p className={paragraph}>
              <Rich text={text.macos.uninstall} />
            </p>
          </Section>

          <Section id="linux" title={text.linux.title} icon="linux">
            <p className={paragraph}>{text.linux.intro}</p>
            <Steps
              steps={text.linux.steps}
              after={{
                1: <Code>{`sudo apt install ./msime-linux-vietnamese_${version}_amd64.deb\nsudo dnf install ./msime-linux-vietnamese-${version}-1.x86_64.rpm`}</Code>,
                2: <Code>msime-linux-vietnamese-setup --download</Code>,
              }}
            />
            <p className={paragraph}>
              <Rich text={text.linux.uninstall} />
            </p>
          </Section>

          <Section id="android" title={text.android.title} icon="android">
            <Steps steps={text.android.steps} />
            <p className={paragraph}>{text.android.note}</p>
          </Section>

          <Section id="ios" title={text.ios.title} icon="ios">
            <p className={paragraph}>{text.ios.intro}</p>
            <Steps steps={text.ios.steps} />
            <AnchorButton className="mt-5" variant="secondary" href={TESTFLIGHT_URL}>
              {text.ios.cta}
            </AnchorButton>
          </Section>

          <Section id="windows" title={text.windows.title} icon="windows">
            <p className={paragraph}>{text.windows.body}</p>
          </Section>
        </div>

        <h2 className="m-0 mt-14 font-heading text-[clamp(26px,3vw,36px)] font-bold text-ink">{text.typingTitle}</h2>
        <div className="mt-6 grid gap-6">
          <Section id="telex" title={text.telex.title}>
            <p className={paragraph}>
              <Rich text={text.telex.intro} />
            </p>
            <MethodTables method="telex" />
          </Section>

          <Section id="vni" title={text.vni.title}>
            <p className={paragraph}>
              <Rich text={text.vni.intro} />
            </p>
            <MethodTables method="vni" />
          </Section>

          <Section id="tone-style" title={text.toneStyle.title}>
            <p className={paragraph}>{text.toneStyle.intro}</p>
            <Table head={[text.columns.typed, text.columns.modern, text.columns.classic]} rows={TONE_STYLES.map(([keys, modern, classic]) => [<Keys key="keys">{keys}</Keys>, <Word key="modern">{modern}</Word>, <Word key="classic">{classic}</Word>])} />
          </Section>

          <Section id="keys" title={text.keys.title}>
            <dl className="m-0 mt-4 grid gap-4">
              {text.keys.items.map((item) => (
                <div key={item.key} className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-[15px] font-semibold text-ink">{item.key}</dt>
                  <dd className="m-0 text-[15.5px] leading-[1.85] text-body">
                    <Rich text={item.body} />
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="settings" title={text.settings.title}>
            <p className={paragraph}>{text.settings.desktop}</p>
            <p className={paragraph}>{text.settings.mobile}</p>
          </Section>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 text-[15px] text-body">
          <span>{text.more}</span>
          <AnchorButton size="sm" variant="ghost" href={`${MSIME_ORIGIN}/docs/`}>
            {text.moreCta}
          </AnchorButton>
        </div>
      </Container>
    </main>
  );
}
