/**
 * The shape every locale module exports. Strings marked `Rich` may contain `code` spans and [label](href) links, rendered by `<Rich>` (src/i18n/rich.tsx); every other string is plain text.
 *
 * Settings paths inside the apps are quoted with their Chinese labels (the apps' UI is Chinese) and glossed in the page language.
 */
export type Rich = string;

export type PlatformId = "macos" | "linux" | "android" | "windows" | "ios";

export type GuideSection = {
  id: string;
  title: string;
  intro?: Rich;
  steps?: Rich[];
  /** Shell commands shown in a code block after the steps. */
  commands?: string[];
  notes?: Rich[];
};

export type Messages = {
  /** `<html lang>` and the hreflang code. */
  lang: string;
  /** og:locale. */
  ogLocale: string;
  /** This language's own name, for the switcher. */
  languageName: string;
  common: {
    productName: string;
    fullProductName: string;
    skipToContent: string;
    siteNav: string;
    home: string;
    download: string;
    guide: string;
    faq: string;
    language: string;
    theme: string;
    themes: { light: string; dark: string; system: string };
    menu: string;
    backToTop: string;
    homeLink: string;
  };
  footer: {
    tagline: string;
    pages: string;
    project: string;
    fullProduct: string;
    feedback: string;
    issues: string;
    source: string;
    privacy: string;
    terms: string;
    family: string;
  };
  home: {
    eyebrow: string;
    title: string;
    lead: Rich;
    primaryAction: string;
    secondaryAction: string;
    demoCaption: string;
    demo: { keys: string; result: string; note: string }[];
    featuresTitle: string;
    features: { title: string; body: Rich }[];
    limitsTitle: string;
    limits: Rich[];
    platformsTitle: string;
    platformsLead: string;
    platforms: { id: PlatformId; name: string; status: string; body: Rich }[];
    fullTitle: string;
    fullBody: Rich;
    fullAction: string;
  };
  download: {
    title: string;
    lead: Rich;
    standalone: string;
    viaFull: string;
    version: string;
    released: string;
    size: string;
    releasePage: string;
    github: string;
    mirror: string;
    unsignedPreview: string;
    unsignedNote: Rich;
    requirements: Record<"macos" | "linux" | "android" | "windows" | "ios", string>;
    macosPending: Rich;
    macosHomebrew: Rich;
    linuxFormats: { deb: string; rpm: string; tar: string };
    linuxDistros: { deb: string; rpm: string; tar: string };
    androidPackage: string;
    windowsNoEdition: Rich;
    windowsFull: Rich;
    iosFull: Rich;
    allReleases: string;
    unavailable: Rich;
    verifyTitle: string;
    verifyBody: Rich;
    verifyCommands: string[];
  };
  guide: {
    title: string;
    lead: Rich;
    contents: string;
    platformsTitle: string;
    platforms: GuideSection[];
    typingTitle: string;
    typingLead: Rich;
    keysHeading: { keys: string; result: string };
    keys: { keys: string; result: Rich }[];
    typingNotes: Rich[];
    sources: Rich;
  };
  faq: {
    title: string;
    lead: Rich;
    items: { id: string; q: string; a: Rich[] }[];
    more: Rich;
  };
  notFound: {
    title: string;
    body: string;
    home: string;
    guide: string;
  };
  loadError: {
    eyebrow: string;
    title: string;
    body: string;
    reload: string;
    home: string;
  };
};
