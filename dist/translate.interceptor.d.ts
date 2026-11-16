import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TranslationsService } from './translations.service';
/** Кожна відповідь з entity-класами віддається мовою запиту; @SkipTranslation() це вимикає. */
export declare class TranslateInterceptor implements NestInterceptor {
    private readonly translations;
    private readonly reflector;
    constructor(translations: TranslationsService, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
