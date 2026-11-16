import 'reflect-metadata';

const ENTITY_KEY = Symbol('translations:entity');
const FIELDS_KEY = Symbol('translations:fields');
export const SKIP_TRANSLATION_KEY = Symbol('translations:skip');

/** Клас: ключ, під яким переклади його записів лежать у таблиці translations. */
export const TranslatableEntity =
  (key: string): ClassDecorator =>
  (target) => {
    Reflect.defineMetadata(ENTITY_KEY, key, target);
  };

/** Поле, яке підміняється перекладом на мову запиту. */
export const Translatable =
  (): PropertyDecorator =>
  (target, propertyKey) => {
    const ctor = target.constructor;
    const fields: string[] = Reflect.getOwnMetadata(FIELDS_KEY, ctor) ?? [...(Reflect.getMetadata(FIELDS_KEY, ctor) ?? [])];
    Reflect.defineMetadata(FIELDS_KEY, [...fields, String(propertyKey)], ctor);
  };

/** Маршрут або контролер, відповіді якого лишаються без підстановки (наприклад, адмінка). */
export const SkipTranslation = (): ClassDecorator & MethodDecorator => (target: any, key?: any, descriptor?: any) => {
  Reflect.defineMetadata(SKIP_TRANSLATION_KEY, true, descriptor?.value ?? target);
};

export interface TranslatableMeta {
  entity: string;
  fields: string[];
}

export function getTranslatableMeta(target: object): TranslatableMeta | null {
  const ctor = target.constructor;
  const entity: string | undefined = Reflect.getMetadata(ENTITY_KEY, ctor);
  const fields: string[] | undefined = Reflect.getMetadata(FIELDS_KEY, ctor);
  return entity && fields?.length ? { entity, fields } : null;
}
