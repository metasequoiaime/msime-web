import type { ReactNode } from "react";
import { usePlatformsQuery } from "./data/queries";
import { editionDownloads, readableSize, type LinuxPackage } from "./download/editions";
import { Rich } from "./i18n/rich";
import type { Messages } from "./i18n/types";
import { usePageMeta } from "./page-meta";
import type { Download, Release } from "./platforms-data";
import { Card, CloudDownloadIcon, Container, ExternalIcon, GitHubIcon, Pill, PlatformIcon, cx } from "./ui";
import { useLocale } from "./use-locale";

type Text = Messages["download"];
type IconId = "macos" | "linux" | "android" | "windows" | "ios";

const ALL_RELEASES = "https://github.com/metasequoiaime/msime/releases";
const linkAction = "inline-flex min-h-9 items-center gap-1.5 rounded-tab px-3 text-sm font-semibold no-underline transition-colors";

function PlatformCard({ id, name, tag, tagTone = "accent", requirement, children }: { id: IconId; name: string; tag: string; tagTone?: "accent" | "neutral" | "warn"; requirement: string; children: ReactNode }) {
  return (
    <Card as="section" id={id} aria-labelledby={`${id}-title`} className="min-w-0 rounded-panel p-[clamp(20px,3vw,32px)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <PlatformIcon platform={id} size={28} />
        <h2 id={`${id}-title`} className="m-0 text-[clamp(22px,2.4vw,26px)] font-bold text-ink">
          {name}
        </h2>
        {" "}
        <Pill tone={tagTone}>{tag}</Pill>{" "}
        <span className="text-sm text-muted">{requirement}</span>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function ReleaseLine({ release, text }: { release: Release; text: Text }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
      <span>
        {text.version} <span className="font-code text-ink">v{release.version}</span>
      </span>{" "}
      <span>
        {text.released} <time dateTime={release.publishedAt}>{release.publishedAt.slice(0, 10)}</time>
      </span>{" "}
      <a className="inline-flex items-center gap-1 font-medium" href={release.releaseUrl} target="_blank" rel="noreferrer">
        {text.releasePage}
        <ExternalIcon size={13} />
      </a>
    </p>
  );
}

/** One installer: what it is, its size and SHA-256, and the two places to get it. */
function FileRow({ download, label, text }: { download: Download; label: string; text: Text }) {
  return (
    <li className="grid gap-2 rounded-group bg-panel-2 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-6">
      <div className="min-w-0">
        <p className="m-0 text-[15px] font-semibold text-ink">{label}</p>
        <p className="m-0 mt-0.5 font-code text-[13px] text-body [overflow-wrap:anywhere]">{download.name}</p>
        <p className="m-0 mt-1.5 text-[12.5px] text-muted">
          {text.size} {readableSize(download.size)}
          {download.sha256 && (
            <>
              {" · "}SHA-256 <code className="font-code break-all text-body">{download.sha256}</code>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <a className={cx(linkAction, "bg-btn text-btn-fg hover:text-btn-fg hover:brightness-[1.06]")} href={download.url} rel="noreferrer" aria-label={`${text.github}: ${download.name}`}>
          <GitHubIcon size={15} />
          {text.github}
        </a>
        {download.mirrorUrl && (
          <a className={cx(linkAction, "bg-panel text-ink shadow-ring-2 hover:text-accent-ink")} href={download.mirrorUrl} rel="noreferrer" aria-label={`${text.mirror}: ${download.name}`}>
            <CloudDownloadIcon size={16} />
            {text.mirror}
          </a>
        )}
      </div>
    </li>
  );
}

const linuxLabel = (item: LinuxPackage, text: Text) => `${text.linuxFormats[item.format]} · ${text.linuxDistros[item.format]} · ${item.arch}`;

export function DownloadPage() {
  const { messages } = useLocale();
  const text = messages.download;
  const platforms = usePlatformsQuery();
  usePageMeta();

  const editions = editionDownloads(platforms.data);
  const failed = platforms.isError;

  return (
    <main className="w-full">
      <Container className="page-enter pt-[clamp(32px,5vw,72px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,50px)] leading-[1.2] font-bold text-ink">{text.title}</h1>
        <p className="m-0 mt-4 max-w-[52em] text-[16.5px] leading-[1.85] text-body">
          <Rich text={text.lead} />
        </p>
        {failed && (
          <p role="alert" className="m-0 mt-6 rounded-group bg-warn-soft px-4 py-3 text-[15px] text-warn">
            <Rich text={text.unavailable} />
          </p>
        )}

        <div className="mt-[clamp(28px,4vw,44px)] grid gap-5">
          <PlatformCard id="macos" name="macOS" tag={text.standalone} requirement={text.requirements.macos}>
            {editions.macos.release && <ReleaseLine release={editions.macos.release} text={text} />}
            {editions.macos.files.length > 0 ? (
              <ul className="m-0 mt-4 grid list-none gap-2 p-0">
                {editions.macos.files.map((download) => (
                  <FileRow key={download.name} download={download} label={`.${download.name.split(".").pop()} · Universal`} text={text} />
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-group bg-panel-2 px-4 py-3.5 text-[15px] leading-[1.8] text-body">
                <p className="m-0">
                  <Rich text={text.macosPending} />
                </p>
                <a className="mt-2 inline-flex items-center gap-1.5 font-semibold" href={editions.macos.release?.releaseUrl ?? ALL_RELEASES} target="_blank" rel="noreferrer">
                  <GitHubIcon size={15} />
                  {editions.macos.release ? `macos-v${editions.macos.release.version}` : text.allReleases}
                </a>
              </div>
            )}
            <p className="m-0 mt-3 text-sm leading-[1.8] text-muted">
              <Rich text={text.macosHomebrew} />
            </p>
          </PlatformCard>

          <PlatformCard id="linux" name="Linux" tag={text.standalone} requirement={text.requirements.linux}>
            {editions.linux.release && <ReleaseLine release={editions.linux.release} text={text} />}
            {editions.linux.files.length > 0 ? (
              <ul className="m-0 mt-4 grid list-none gap-2 p-0">
                {editions.linux.files.map((item) => (
                  <FileRow key={item.download.name} download={item.download} label={linuxLabel(item, text)} text={text} />
                ))}
              </ul>
            ) : (
              <MissingFiles release={editions.linux.release} text={text} />
            )}
          </PlatformCard>

          <PlatformCard id="android" name="Android" tag={text.standalone} requirement={text.requirements.android}>
            {editions.android.release && <ReleaseLine release={editions.android.release} text={text} />}
            {editions.android.files.length > 0 ? (
              <ul className="m-0 mt-4 grid list-none gap-2 p-0">
                {editions.android.files.map((download) => (
                  <FileRow key={download.name} download={download} label={`${text.androidPackage} · arm64`} text={text} />
                ))}
              </ul>
            ) : (
              <MissingFiles release={editions.android.release} text={text} />
            )}
          </PlatformCard>

          <PlatformCard id="windows" name="Windows" tag={text.viaFull} tagTone="neutral" requirement={text.requirements.windows}>
            <p className="m-0 text-[15px] leading-[1.85] text-body">
              <Rich text={text.windowsFull} />
            </p>
            <div className="mt-5 rounded-tile p-[clamp(16px,2.2vw,22px)] shadow-ring-2">
              <div className="flex flex-wrap items-center gap-3">
                <Pill tone="warn">{text.unsignedPreview}</Pill>
                {editions.windows.release && <ReleaseLine release={editions.windows.release} text={text} />}
              </div>
              <p className="m-0 mt-3 text-sm leading-[1.8] text-muted">
                <Rich text={text.unsignedNote} />
              </p>
              {editions.windows.files.length > 0 ? (
                <ul className="m-0 mt-4 grid list-none gap-2 p-0">
                  {editions.windows.files.map((download) => (
                    <FileRow key={download.name} download={download} label={`${text.unsignedPreview} · x64`} text={text} />
                  ))}
                </ul>
              ) : (
                <p className="m-0 mt-3 text-sm leading-[1.8] text-body">
                  <Rich text={text.windowsNoEdition} />
                </p>
              )}
            </div>
          </PlatformCard>

          <PlatformCard id="ios" name="iPhone / iPad" tag={text.viaFull} tagTone="neutral" requirement={text.requirements.ios}>
            <p className="m-0 text-[15px] leading-[1.85] text-body">
              <Rich text={text.iosFull} />
            </p>
          </PlatformCard>
        </div>

        <section aria-labelledby="verify" className="mt-[clamp(40px,5vw,64px)]">
          <h2 id="verify" className="m-0 text-[clamp(22px,2.4vw,26px)] font-bold text-ink">
            {text.verifyTitle}
          </h2>
          <p className="m-0 mt-3 max-w-[52em] text-[15px] leading-[1.85] text-body">
            <Rich text={text.verifyBody} />
          </p>
          <pre className="m-0 mt-4 overflow-x-auto rounded-group bg-panel-2 px-4 py-3.5 font-code text-[13.5px] leading-[1.8] text-ink shadow-hair">
            {text.verifyCommands.join("\n")}
          </pre>
        </section>
      </Container>
    </main>
  );
}

/** A platform whose release lists none of this edition's files: point at the release itself rather than show an empty list. */
function MissingFiles({ release, text }: { release: Release | null; text: Text }) {
  return (
    <p className="m-0 mt-4 rounded-group bg-panel-2 px-4 py-3.5 text-[15px] leading-[1.8] text-body">
      <a className="inline-flex items-center gap-1.5 font-semibold" href={release?.releaseUrl ?? ALL_RELEASES} target="_blank" rel="noreferrer">
        <GitHubIcon size={15} />
        {release ? `${text.releasePage} (v${release.version})` : text.allReleases}
      </a>
    </p>
  );
}
