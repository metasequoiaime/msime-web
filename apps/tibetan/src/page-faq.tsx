import { Container } from "./ui/container";
import { ArrowRightIcon } from "./ui/icons";
import { useLocale } from "./use-locale";

export function FaqPage() {
  const { messages } = useLocale();
  const faq = messages.faq;
  return (
    <main className="page-enter copy">
      <Container width="narrow" className="pt-[clamp(36px,6vw,72px)]">
        <h1 className="m-0 text-[clamp(28px,4vw,44px)] leading-[1.35] font-bold">{faq.title}</h1>
        <p className="mt-3 mb-0 text-[17px] text-body">{faq.lead}</p>
        <div className="mt-8 grid gap-3">
          {faq.items.map(item => (
            <details key={item.id} id={item.id} className="faq-item rounded-group bg-panel shadow-card" open>
              <summary className="flex cursor-pointer items-start gap-3 p-5">
                <ArrowRightIcon className="faq-chevron mt-1.5 flex-none text-accent-ink transition-transform" size={16} />
                <h2 className="m-0 text-[17px] leading-[1.7] font-semibold">{item.q}</h2>
              </summary>
              <div className="px-5 pb-5 pl-12 text-[15.5px] text-body">{item.a}</div>
            </details>
          ))}
        </div>
      </Container>
    </main>
  );
}
