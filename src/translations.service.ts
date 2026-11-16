import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { TRANSLATIONS_OPTIONS } from './constants';
import { getTranslatableMeta } from './decorators';
import { ResolvedTranslationsOptions } from './interfaces';
import { currentLocale } from './locale';
import { Translation } from './translation.entity';

type Bucket = { fields: string[]; byId: Map<string, Record<string, unknown>[]> };

@Injectable()
export class TranslationsService {
  constructor(
    @InjectRepository(Translation) private readonly repo: Repository<Translation>,
    @Inject(TRANSLATIONS_OPTIONS) private readonly options: ResolvedTranslationsOptions,
  ) {}

  /** Мова поточного запиту або defaultLocale. */
  getLocale(): string {
    return currentLocale() ?? this.options.defaultLocale;
  }

  /**
   * Обходить значення (будь-яка вкладеність) і підміняє @Translatable поля сутностей на мову.
   * Один запит у БД на тип сутності, а не на рядок. Без перекладу лишається основне значення.
   * Змінює переданий об'єкт і повертає його.
   */
  async translate<T>(data: T, locale = this.getLocale()): Promise<T> {
    if (locale === this.options.defaultLocale) return data;

    const found = new Map<string, Bucket>();
    this.collect(data, found, new WeakSet());

    for (const [entity, { fields, byId }] of found) {
      const rows = await this.repo.find({
        where: { entity, locale, field: In(fields), entity_id: In([...byId.keys()]) },
      });
      for (const row of rows) {
        for (const item of byId.get(row.entity_id) ?? []) item[row.field] = row.value;
      }
    }
    return data;
  }

  /** Записує переклади одного запису; порожнє значення видаляє переклад. */
  async set(
    entity: string,
    entityId: string | number,
    locale: string,
    values: Record<string, string | null | undefined>,
  ): Promise<void> {
    const id = String(entityId);
    for (const [field, value] of Object.entries(values)) {
      if (value === undefined) continue;
      if (value === null || value === '') {
        await this.repo.delete({ entity, entity_id: id, field, locale });
      } else {
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
  async get(entity: string, entityId: string | number): Promise<Record<string, Record<string, string>>> {
    const rows = await this.repo.find({ where: { entity, entity_id: String(entityId) } });
    const result: Record<string, Record<string, string>> = {};
    for (const row of rows) (result[row.field] ??= {})[row.locale] = row.value;
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
  column(qb: SelectQueryBuilder<any>, alias: string, field: string, locale = this.getLocale()): string {
    const base = `${alias}.${field}`;
    if (locale === this.options.defaultLocale) return base;

    const metadata = qb.expressionMap.findAliasByName(alias).metadata;
    const meta = typeof metadata.target === 'function' ? getTranslatableMeta(metadata.target.prototype) : null;
    if (!meta?.fields.includes(field)) {
      throw new Error(`${alias}.${field} is not a @Translatable field of a @TranslatableEntity`);
    }

    const join = `tr_${alias}_${field}_${locale}`.replace(/\W/g, '_');
    if (!qb.expressionMap.joinAttributes.some((j) => j.alias.name === join)) {
      const idColumn = metadata.primaryColumns[0].propertyName;
      qb.leftJoin(
        Translation,
        join,
        `${join}.entity = :${join}_entity AND ${join}.entity_id = CAST(${alias}.${idColumn} AS varchar)` +
          ` AND ${join}.field = :${join}_field AND ${join}.locale = :${join}_locale`,
        { [`${join}_entity`]: meta.entity, [`${join}_field`]: field, [`${join}_locale`]: locale },
      );
    }
    return `COALESCE(${join}.value, ${base})`;
  }

  /** Сортування за перекладеним полем; працює разом із skip/take. Додає ORDER BY (як addOrderBy). */
  orderBy(
    qb: SelectQueryBuilder<any>,
    alias: string,
    field: string,
    direction: 'ASC' | 'DESC' = 'ASC',
    locale = this.getLocale(),
  ): SelectQueryBuilder<any> {
    const expression = this.column(qb, alias, field, locale);
    if (expression === `${alias}.${field}`) return qb.addOrderBy(expression, direction);
    const sortAlias = `${alias}_${field}_${locale}_sort`.replace(/\W/g, '_');
    return qb.addSelect(expression, sortAlias).addOrderBy(sortAlias, direction);
  }

  private collect(value: unknown, found: Map<string, Bucket>, seen: WeakSet<object>): void {
    if (!value || typeof value !== 'object' || value instanceof Date || ArrayBuffer.isView(value) || seen.has(value)) {
      return;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) this.collect(item, found, seen);
      return;
    }

    const meta = getTranslatableMeta(value);
    const record = value as Record<string, unknown>;
    if (meta && record.id !== undefined && record.id !== null) {
      const bucket = found.get(meta.entity) ?? { fields: meta.fields, byId: new Map() };
      const id = String(record.id);
      bucket.byId.set(id, [...(bucket.byId.get(id) ?? []), record]);
      found.set(meta.entity, bucket);
    }

    for (const child of Object.values(record)) this.collect(child, found, seen);
  }
}
