import type { ReactNode } from "react";
import { releases } from "./release-data";
import type { EditionDownload, EditionPlatform } from "./release";
import { formatDate, formatSize, WINDOWS_PREVIEW_RELEASES } from "./release-format";
import { Container } from "./ui/container";
import { AndroidIcon, AppleIcon, DownloadIcon, ExternalIcon, LinuxIcon, WindowsIcon } from "./ui/icons";
import { useLocale } from "./use-locale";

const ARCH_LABEL: Record<EditionDownload["arch"], string> = { x86_64: "x86_64", aarch64: "aarch64 (ARM64)", universal: "Universal", arm64: "arm64", x64: "x64" };

function DownloadRow({ download, label }: { download: EditionDownload; label: string }) {
  const { messages } = useLocale();
  const text = messages.download;
  return (
    <li className="rounded-group bg-panel-2 p-4" data-file={download.name}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-sm text-muted">
          {ARCH_LABEL[download.arch]} · .{download.format} · {formatSize(download.size)}
        </span>
      </div>
      <p className="m-0 mt-1 font-code text-[13px] break-all text-muted">{download.name}</p>
      {download.sha256 && (
        <p className="m-0 mt-1 font-code text-[12px] break-all text-muted">
          SHA-256 <span className="text-body">{download.sha256}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="inline-flex min-h-9 items-center gap-1.5 rounded-tab bg-btn px-3.5 text-sm font-semibold text-btn-fg no-underline hover:text-btn-fg hover:brightness-105" href={download.url}>
          <DownloadIcon size={16} />
          {text.github}
        </a>
        {download.mirrorUrl && (
          <a className="inline-flex min-h-9 items-center gap-1.5 rounded-tab px-3.5 text-sm font-semibold text-ink no-underline shadow-ring-2 hover:bg-hover hover:text-ink" href={download.mirrorUrl}>
            {text.mirror}
          </a>
        )}
      </div>
    </li>
  );
}

function PlatformCard({ id, icon, title, badge, release, note, missing, fallbackUrl, label }: {
  id: string;
  icon: ReactNode;
  title: string;
  badge?: string;
  release: EditionPlatform | null;
  note: ReactNode;
  missing: ReactNode;
  fallbackUrl: string;
  label: (download: EditionDownload) => string;
}) {
  const { messages } = useLocale();
  const text = messages.download;
  const downloads = release?.downloads ?? [];
  return (
    <section id={id} className="rounded-card bg-panel p-6 shadow-card" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-ink">{icon}</span>
        <h2 id={`${id}-title`} className="m-0 text-[22px] font-bold">
          {title}
        </h2>
        {badge && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">{badge}</span>}
      </div>
      <p className="m-0 mt-2 text-[15px] text-body">{note}</p>
      {release && downloads.length > 0 ? (
        <>
          <dl className="m-0 mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-muted">{text.version}</dt>
              <dd className="m-0 font-semibold text-ink">{release.version}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-muted">{text.published}</dt>
              <dd className="m-0 text-ink">{formatDate(release.publishedAt)}</dd>
            </div>
            <div>
              <a href={release.releaseUrl} className="inline-flex items-center gap-1">
                {text.releasePage}
                <ExternalIcon />
              </a>
            </div>
          </dl>
          <ul className="m-0 mt-4 grid list-none gap-3 p-0">
            {downloads.map(download => (
              <DownloadRow key={download.name} download={download} label={label(download)} />
            ))}
          </ul>
        </>
      ) : (
        <p className="m-0 mt-4 rounded-group bg-panel-2 p-4 text-[15px]">
          {missing}{" "}
          <a href={fallbackUrl} className="inline-flex items-center gap-1">
            {text.releasePage}
            <ExternalIcon />
          </a>
        </p>
      )}
    </section>
  );
}

export function DownloadPage() {
  const { messages } = useLocale();
  const text = messages.download;
  return (
    <main className="page-enter copy">
      <Container width="narrow" className="pt-[clamp(36px,6vw,72px)]">
        <h1 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.35] font-bold">{text.title}</h1>
        <p className="mt-3 mb-0 text-[17px] text-body">{text.lead}</p>
        <div className="mt-8 grid gap-5">
          <PlatformCard
            id="macos"
            icon={<AppleIcon />}
            title="macOS"
            release={releases.macos}
            note={
              <>
                {text.macos.note}
                <code className="mt-2 block w-fit max-w-full overflow-x-auto">brew install --cask metasequoiaime/tap/msime-tibetan</code>
              </>
            }
            missing={text.macos.missing}
            fallbackUrl={releases.macos.releaseUrl}
            label={() => "macOS"}
          />
          <PlatformCard id="linux" icon={<LinuxIcon />} title="Linux" release={releases.linux} note={text.linux.note} missing={text.linux.missing} fallbackUrl={releases.linux.releaseUrl} label={download => text.linux.formats[download.format as "deb" | "rpm" | "tar.gz"]} />
          <PlatformCard id="android" icon={<AndroidIcon />} title="Android" release={releases.android} note={text.android.note} missing={text.android.missing} fallbackUrl={releases.android.releaseUrl} label={() => "Android APK"} />
          <PlatformCard id="windows" icon={<WindowsIcon />} title="Windows" badge={text.windows.badge} release={releases.windowsPreview} note={text.windows.note} missing={text.windows.missing} fallbackUrl={WINDOWS_PREVIEW_RELEASES} label={() => text.windows.badge} />
          <section id="other" className="rounded-card p-6 shadow-ring">
            <h2 className="m-0 text-[20px] font-bold">{text.other.title}</h2>
            <p className="m-0 mt-2 text-body">{text.other.body}</p>
          </section>
          <section id="verify" className="rounded-card p-6 shadow-ring">
            <h2 className="m-0 text-[20px] font-bold">{text.verify.title}</h2>
            <p className="m-0 mt-2 text-body">{text.verify.body}</p>
          </section>
        </div>
      </Container>
    </main>
  );
}
