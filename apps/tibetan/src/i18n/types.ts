import type { ReactNode } from "react";

type Item = { title: string; body: ReactNode };

/** File names the guide quotes, taken from the current release so the commands match what the download page offers. */
export type GuideFiles = { deb: string; rpm: string };

/** Every locale module exports one of these; TypeScript keeps the two languages in step. */
export type Messages = {
  /** This language's own name, shown on the switcher that leads to it. */
  languageName: string;
  /** Accessible name of the language switcher link, in the language it leads to. */
  switchLabel: string;
  skipToContent: string;
  nav: { label: string; home: string; download: string; guide: string; faq: string };
  theme: { label: string; light: string; dark: string; system: string };
  footer: { fullProduct: string; source: string; feedback: string; privacy: string; terms: string };
  home: {
    eyebrow: string;
    title: string;
    lead: ReactNode;
    download: string;
    guide: string;
    demoTitle: string;
    demoKeys: string;
    demoResult: string;
    featuresTitle: string;
    features: Item[];
    platformsTitle: string;
    platforms: { name: string; note: string; available: boolean }[];
    fullTitle: string;
    fullBody: ReactNode;
    fullLink: string;
  };
  download: {
    title: string;
    lead: ReactNode;
    version: string;
    size: string;
    published: string;
    github: string;
    mirror: string;
    releasePage: string;
    macos: { note: ReactNode; missing: ReactNode };
    linux: { note: ReactNode; missing: ReactNode; formats: Record<"deb" | "rpm" | "tar.gz", string> };
    android: { note: ReactNode; missing: ReactNode };
    windows: { badge: string; note: ReactNode; missing: ReactNode };
    other: Item;
    verify: Item;
  };
  guide: (files: GuideFiles) => {
    title: string;
    lead: ReactNode;
    toc: string;
    platforms: (Item & { id: string; steps: ReactNode[] })[];
    typingTitle: string;
    typingLead: ReactNode;
    keyColumn: string;
    effectColumn: string;
    keys: { key: ReactNode; effect: ReactNode }[];
    examplesTitle: string;
    examplesLead: ReactNode;
    typedColumn: string;
    resultColumn: string;
  };
  faq: { title: string; lead: ReactNode; items: { id: string; q: string; a: ReactNode }[] };
  notFound: { title: string; body: string; home: string; guide: string };
};
