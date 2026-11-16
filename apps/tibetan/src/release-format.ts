/** All Windows preview releases live in the msime repository; the list is the fallback when the newest preview has no Tibetan installer. */
export const WINDOWS_PREVIEW_RELEASES = "https://github.com/metasequoiaime/msime/releases";

/** Sizes in MB with one decimal, as the official download panel shows them. */
export const formatSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** The date part of an ISO timestamp, independent of the reader's time zone so the static HTML and the hydrated page agree. */
export const formatDate = (iso: string) => iso.slice(0, 10);
