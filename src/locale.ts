import { AsyncLocalStorage } from 'async_hooks';
import { ResolvedTranslationsOptions } from './interfaces';

const storage = new AsyncLocalStorage<{ locale: string }>();

export const runWithLocale = <T>(locale: string, fn: () => T): T => storage.run({ locale }, fn);

/** Мова поточного запиту; поза запитом — undefined. */
export const currentLocale = (): string | undefined => storage.getStore()?.locale;

/**
 * Вибирає мову: `?lang=` важливіший за Accept-Language; тег зводиться до базової мови
 * (en-US → en), q-значення враховуються, непідтримувана мова пропускається,
 * якщо нічого не підійшло — defaultLocale.
 */
export function resolveLocale(
  options: Pick<ResolvedTranslationsOptions, 'defaultLocale' | 'locales'>,
  query?: unknown,
  acceptLanguage?: string,
): string {
  const candidates: string[] = [];
  if (typeof query === 'string') candidates.push(query);
  if (acceptLanguage) {
    candidates.push(
      ...acceptLanguage
        .split(',')
        .map((part, index) => ({
          tag: part.split(';')[0].trim(),
          q: Number(/q=([\d.]+)/.exec(part)?.[1] ?? 1),
          index,
        }))
        .sort((a, b) => b.q - a.q || a.index - b.index)
        .map((part) => part.tag),
    );
  }
  for (const tag of candidates) {
    const base = tag.toLowerCase().split('-')[0];
    if (options.locales.includes(base)) return base;
  }
  return options.defaultLocale;
}
