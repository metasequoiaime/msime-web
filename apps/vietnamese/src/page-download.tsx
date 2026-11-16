import type { ReactNode } from "react";
import { MSIME_ORIGIN } from "../shared/site-seo";
import { editionDownloads, formatDate, formatSize, type EditionFile, type EditionPlatform } from "./data/edition";
import { usePlatformsQuery } from "./data/queries";
import { usePageMeta } from "./page-meta";
import { Rich } from "./rich";
import { AnchorButton, Card, CloudDownloadIcon, Container, CopyIcon, copyText, GitHubIcon, LinkButton, Pill, PlatformIcon, useToast, type PlatformId } from "./ui";
import { useLocale } from "./use-locale";

const IOS_DOWNLOAD = `${MSIME_ORIGIN}/download/?platform=ios`;
const WINDOWS_DOWNLOAD = `${MSIME_ORIGIN}/download/?platform=windows`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="m-0 mt-3 overflow-x-auto rounded-field bg-panel-2 px-4 py-3 font-code text-[13.5px] leading-[1.7] text-ink">
      <code>{children}</code>
    </pre>
  );
}

function FileRow({ file }: { file: EditionFile }) {
  const { messages, lang } = useLocale();
  const text = messages.download;
  const { show } = useToast();
  return (
    <li className="grid gap-3 rounded-tile bg-panel-2 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center" data-file={file.name}>
      <div className="min-w-0">
        <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-ink">
          {text.formats[file.format]}
          <Pill tone="neutral">{text.cpus[file.cpu]}</Pill>
        </p>
        <p className="m-0 mt-1.5 font-code text-[13px] break-all text-body">{file.name}</p>
        <dl className="m-0 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          <div className="flex gap-1.5">
            <dt>{text.size}</dt>
            <dd className="m-0">{formatSize(file.size, lang)}</dd>
          </div>
          {file.sha256 && (
            <div className="flex min-w-0 items-center gap-1.5">
              <dt>{text.sha256}</dt>
              <dd className="m-0 min-w-0 font-code break-all" title={file.sha256}>
                {file.sha256}
              </dd>
              <button
                type="button"
                className="inline-flex flex-none items-center gap-1 rounded-tab px-1.5 py-0.5 text-accent-ink hover:bg-panel hover:text-ink"
                aria-label={`${text.copy} SHA-256 ${file.name}`}
                onClick={async () => {
                  if (file.sha256 && (await copyText(file.sha256))) show(text.copied);
                }}
              >
                <CopyIcon size={14} />
                {text.copy}
              </button>
            </div>
          )}
        </dl>
      </div>
      <div className="flex flex-wrap gap-2">
        <AnchorButton size="sm" href={file.url} target="_self" aria-label={`${text.github}: ${file.name}`}>
          <GitHubIcon size={16} />
          {text.github}
        </AnchorButton>
        {file.mirrorUrl && (
          <AnchorButton size="sm" variant="secondary" href={file.mirrorUrl} target="_self" aria-label={`${text.mirror}: ${file.name}`}>
            <CloudDownloadIcon size={16} />
            {text.mirror}
          </AnchorButton>
        )}
      </div>
    </li>
  );
}

function PlatformSection({ id, name, badge, children }: { id: PlatformId; name: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card as="section" id={id} className="rounded-panel p-[clamp(20px,3vw,32px)]" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center gap-3">
        <PlatformIcon platform={id} size={26} />
        <h2 id={`${id}-title`} className="m-0 font-heading text-[clamp(22px,2.4vw,28px)] leading-[1.3] font-bold text-ink">
          {name}
        </h2>
        {badge}
      </div>
      {children}
    </Card>
  );
}

/** Version, date and the release page of one platform, then its files; without files, the fallback text and the release page. */
function Release({ platform, fallback }: { platform: EditionPlatform; fallback?: ReactNode }) {
  const { messages, lang } = useLocale();
  const text = messages.download;
  const release = platform.release;
  if (!release)
    return (
      <div className="mt-4">
        <p className="m-0 text-[15px] leading-[1.8] text-body">{fallback ?? text.unavailable}</p>
        <AnchorButton className="mt-4" variant="secondary" href={platform.fallbackUrl}>
          <GitHubIcon size={16} />
          {text.allFiles}
        </AnchorButton>
      </div>
    );
  return (
    <>
      <p className="m-0 mt-2 text-sm text-muted">
        {text.version(release.version, formatDate(release.publishedAt, lang))} ·{" "}
        <a href={release.releaseUrl} target="_blank" rel="noreferrer">
          {text.allFiles}
        </a>
      </p>
      <ul className="m-0 mt-4 grid list-none gap-3 p-0">
        {release.files.map((file) => (
          <FileRow key={file.name} file={file} />
        ))}
      </ul>
    </>
  );
}

export function DownloadPage() {
  const { messages } = useLocale();
  const text = messages.download;
  const platforms = usePlatformsQuery();
  usePageMeta();
  const downloads = editionDownloads(platforms.data);
  const note = (value: string) => <p className="m-0 mt-4 text-sm leading-[1.8] text-muted"><Rich text={value} /></p>;

  return (
    <main className="w-full">
      <Container className="page-enter pt-[clamp(32px,5vw,64px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,50px)] leading-[1.2] font-bold text-ink">{text.title}</h1>
        <p className="m-0 mt-4 max-w-[72ch] text-[16.5px] leading-[1.85] text-body">{text.lead}</p>

        <div className="mt-10 grid gap-6">
          <PlatformSection id="macos" name="macOS">
            <Release platform={downloads.macos} fallback={<Rich text={text.macos.fallback} />} />
            {note(text.macos.note)}
            <p className="m-0 mt-4 text-sm text-body">{text.macos.homebrew}</p>
            <CodeBlock>brew install --cask metasequoiaime/tap/msime-vietnamese</CodeBlock>
            {note(text.macos.verify)}
          </PlatformSection>

          <PlatformSection id="linux" name="Linux">
            <Release platform={downloads.linux} />
            {note(text.linux.note)}
            {note(text.linux.verify)}
          </PlatformSection>

          <PlatformSection id="android" name="Android">
            <Release platform={downloads.android} />
            {note(text.android.note)}
          </PlatformSection>

          <PlatformSection id="ios" name="iOS · iPadOS" badge={<Pill tone="neutral">{messages.home.viaFull}</Pill>}>
            <p className="m-0 mt-4 text-[15px] leading-[1.8] text-body">{text.ios.body}</p>
            <AnchorButton className="mt-4" variant="secondary" href={IOS_DOWNLOAD}>
              {text.ios.cta}
            </AnchorButton>
          </PlatformSection>

          <PlatformSection id="windows" name="Windows" badge={<Pill tone="warn">{messages.home.preview}</Pill>}>
            <p className="m-0 mt-4 text-[15px] leading-[1.8] text-body">{text.windows.unsigned}</p>
            {downloads.windows.release ? (
              <Release platform={downloads.windows} />
            ) : (
              <>
                <p className="m-0 mt-3 text-[15px] leading-[1.8] text-body">{text.windows.missing}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <AnchorButton variant="secondary" href={WINDOWS_DOWNLOAD}>
                    {text.windows.fullCta}
                  </AnchorButton>
                  <AnchorButton variant="ghost" href={downloads.windows.fallbackUrl}>
                    <GitHubIcon size={16} />
                    {text.allFiles}
                  </AnchorButton>
                </div>
              </>
            )}
          </PlatformSection>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 text-[15px] text-body">
          <span>{text.harmonyNote}</span>
          <AnchorButton size="sm" variant="ghost" href={`${MSIME_ORIGIN}/download/`}>
            {text.otherCta}
          </AnchorButton>
          <LinkButton size="sm" variant="soft" to="/guide/">
            {messages.shell.nav.guide}
          </LinkButton>
        </div>
      </Container>
    </main>
  );
}
