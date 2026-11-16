import { ResolvedTranslationsOptions } from './interfaces';
export declare const runWithLocale: <T>(locale: string, fn: () => T) => T;
/** Мова поточного запиту; поза запитом — undefined. */
export declare const currentLocale: () => string | undefined;
/**
 * Вибирає мову: `?lang=` важливіший за Accept-Language; тег зводиться до базової мови
 * (en-US → en), q-значення враховуються, непідтримувана мова пропускається,
 * якщо нічого не підійшло — defaultLocale.
 */
export declare function resolveLocale(options: Pick<ResolvedTranslationsOptions, 'defaultLocale' | 'locales'>, query?: unknown, acceptLanguage?: string): string;
