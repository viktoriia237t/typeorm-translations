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
exports.Translation = void 0;
const typeorm_1 = require("typeorm");
/**
 * Один переклад одного поля одного запису. Додавання мови — це нові рядки,
 * а не нові колонки чи міграції.
 */
let Translation = class Translation {
    id;
    /** Ключ сутності з @TranslatableEntity. */
    entity;
    /** Рядок, бо id сутностей бувають і uuid, і int. */
    entity_id;
    field;
    locale;
    value;
};
exports.Translation = Translation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Translation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], Translation.prototype, "entity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 36 }),
    __metadata("design:type", String)
], Translation.prototype, "entity_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], Translation.prototype, "field", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], Translation.prototype, "locale", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Translation.prototype, "value", void 0);
exports.Translation = Translation = __decorate([
    (0, typeorm_1.Entity)('translations'),
    (0, typeorm_1.Index)('UQ_translations_entity_field_locale', ['entity', 'entity_id', 'field', 'locale'], { unique: true }),
    (0, typeorm_1.Index)('IDX_translations_entity_locale', ['entity', 'locale'])
], Translation);
//# sourceMappingURL=translation.entity.js.map