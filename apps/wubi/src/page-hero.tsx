import type { ReactNode } from "react";
import { Container } from "./ui";

/** Heading block at the top of the inner pages: one h1 and an optional lead. */
export function PageHero({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-hero">
      <Container width="inner" className="page-enter pt-[clamp(40px,6vw,80px)] pb-[clamp(24px,3vw,40px)]">
        <h1 className="m-0 font-heading text-[clamp(32px,4.4vw,52px)] leading-[1.2] font-bold text-ink">{title}</h1>
        {lead && <p className="m-0 mt-4 max-w-[64ch] text-[16.5px] leading-[1.85] text-body">{lead}</p>}
        {children}
      </Container>
    </header>
  );
}
