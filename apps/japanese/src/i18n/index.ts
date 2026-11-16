import type { Locale } from "../../shared/locales";
import { ja } from "./ja";
import type { Messages } from "./types";
import { zh } from "./zh";

export const MESSAGES: Record<Locale, Messages> = { ja, zh };
export type { Messages, Rich } from "./types";
