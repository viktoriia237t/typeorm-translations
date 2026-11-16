"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TranslationsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationsModule = exports.resolveOptions = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const constants_1 = require("./constants");
const locale_middleware_1 = require("./locale.middleware");
const translate_interceptor_1 = require("./translate.interceptor");
const translation_entity_1 = require("./translation.entity");
const translations_service_1 = require("./translations.service");
const resolveOptions = (options) => ({
    queryParam: 'lang',
    ...options,
    locales: options.locales.includes(options.defaultLocale)
        ? options.locales
        : [options.defaultLocale, ...options.locales],
});
exports.resolveOptions = resolveOptions;
const REGISTER_MIDDLEWARE = Symbol('TRANSLATIONS_REGISTER_MIDDLEWARE');
const common = (registration) => [
    { provide: REGISTER_MIDDLEWARE, useValue: registration.registerMiddleware !== false },
    locale_middleware_1.LocaleMiddleware,
    translations_service_1.TranslationsService,
    ...(registration.registerInterceptor !== false
        ? [{ provide: core_1.APP_INTERCEPTOR, useClass: translate_interceptor_1.TranslateInterceptor }]
        : []),
];
let TranslationsModule = TranslationsModule_1 = class TranslationsModule {
    registerMiddleware;
    constructor(registerMiddleware) {
        this.registerMiddleware = registerMiddleware;
    }
    configure(consumer) {
        if (this.registerMiddleware)
            consumer.apply(locale_middleware_1.LocaleMiddleware).forRoutes('*');
    }
    static forRoot(options, registration = {}) {
        return {
            module: TranslationsModule_1,
            imports: [typeorm_1.TypeOrmModule.forFeature([translation_entity_1.Translation])],
            providers: [{ provide: constants_1.TRANSLATIONS_OPTIONS, useValue: (0, exports.resolveOptions)(options) }, ...common(registration)],
            exports: [translations_service_1.TranslationsService, constants_1.TRANSLATIONS_OPTIONS],
        };
    }
    static forRootAsync(options) {
        return {
            module: TranslationsModule_1,
            imports: [typeorm_1.TypeOrmModule.forFeature([translation_entity_1.Translation]), ...(options.imports ?? [])],
            providers: [
                {
                    provide: constants_1.TRANSLATIONS_OPTIONS,
                    inject: options.inject ?? [],
                    useFactory: async (...args) => (0, exports.resolveOptions)(await options.useFactory(...args)),
                },
                ...common(options),
            ],
            exports: [translations_service_1.TranslationsService, constants_1.TRANSLATIONS_OPTIONS],
        };
    }
};
exports.TranslationsModule = TranslationsModule;
exports.TranslationsModule = TranslationsModule = TranslationsModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({}),
    __param(0, (0, common_1.Inject)(REGISTER_MIDDLEWARE)),
    __metadata("design:paramtypes", [Boolean])
], TranslationsModule);
//# sourceMappingURL=translations.module.js.map