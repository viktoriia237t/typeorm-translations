import { Repository, SelectQueryBuilder } from 'typeorm';
import { ResolvedTranslationsOptions } from './interfaces';
import { Translation } from './translation.entity';
export declare class TranslationsService {
    private readonly repo;
    private readonly options;
    constructor(repo: Repository<Translation>, options: ResolvedTranslationsOptions);
    /** Мова поточного запиту або defaultLocale. */
    getLocale(): string;
    /**
     * Обходить значення (будь-яка вкладеність) і підміняє @Translatable поля сутностей на мову.
     * Один запит у БД на тип сутності, а не на рядок. Без перекладу лишається основне значення.
     * Змінює переданий об'єкт і повертає його.
     */
    translate<T>(data: T, locale?: string): Promise<T>;
    /** Записує переклади одного запису; порожнє значення видаляє переклад. */
    set(entity: string, entityId: string | number, locale: string, values: Record<string, string | null | undefined>): Promise<void>;
    /** Усі переклади запису: { name: { en: '…' }, … }. Для форм редагування в адмінці. */
    get(entity: string, entityId: string | number): Promise<Record<string, Record<string, string>>>;
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
    column(qb: SelectQueryBuilder<any>, alias: string, field: string, locale?: string): string;
    /** Сортування за перекладеним полем; працює разом із skip/take. Додає ORDER BY (як addOrderBy). */
    orderBy(qb: SelectQueryBuilder<any>, alias: string, field: string, direction?: 'ASC' | 'DESC', locale?: string): SelectQueryBuilder<any>;
    private collect;
}
