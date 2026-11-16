export interface TranslationsOptions {
  /** Мова основних колонок сутностей (name, description…); вона ж fallback. */
  defaultLocale: string;
  /** Мови, які вміє віддавати API, разом з defaultLocale. */
  locales: string[];
  /** Query-параметр з мовою; має пріоритет над Accept-Language. За замовчуванням `lang`. */
  queryParam?: string;
}

export type ResolvedTranslationsOptions = Required<TranslationsOptions>;

export interface TranslationsAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => TranslationsOptions | Promise<TranslationsOptions>;
  /** Підключати LocaleMiddleware на всі маршрути. За замовчуванням true. */
  registerMiddleware?: boolean;
  /** Реєструвати TranslateInterceptor глобально. За замовчуванням true. */
  registerInterceptor?: boolean;
}

export interface TranslationsRegistration {
  registerMiddleware?: boolean;
  registerInterceptor?: boolean;
}
