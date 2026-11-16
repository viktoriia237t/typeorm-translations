import 'reflect-metadata';
export declare const SKIP_TRANSLATION_KEY: unique symbol;
/** Клас: ключ, під яким переклади його записів лежать у таблиці translations. */
export declare const TranslatableEntity: (key: string) => ClassDecorator;
/** Поле, яке підміняється перекладом на мову запиту. */
export declare const Translatable: () => PropertyDecorator;
/** Маршрут або контролер, відповіді якого лишаються без підстановки (наприклад, адмінка). */
export declare const SkipTranslation: () => ClassDecorator & MethodDecorator;
export interface TranslatableMeta {
    entity: string;
    fields: string[];
}
export declare function getTranslatableMeta(target: object): TranslatableMeta | null;
