"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentLocale = exports.runWithLocale = void 0;
exports.resolveLocale = resolveLocale;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
const runWithLocale = (locale, fn) => storage.run({ locale }, fn);
exports.runWithLocale = runWithLocale;
/** Мова поточного запиту; поза запитом — undefined. */
const currentLocale = () => storage.getStore()?.locale;
exports.currentLocale = currentLocale;
/**
 * Вибирає мову: `?lang=` важливіший за Accept-Language; тег зводиться до базової мови
 * (en-US → en), q-значення враховуються, непідтримувана мова пропускається,
 * якщо нічого не підійшло — defaultLocale.
 */
function resolveLocale(options, query, acceptLanguage) {
    const candidates = [];
    if (typeof query === 'string')
        candidates.push(query);
    if (acceptLanguage) {
        candidates.push(...acceptLanguage
            .split(',')
            .map((part, index) => ({
            tag: part.split(';')[0].trim(),
            q: Number(/q=([\d.]+)/.exec(part)?.[1] ?? 1) || 0, // нечислове q (q=1.2.3) = найнижчий пріоритет
            index,
        }))
            .sort((a, b) => b.q - a.q || a.index - b.index)
            .map((part) => part.tag));
    }
    for (const tag of candidates) {
        const base = tag.toLowerCase().split('-')[0];
        if (options.locales.includes(base))
            return base;
    }
    return options.defaultLocale;
}
//# sourceMappingURL=locale.js.map