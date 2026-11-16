import { DynamicModule, Global, Inject, MiddlewareConsumer, Module, NestModule, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TRANSLATIONS_OPTIONS } from './constants';
import {
  ResolvedTranslationsOptions,
  TranslationsAsyncOptions,
  TranslationsOptions,
  TranslationsRegistration,
} from './interfaces';
import { LocaleMiddleware } from './locale.middleware';
import { TranslateInterceptor } from './translate.interceptor';
import { Translation } from './translation.entity';
import { TranslationsService } from './translations.service';

export const resolveOptions = (options: TranslationsOptions): ResolvedTranslationsOptions => ({
  queryParam: 'lang',
  ...options,
  locales: options.locales.includes(options.defaultLocale)
    ? options.locales
    : [options.defaultLocale, ...options.locales],
});

const REGISTER_MIDDLEWARE = Symbol('TRANSLATIONS_REGISTER_MIDDLEWARE');

const common = (registration: TranslationsRegistration): Provider[] => [
  { provide: REGISTER_MIDDLEWARE, useValue: registration.registerMiddleware !== false },
  LocaleMiddleware,
  TranslationsService,
  ...(registration.registerInterceptor !== false
    ? [{ provide: APP_INTERCEPTOR, useClass: TranslateInterceptor }]
    : []),
];

@Global()
@Module({})
export class TranslationsModule implements NestModule {
  constructor(@Inject(REGISTER_MIDDLEWARE) private readonly registerMiddleware: boolean) {}

  configure(consumer: MiddlewareConsumer) {
    if (this.registerMiddleware) consumer.apply(LocaleMiddleware).forRoutes('*');
  }

  static forRoot(options: TranslationsOptions, registration: TranslationsRegistration = {}): DynamicModule {
    return {
      module: TranslationsModule,
      imports: [TypeOrmModule.forFeature([Translation])],
      providers: [{ provide: TRANSLATIONS_OPTIONS, useValue: resolveOptions(options) }, ...common(registration)],
      exports: [TranslationsService, TRANSLATIONS_OPTIONS],
    };
  }

  static forRootAsync(options: TranslationsAsyncOptions): DynamicModule {
    return {
      module: TranslationsModule,
      imports: [TypeOrmModule.forFeature([Translation]), ...(options.imports ?? [])],
      providers: [
        {
          provide: TRANSLATIONS_OPTIONS,
          inject: options.inject ?? [],
          useFactory: async (...args: any[]) => resolveOptions(await options.useFactory(...args)),
        },
        ...common(options),
      ],
      exports: [TranslationsService, TRANSLATIONS_OPTIONS],
    };
  }
}
