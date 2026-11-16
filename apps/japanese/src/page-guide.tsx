import { Rich } from "./i18n/rich";
import { usePageMeta } from "./page-meta";
import { Card, Container, PlatformIcon } from "./ui";
import { useLocale } from "./use-locale";

const sectionTitle = "m-0 font-heading text-[clamp(26px,3vw,34px)] leading-[1.3] font-bold text-ink";
const body = "text-[15.5px] leading-[1.9] text-body";

export function GuidePage() {
  const { messages } = useLocale();
  const { guide } = messages;
  usePageMeta();

  return (
    <main className="w-full">
      <Container width="narrow" className="page-enter pt-[clamp(32px,5vw,72px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,50px)] leading-[1.2] font-bold text-ink">{guide.title}</h1>
        <p className={`m-0 mt-4 ${body} text-[16.5px]`}>
          <Rich text={guide.lead} />
        </p>

        <nav aria-labelledby="guide-contents" className="mt-8 rounded-group bg-panel-2 px-5 py-4">
          <p id="guide-contents" className="m-0 text-[13px] font-semibold text-muted">
            {guide.contents}
          </p>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[15px]">
            {guide.platforms.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
            <li>
              <a href="#typing">{guide.typingTitle}</a>
            </li>
          </ul>
        </nav>

        <h2 className={`${sectionTitle} mt-[clamp(40px,5vw,64px)]`}>{guide.platformsTitle}</h2>
        <div className="mt-6 grid gap-5">
          {guide.platforms.map((section) => (
            <Card as="section" key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="min-w-0 rounded-panel p-[clamp(20px,3vw,32px)]">
              <div className="flex items-center gap-3">
                <PlatformIcon platform={section.id as "macos"} size={26} />
                <h3 id={`${section.id}-title`} className="m-0 text-[clamp(21px,2.2vw,24px)] font-bold text-ink">
                  {section.title}
                </h3>
              </div>
              {section.intro && (
                <p className={`m-0 mt-3 ${body}`}>
                  <Rich text={section.intro} />
                </p>
              )}
              {section.steps && (
                <ol className={`m-0 mt-4 grid list-decimal gap-2.5 pl-6 ${body} marker:font-semibold marker:text-accent-ink`}>
                  {section.steps.map((step) => (
                    <li key={step} className="pl-1">
                      <Rich text={step} />
                    </li>
                  ))}
                </ol>
              )}
              {section.commands && (
                <pre className="m-0 mt-4 overflow-x-auto rounded-group bg-panel-2 px-4 py-3.5 font-code text-[13.5px] leading-[1.8] text-ink shadow-hair">
                  {section.commands.join("\n")}
                </pre>
              )}
              {section.notes && (
                <ul className={`m-0 mt-4 grid list-disc gap-2 pl-6 ${body} text-[15px] marker:text-muted`}>
                  {section.notes.map((note) => (
                    <li key={note} className="pl-1">
                      <Rich text={note} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>

        <section id="typing" aria-labelledby="typing-title" className="mt-[clamp(48px,6vw,80px)]">
          <h2 id="typing-title" className={sectionTitle}>
            {guide.typingTitle}
          </h2>
          <p className={`m-0 mt-3 ${body}`}>
            <Rich text={guide.typingLead} />
          </p>
          <div className="mt-5 overflow-x-auto rounded-panel bg-panel shadow-hair">
            <table className="w-full border-collapse text-left text-[15px]">
              <thead>
                <tr className="shadow-divider-b">
                  <th scope="col" className="px-5 py-3 text-[13px] font-semibold text-muted">
                    {guide.keysHeading.keys}
                  </th>
                  <th scope="col" className="px-5 py-3 text-[13px] font-semibold text-muted">
                    {guide.keysHeading.result}
                  </th>
                </tr>
              </thead>
              <tbody>
                {guide.keys.map((row) => (
                  <tr key={row.keys} className="shadow-divider-t first:shadow-none">
                    <td className="px-5 py-3 align-top font-code text-[14px] whitespace-nowrap text-ink">{row.keys}</td>
                    <td className="px-5 py-3 text-body">
                      <Rich text={row.result} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={`m-0 mt-5 grid list-disc gap-2 pl-6 ${body} text-[15px] marker:text-muted`}>
            {guide.typingNotes.map((note) => (
              <li key={note} className="pl-1">
                <Rich text={note} />
              </li>
            ))}
          </ul>
        </section>

        <p className="m-0 mt-10 text-sm leading-[1.8] text-muted">
          <Rich text={guide.sources} />
        </p>
      </Container>
    </main>
  );
}
