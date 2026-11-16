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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocaleMiddleware = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("./constants");
const locale_1 = require("./locale");
let LocaleMiddleware = class LocaleMiddleware {
    options;
    constructor(options) {
        this.options = options;
    }
    use(req, _res, next) {
        const header = req.headers['accept-language'];
        const locale = (0, locale_1.resolveLocale)(this.options, req.query?.[this.options.queryParam], Array.isArray(header) ? header.join(',') : header);
        (0, locale_1.runWithLocale)(locale, next);
    }
};
exports.LocaleMiddleware = LocaleMiddleware;
exports.LocaleMiddleware = LocaleMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(constants_1.TRANSLATIONS_OPTIONS)),
    __metadata("design:paramtypes", [Object])
], LocaleMiddleware);
//# sourceMappingURL=locale.middleware.js.map