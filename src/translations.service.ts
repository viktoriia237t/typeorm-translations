import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
