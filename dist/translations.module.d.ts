import { DynamicModule, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ResolvedTranslationsOptions, TranslationsAsyncOptions, TranslationsOptions, TranslationsRegistration } from './interfaces';
export declare const resolveOptions: (options: TranslationsOptions) => ResolvedTranslationsOptions;
export declare class TranslationsModule implements NestModule {
    private readonly registerMiddleware;
    constructor(registerMiddleware: boolean);
    configure(consumer: MiddlewareConsumer): void;
    static forRoot(options: TranslationsOptions, registration?: TranslationsRegistration): DynamicModule;
    static forRootAsync(options: TranslationsAsyncOptions): DynamicModule;
}
