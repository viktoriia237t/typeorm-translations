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
exports.TranslationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const constants_1 = require("./constants");
const decorators_1 = require("./decorators");
const locale_1 = require("./locale");
const translation_entity_1 = require("./translation.entity");
let TranslationsService = class TranslationsService {
    repo;
    options;
    constructor(repo, options) {
        this.repo = repo;
        this.options = options;
    }
    /** Мова поточного запиту або defaultLocale. */
    getLocale() {
        return (0, locale_1.currentLocale)() ?? this.options.defaultLocale;
    }
    /**
     * Обходить значення (будь-яка вкладеність) і підміняє @Translatable поля сутностей на мову.
     * Один запит у БД на тип сутності, а не на рядок. Без перекладу лишається основне значення.
     * Змінює переданий об'єкт і повертає його.
     */
    async translate(data, locale = this.getLocale()) {
        if (locale === this.options.defaultLocale)
            return data;
        const found = new Map();
        this.collect(data, found, new WeakSet());
        for (const [entity, { fields, byId }] of found) {
            const rows = await this.repo.find({
                where: { entity, locale, field: (0, typeorm_2.In)(fields), entity_id: (0, typeorm_2.In)([...byId.keys()]) },
            });
            for (const row of rows) {
                for (const item of byId.get(row.entity_id) ?? [])
                    item[row.field] = row.value;
            }
        }
        return data;
    }
    /** Записує переклади одного запису; порожнє значення видаляє переклад. */
    async set(entity, entityId, locale, values) {
        const id = String(entityId);
        for (const [field, value] of Object.entries(values)) {
            if (value === undefined)
                continue;
            if (value === null || value === '') {
                await this.repo.delete({ entity, entity_id: id, field, locale });
            }
            else {
                await this.repo.upsert({ entity, entity_id: id, field, locale, value }, [
                    'entity',
                    'entity_id',
                    'field',
                    'locale',
                ]);
            }
        }
    }
    /** Усі переклади запису: { name: { en: '…' }, … }. Для форм редагування в адмінці. */
    async get(entity, entityId) {
        const rows = await this.repo.find({ where: { entity, entity_id: String(entityId) } });
        const result = {};
        for (const row of rows)
            (result[row.field] ??= {})[row.locale] = row.value;
        return result;
    }
    /**
     * SQL-вираз `COALESCE(переклад, базове значення)` для WHERE / ORDER BY за перекладеним полем.
     * Сам додає LEFT JOIN на translations (один раз на поле й мову; рядків не множить, бо
     * (entity, entity_id, field, locale) унікальний). Для основної мови повертає звичайну колонку.
     * Лише Postgres: id порівнюється як varchar.
     *
     *   qb.andWhere(`${translations.column(qb, 'p', 'name')} ILIKE :q`, { q: '%milk%' });
     *
     * Для сортування краще orderBy(): сирий вираз в orderBy() ламає skip/take.
     */
    column(qb, alias, field, locale = this.getLocale()) {
        const base = `${alias}.${field}`;
        if (locale === this.options.defaultLocale)
            return base;
        const metadata = qb.expressionMap.findAliasByName(alias).metadata;
        const meta = typeof metadata.target === 'function' ? (0, decorators_1.getTranslatableMeta)(metadata.target.prototype) : null;
        if (!meta?.fields.includes(field)) {
            throw new Error(`${alias}.${field} is not a @Translatable field of a @TranslatableEntity`);
        }
        const join = `tr_${alias}_${field}_${locale}`.replace(/\W/g, '_');
        if (!qb.expressionMap.joinAttributes.some((j) => j.alias.name === join)) {
            const idColumn = metadata.primaryColumns[0].propertyName;
            qb.leftJoin(translation_entity_1.Translation, join, `${join}.entity = :${join}_entity AND ${join}.entity_id = CAST(${alias}.${idColumn} AS varchar)` +
                ` AND ${join}.field = :${join}_field AND ${join}.locale = :${join}_locale`, { [`${join}_entity`]: meta.entity, [`${join}_field`]: field, [`${join}_locale`]: locale });
        }
        return `COALESCE(${join}.value, ${base})`;
    }
    /** Сортування за перекладеним полем; працює разом із skip/take. Додає ORDER BY (як addOrderBy). */
    orderBy(qb, alias, field, direction = 'ASC', locale = this.getLocale()) {
        if (direction !== 'ASC' && direction !== 'DESC')
            throw new Error(`Invalid sort direction: ${String(direction)}`);
        const expression = this.column(qb, alias, field, locale);
        if (expression === `${alias}.${field}`)
            return qb.addOrderBy(expression, direction);
        const sortAlias = `${alias}_${field}_${locale}_sort`.replace(/\W/g, '_');
        return qb.addSelect(expression, sortAlias).addOrderBy(sortAlias, direction);
    }
    collect(value, found, seen) {
        if (!value || typeof value !== 'object' || value instanceof Date || ArrayBuffer.isView(value) || seen.has(value)) {
            return;
        }
        seen.add(value);
        if (Array.isArray(value)) {
            for (const item of value)
                this.collect(item, found, seen);
            return;
        }
        const meta = (0, decorators_1.getTranslatableMeta)(value);
        const record = value;
        if (meta && record.id !== undefined && record.id !== null) {
            const bucket = found.get(meta.entity) ?? { fields: meta.fields, byId: new Map() };
            const id = String(record.id);
            bucket.byId.set(id, [...(bucket.byId.get(id) ?? []), record]);
            found.set(meta.entity, bucket);
        }
        for (const child of Object.values(record))
            this.collect(child, found, seen);
    }
};
exports.TranslationsService = TranslationsService;
exports.TranslationsService = TranslationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(translation_entity_1.Translation)),
    __param(1, (0, common_1.Inject)(constants_1.TRANSLATIONS_OPTIONS)),
    __metadata("design:paramtypes", [typeorm_2.Repository, Object])
], TranslationsService);
//# sourceMappingURL=translations.service.js.map