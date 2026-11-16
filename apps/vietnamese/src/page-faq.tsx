import { usePageMeta } from "./page-meta";
import { Rich } from "./rich";
import { FEEDBACK_URL, GITHUB_ISSUES } from "./site-shell";
import { AnchorButton, Card, ChevronDownIcon, Container, GitHubIcon } from "./ui";
import { useLocale } from "./use-locale";

/** Questions as native disclosures: readable and operable without JavaScript, every answer in the static HTML. */
export function FaqPage() {
  const { messages } = useLocale();
  const text = messages.faq;
  usePageMeta();

  return (
    <main className="w-full">
      <Container width="narrow" className="page-enter pt-[clamp(32px,5vw,64px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,50px)] leading-[1.2] font-bold text-ink">{text.title}</h1>

        <div className="mt-8 grid gap-3">
          {text.items.map((item, index) => (
            <Card as="section" key={item.q} className="rounded-tile">
              <details className="group" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 text-[16.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  <h2 className="m-0 text-[16.5px] leading-[1.6] font-semibold text-ink">{item.q}</h2>
                  <ChevronDownIcon className="mt-1 flex-none text-muted transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5">
                  {item.a.map((answer) => (
                    <p key={answer} className="m-0 text-[15.5px] leading-[1.85] text-body not-first:mt-3">
                      <Rich text={answer} />
                    </p>
                  ))}
                </div>
              </details>
            </Card>
          ))}
        </div>

        <Card tone="accent" className="mt-10 rounded-panel p-[clamp(20px,3vw,32px)]">
          <p className="m-0 text-[15.5px] leading-[1.8] text-body">{text.lead}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <AnchorButton href={FEEDBACK_URL}>{text.feedback}</AnchorButton>
            <AnchorButton variant="secondary" href={GITHUB_ISSUES}>
              <GitHubIcon size={16} />
              {text.issues}
            </AnchorButton>
          </div>
        </Card>
      </Container>
    </main>
  );
}
