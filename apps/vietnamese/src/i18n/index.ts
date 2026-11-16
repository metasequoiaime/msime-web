import type { Locale } from "../../shared/locales";
import { vi, type Messages } from "./vi";
import { zh } from "./zh";

export type { Messages };

export const MESSAGES: Record<Locale, Messages> = { vi, zh };
