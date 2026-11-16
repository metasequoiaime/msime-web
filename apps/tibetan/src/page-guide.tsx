import { EWTS_EXAMPLES } from "./i18n/examples";
import { releases } from "./release-data";
import { Container } from "./ui/container";
import { useLocale } from "./use-locale";

/** The x86_64 packages of the current release, so the install commands name real files. Falls back to the documented pattern when the release has none. */
function guideFiles() {
  const linux = releases.linux.downloads;
  const deb = linux.find(download => download.format === "deb" && download.arch === "x86_64")?.name ?? `msime-linux-tibetan_${releases.linux.version}_amd64.deb`;
  const rpm = linux.find(download => download.format === "rpm" && download.arch === "x86_64")?.name ?? `msime-linux-tibetan-${releases.linux.version}-1.x86_64.rpm`;
  return { deb, rpm };
}

export function GuidePage() {
  const { messages } = useLocale();
  const guide = messages.guide(guideFiles());
  const sections = [...guide.platforms.map(platform => ({ id: platform.id, title: platform.title })), { id: "typing", title: guide.typingTitle }, { id: "examples", title: guide.examplesTitle }];
  return (
    <main className="page-enter copy">
      <Container width="narrow" className="pt-[clamp(36px,6vw,72px)]">
        <h1 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.35] font-bold">{guide.title}</h1>
        <p className="mt-3 mb-0 text-[17px] text-body">{guide.lead}</p>
        <nav aria-label={guide.toc} className="mt-6 flex flex-wrap gap-2">
          {sections.map(section => (
            <a key={section.id} href={`#${section.id}`} className="rounded-full px-3.5 py-1 text-sm font-semibold text-ink no-underline shadow-ring-2 hover:bg-hover hover:text-ink">
              {section.title}
            </a>
          ))}
        </nav>

        {guide.platforms.map(platform => (
          <section key={platform.id} id={platform.id} className="mt-12">
            <h2 className="m-0 text-[clamp(22px,2.6vw,28px)] font-bold">{platform.title}</h2>
            <p className="m-0 mt-1 text-muted">{platform.body}</p>
            <ol className="m-0 mt-4 grid list-none gap-3 p-0">
              {platform.steps.map((step, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: the steps are a fixed list that never reorders.
                <li key={index} className="flex gap-3 rounded-group bg-panel p-4 shadow-card">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-ink">{index + 1}</span>
                  <div className="min-w-0 flex-1 text-[15.5px] text-body">{step}</div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section id="typing" className="mt-14">
          <h2 className="m-0 text-[clamp(22px,2.6vw,28px)] font-bold">{guide.typingTitle}</h2>
          <p className="m-0 mt-2 text-body">{guide.typingLead}</p>
          <div className="mt-4 overflow-x-auto rounded-group bg-panel shadow-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{guide.keyColumn}</th>
                  <th scope="col">{guide.effectColumn}</th>
                </tr>
              </thead>
              <tbody>
                {guide.keys.map((row, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the rows are a fixed list that never reorders.
                  <tr key={index}>
                    <th scope="row" className="w-[34%] font-normal">
                      {row.key}
                    </th>
                    <td className="text-body">{row.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="examples" className="mt-14">
          <h2 className="m-0 text-[clamp(22px,2.6vw,28px)] font-bold">{guide.examplesTitle}</h2>
          <p className="m-0 mt-2 text-body">{guide.examplesLead}</p>
          <div className="mt-4 overflow-x-auto rounded-group bg-panel shadow-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{guide.typedColumn}</th>
                  <th scope="col">{guide.resultColumn}</th>
                </tr>
              </thead>
              <tbody>
                {EWTS_EXAMPLES.map(example => (
                  <tr key={example.keys}>
                    <td>
                      <code>{example.keys}</code>
                    </td>
                    <td className="tibetan-sample" lang="bo">
                      {example.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </main>
  );
}
