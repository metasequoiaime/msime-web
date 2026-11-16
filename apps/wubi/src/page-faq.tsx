import { useLocale } from "./i18n";
import { PageHero } from "./page-hero";
import { Rich } from "./rich";
import { Card, Container } from "./ui";

export function FaqPage() {
  const { messages } = useLocale();
  const faq = messages.faq;
  return (
    <main>
      <PageHero title={faq.title} lead={<Rich text={faq.lead} />} />
      <Container width="narrow" className="faq-list grid gap-3">
        {faq.items.map((item, index) => (
          <Card as="section" key={item.q} id={`q${index + 1}`} aria-labelledby={`q${index + 1}-title`} className="scroll-mt-24 rounded-tile p-[clamp(18px,2.6vw,28px)]">
            <h2 id={`q${index + 1}-title`} className="m-0 text-lg leading-[1.5] font-semibold text-ink">
              {item.q}
            </h2>
            <div className="mt-3 grid gap-3 text-[15.5px] leading-[1.9] text-body">
              {item.a.map((paragraph) => (
                <p key={paragraph} className="m-0">
                  <Rich text={paragraph} />
                </p>
              ))}
            </div>
          </Card>
        ))}
      </Container>
    </main>
  );
}
