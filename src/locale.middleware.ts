import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { TRANSLATIONS_OPTIONS } from './constants';
import { ResolvedTranslationsOptions } from './interfaces';
import { resolveLocale, runWithLocale } from './locale';

interface RequestLike {
  query?: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  constructor(@Inject(TRANSLATIONS_OPTIONS) private readonly options: ResolvedTranslationsOptions) {}

  use(req: RequestLike, _res: unknown, next: () => void) {
    const header = req.headers['accept-language'];
    const locale = resolveLocale(
      this.options,
      req.query?.[this.options.queryParam],
      Array.isArray(header) ? header.join(',') : header,
    );
    runWithLocale(locale, next);
  }
}
