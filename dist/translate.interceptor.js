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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const operators_1 = require("rxjs/operators");
const decorators_1 = require("./decorators");
const translations_service_1 = require("./translations.service");
/** Кожна відповідь з entity-класами віддається мовою запиту; @SkipTranslation() це вимикає. */
let TranslateInterceptor = class TranslateInterceptor {
    translations;
    reflector;
    constructor(translations, reflector) {
        this.translations = translations;
        this.reflector = reflector;
    }
    intercept(context, next) {
        const skip = this.reflector.getAllAndOverride(decorators_1.SKIP_TRANSLATION_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip)
            return next.handle();
        return next.handle().pipe((0, operators_1.mergeMap)((data) => this.translations.translate(data)));
    }
};
exports.TranslateInterceptor = TranslateInterceptor;
exports.TranslateInterceptor = TranslateInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [translations_service_1.TranslationsService,
        core_1.Reflector])
], TranslateInterceptor);
//# sourceMappingURL=translate.interceptor.js.map