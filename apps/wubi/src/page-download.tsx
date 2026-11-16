import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useLocale, type Messages } from "./i18n";
import { PageHero } from "./page-hero";
import { EDITION_RELEASES_KEY, fetchEditionReleases, formatSize, type EditionFile, type EditionRelease } from "./release-data";
import { Rich } from "./rich";
import { AnchorButton, Card, Container, CopyIcon, DownloadIcon, ExternalIcon, PlatformIcon, Pill, copyText, useToast } from "./ui";

const FULL_DOWNLOAD = "https://msime.app/download/";

const date = (value: string) => value.slice(0, 10);

function PlatformCard({ platform, requirement, children, id }: { platform: keyof Messages["platforms"]; requirement: string; children: ReactNode; id: string }) {
  const { messages } = useLocale();
  return (
    <Card as="section" id={id} aria-labelledby={`${id}-title`} className="download-card rounded-panel p-[clamp(20px,3vw,32px)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 id={`${id}-title`} className="m-0 flex items-center gap-2.5 text-[22px] font-bold text-ink">
          <PlatformIcon platform={platform} size={24} />
          {messages.platforms[platform]}
        </h2>
        <span className="text-sm text-muted">{requirement}</span>
      </div>
      <div className="mt-5 grid gap-4">{children}</div>
    </Card>
  );
}

function ReleaseLine({ release }: { release: EditionRelease }) {
  const { messages } = useLocale();
  const text = messages.download;
  return (
    <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
      <span>
        {text.version} <span className="font-semibold text-ink">{release.version}</span>
      </span>
      <span>
        {text.published} {date(release.publishedAt)}
      </span>
      <a className="inline-flex items-center gap-1 font-medium" href={release.releaseUrl} target="_blank" rel="noreferrer">
        {text.releasePage}
        <ExternalIcon size={14} />
      </a>
    </p>
  );
}

function FileRow({ file }: { file: EditionFile }) {
  const { messages } = useLocale();
  const text = messages.download;
  const { show } = useToast();
  return (
    <li className="download-file grid gap-3 rounded-field bg-panel-2 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-semibold text-ink">
          {text.formats[file.format]} · {text.arch[file.arch]}
        </span>
        <span className="text-sm text-muted">
          {text.size} {formatSize(file.size)}
        </span>
      </div>
      <code className="download-file-name block font-code text-[13px] break-all text-body">{file.name}</code>
      {file.sha256 && (
        <div className="flex min-w-0 items-start gap-2">
          <span className="flex-none pt-px text-xs font-semibold text-muted">{text.sha256}</span>
          <code className="min-w-0 flex-1 font-code text-xs break-all text-muted">{file.sha256}</code>
          <button
            type="button"
            className="flex-none rounded-row p-1 text-muted transition-colors hover:bg-hover hover:text-ink"
            title={text.copy}
            aria-label={`${text.copy}: ${file.name}`}
            onClick={async () => {
              if (await copyText(file.sha256 ?? "")) show(text.copied);
            }}
          >
            <CopyIcon size={15} />
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <AnchorButton size="sm" href={file.url} target="_self">
          <DownloadIcon size={15} />
          {text.github}
        </AnchorButton>
        {file.mirrorUrl && (
          <AnchorButton size="sm" variant="secondary" href={file.mirrorUrl} target="_self">
            {text.mirror}
          </AnchorButton>
        )}
      </div>
    </li>
  );
}

function Files({ release, missing }: { release: EditionRelease; missing: string }) {
  return (
    <>
      <ReleaseLine release={release} />
      {release.files.length ? (
        <ul className="m-0 grid list-none gap-3 p-0 xl:grid-cols-2">
          {release.files.map((file) => (
            <FileRow key={file.name} file={file} />
          ))}
        </ul>
      ) : (
        <p className="m-0 rounded-field bg-panel-2 p-4 text-[15px] leading-[1.8] text-body">
          <Rich text={missing} />
        </p>
      )}
    </>
  );
}

const note = (text: string) => (
  <p className="m-0 text-[15px] leading-[1.85] text-body">
    <Rich text={text} />
  </p>
);

export function DownloadPage() {
  const { messages } = useLocale();
  const text = messages.download;
  const { data, isError } = useQuery({ queryKey: [EDITION_RELEASES_KEY], queryFn: fetchEditionReleases, staleTime: Number.POSITIVE_INFINITY });

  return (
    <main>
      <PageHero title={text.title} lead={text.lead} />
      <Container width="inner" className="download-panel grid gap-5">
        {!data ? (
          <Card className="rounded-panel p-6 text-[15px] leading-[1.8] text-body">{isError ? <Rich text={text.failed} /> : text.loading}</Card>
        ) : (
          <>
            <PlatformCard platform="macos" id="macos" requirement={text.macos.requirement}>
              <Files release={data.macos} missing={text.macos.missing} />
              {note(text.macos.brew)}
              {note(text.macos.next)}
            </PlatformCard>

            <PlatformCard platform="linux" id="linux" requirement={text.linux.requirement}>
              <Files release={data.linux} missing={text.linux.missing} />
              {note(text.linux.note)}
            </PlatformCard>

            <PlatformCard platform="android" id="android" requirement={text.android.requirement}>
              <Files release={data.android} missing={text.android.missing} />
              {note(text.android.note)}
            </PlatformCard>

            <PlatformCard platform="windows" id="windows" requirement={text.windows.requirement}>
              <div className="grid gap-3 rounded-field shadow-ring p-4">
                <h3 className="m-0 text-base font-semibold text-ink">{text.windows.stableTitle}</h3>
                {note(text.windows.stableBody)}
                <div>
                  <AnchorButton size="sm" variant="secondary" href={FULL_DOWNLOAD}>
                    {text.windows.stableAction}
                    <ExternalIcon size={14} />
                  </AnchorButton>
                </div>
              </div>
              {data.windowsPreview && (
                <div className="grid gap-3 rounded-field shadow-ring p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-base font-semibold text-ink">{text.windows.previewTitle}</h3>
                    <Pill tone="warn">{text.windows.previewPill}</Pill>
                  </div>
                  {note(text.windows.previewBody)}
                  <Files release={data.windowsPreview} missing={text.windows.previewMissing.replace("{version}", data.windowsPreview.version)} />
                </div>
              )}
            </PlatformCard>

            <PlatformCard platform="ios" id="ios" requirement={text.ios.requirement}>
              {note(text.ios.body)}
              <div>
                <AnchorButton size="sm" variant="secondary" href={FULL_DOWNLOAD}>
                  {text.ios.action}
                  <ExternalIcon size={14} />
                </AnchorButton>
              </div>
            </PlatformCard>

            <p className="m-0 text-xs text-muted">
              {text.manifestTime} {date(data.generatedAt)}
            </p>
          </>
        )}
      </Container>
    </main>
  );
}
