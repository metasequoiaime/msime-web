/** The single-scheme edition sites of 水杉输入法. Each site's footer links the editions other than itself; the official site at msime.app is linked separately. Pages not written in Chinese add the English name, since their readers may not read the Chinese product names. */
const EDITION_SITES = [
  { id: "wubi", name: "水杉五笔", english: "Wubi", url: "https://wubi.msime.app/" },
  { id: "japanese", name: "水杉日语", english: "Japanese", url: "https://japanese.msime.app/" },
  { id: "vietnamese", name: "水杉越南语", english: "Vietnamese", url: "https://vietnamese.msime.app/" },
  { id: "tibetan", name: "水杉藏文", english: "Tibetan", url: "https://tibetan.msime.app/" },
] as const;

export const otherEditionSites = (self: (typeof EDITION_SITES)[number]["id"], withEnglish: boolean) =>
  EDITION_SITES.filter((site) => site.id !== self).map((site) => ({ url: site.url, label: withEnglish ? `${site.name} · ${site.english}` : site.name }));
