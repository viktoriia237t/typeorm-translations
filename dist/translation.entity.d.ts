/**
 * Один переклад одного поля одного запису. Додавання мови — це нові рядки,
 * а не нові колонки чи міграції.
 */
export declare class Translation {
    id: string;
    /** Ключ сутності з @TranslatableEntity. */
    entity: string;
    /** Рядок, бо id сутностей бувають і uuid, і int. */
    entity_id: string;
    field: string;
    locale: string;
    value: string;
}
