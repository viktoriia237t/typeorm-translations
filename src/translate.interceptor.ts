import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { SKIP_TRANSLATION_KEY } from './decorators';
import { TranslationsService } from './translations.service';

/** Кожна відповідь з entity-класами віддається мовою запиту; @SkipTranslation() це вимикає. */
@Injectable()
export class TranslateInterceptor implements NestInterceptor {
  constructor(
    private readonly translations: TranslationsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSLATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();
    return next.handle().pipe(mergeMap((data) => this.translations.translate(data)));
  }
}
