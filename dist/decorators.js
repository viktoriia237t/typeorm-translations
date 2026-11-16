"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipTranslation = exports.Translatable = exports.TranslatableEntity = exports.SKIP_TRANSLATION_KEY = void 0;
exports.getTranslatableMeta = getTranslatableMeta;
require("reflect-metadata");
const ENTITY_KEY = Symbol('translations:entity');
const FIELDS_KEY = Symbol('translations:fields');
exports.SKIP_TRANSLATION_KEY = Symbol('translations:skip');
/** Клас: ключ, під яким переклади його записів лежать у таблиці translations. */
const TranslatableEntity = (key) => (target) => {
    Reflect.defineMetadata(ENTITY_KEY, key, target);
};
exports.TranslatableEntity = TranslatableEntity;
/** Поле, яке підміняється перекладом на мову запиту. */
const Translatable = () => (target, propertyKey) => {
    const ctor = target.constructor;
    const fields = Reflect.getOwnMetadata(FIELDS_KEY, ctor) ?? [...(Reflect.getMetadata(FIELDS_KEY, ctor) ?? [])];
    Reflect.defineMetadata(FIELDS_KEY, [...fields, String(propertyKey)], ctor);
};
exports.Translatable = Translatable;
/** Маршрут або контролер, відповіді якого лишаються без підстановки (наприклад, адмінка). */
const SkipTranslation = () => (target, key, descriptor) => {
    Reflect.defineMetadata(exports.SKIP_TRANSLATION_KEY, true, descriptor?.value ?? target);
};
exports.SkipTranslation = SkipTranslation;
function getTranslatableMeta(target) {
    const ctor = target.constructor;
    const entity = Reflect.getMetadata(ENTITY_KEY, ctor);
    const fields = Reflect.getMetadata(FIELDS_KEY, ctor);
    return entity && fields?.length ? { entity, fields } : null;
}
//# sourceMappingURL=decorators.js.map