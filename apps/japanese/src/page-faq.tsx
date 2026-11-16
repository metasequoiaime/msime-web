import { Rich } from "./i18n/rich";
import { usePageMeta } from "./page-meta";
import { ChevronDownIcon, Container } from "./ui";
import { useLocale } from "./use-locale";

/** Questions are native disclosure elements, so every answer is in the static HTML and works without JavaScript. */
export function FaqPage() {
  const { messages } = useLocale();
  const { faq } = messages;
  usePageMeta();

  return (
    <main className="w-full">
      <Container width="narrow" className="page-enter pt-[clamp(32px,5vw,72px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,50px)] leading-[1.2] font-bold text-ink">{faq.title}</h1>
        <p className="m-0 mt-4 text-[16.5px] leading-[1.85] text-body">
          <Rich text={faq.lead} />
        </p>

        <div className="mt-[clamp(28px,4vw,44px)] grid gap-3">
          {faq.items.map((item, index) => (
            <details key={item.id} id={item.id} open={index === 0} className="group rounded-panel bg-panel px-[clamp(18px,2.6vw,28px)] shadow-hair">
              <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <h2 className="m-0 text-[17px] leading-[1.55] font-semibold text-ink">{item.q}</h2>
                <ChevronDownIcon className="flex-none text-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="grid gap-3 pb-5 text-[15.5px] leading-[1.9] text-body">
                {item.a.map((paragraph) => (
                  <p key={paragraph} className="m-0">
                    <Rich text={paragraph} />
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>

        <p className="m-0 mt-8 text-[15px] text-muted">
          <Rich text={faq.more} />
        </p>
      </Container>
    </main>
  );
}
