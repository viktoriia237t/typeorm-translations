import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import {
  resolveLocale,
  SkipTranslation,
  Translatable,
  TranslatableEntity,
  TranslateInterceptor,
  TranslationsService,
} from '../src';
import { resolveOptions } from '../src/translations.module';

const options = resolveOptions({ defaultLocale: 'uk', locales: ['en'] });

@TranslatableEntity('thing')
class Thing {
  id: string | number;
  @Translatable()
  name: string;
  @Translatable()
  description?: string;
  color?: string;
}

const thing = (id: string | number, name: string, description?: string) =>
  Object.assign(new Thing(), { id, name, description, color: '#fff' });

describe('resolveLocale', () => {
  it('reduces regional tags to the base language', () => {
    expect(resolveLocale(options, undefined, 'en-US,en;q=0.9')).toBe('en');
  });

  it('prefers the query parameter over the header', () => {
    expect(resolveLocale(options, 'en', 'uk')).toBe('en');
  });

  it('honours q-values and skips unsupported languages', () => {
    expect(resolveLocale(options, undefined, 'de,en;q=0.8,uk;q=0.5')).toBe('en');
    expect(resolveLocale(options, undefined, 'uk;q=0.3,en;q=0.9')).toBe('en');
  });

  it('keeps header order for equal q-values', () => {
    expect(resolveLocale(options, undefined, 'en,uk')).toBe('en');
    expect(resolveLocale(options, undefined, 'uk,en')).toBe('uk');
  });

  it('falls back to the default locale', () => {
    expect(resolveLocale(options, undefined, 'de')).toBe('uk');
    expect(resolveLocale(options, 'xx', undefined)).toBe('uk');
    expect(resolveLocale(options, undefined, undefined)).toBe('uk');
  });
});

describe('resolveOptions', () => {
  it('adds the default locale to the list and a default query parameter', () => {
    expect(resolveOptions({ defaultLocale: 'uk', locales: ['en'] })).toEqual({
      defaultLocale: 'uk',
      locales: ['uk', 'en'],
      queryParam: 'lang',
    });
  });
});

describe('TranslationsService', () => {
  const repo = { find: jest.fn(), delete: jest.fn(), upsert: jest.fn() };
  let service: TranslationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TranslationsService(repo as any, options);
  });

  it('does not query the database for the default locale', async () => {
    const items = [thing('1', 'яблуко')];
    await service.translate(items, 'uk');
    expect(repo.find).not.toHaveBeenCalled();
    expect(items[0].name).toBe('яблуко');
  });

  it('substitutes translated fields and keeps the original when a translation is missing', async () => {
    repo.find.mockResolvedValue([{ entity: 'thing', entity_id: '1', field: 'name', locale: 'en', value: 'apple' }]);
    const items = [thing('1', 'яблуко', 'фрукт'), thing('2', 'груша', 'фрукт')];

    await service.translate(items, 'en');

    expect(items[0].name).toBe('apple');
    expect(items[0].description).toBe('фрукт');
    expect(items[1].name).toBe('груша');
    expect(items[0].color).toBe('#fff');
  });

  it('loads every entity of a type with a single query, including nested ones', async () => {
    repo.find.mockResolvedValue([
      { entity: 'thing', entity_id: '1', field: 'name', locale: 'en', value: 'apple' },
      { entity: 'thing', entity_id: '7', field: 'name', locale: 'en', value: 'salt' },
    ]);
    const payload: any = { data: [{ ingredients: [{ product: thing('7', 'сіль') }] }, thing('1', 'яблуко')], total: 2 };

    await service.translate(payload, 'en');

    expect(repo.find).toHaveBeenCalledTimes(1);
    expect(payload.data[0].ingredients[0].product.name).toBe('salt');
    expect(payload.data[1].name).toBe('apple');
  });

  it('handles numeric ids and instances referenced twice', async () => {
    repo.find.mockResolvedValue([{ entity: 'thing', entity_id: '3', field: 'name', locale: 'en', value: 'gram' }]);
    const shared = thing(3, 'грам');

    await service.translate([shared, { again: shared }], 'en');

    expect(shared.name).toBe('gram');
  });

  it('leaves plain objects, dates and buffers alone', async () => {
    const plain = { id: '1', name: 'яблуко', at: new Date(), file: Buffer.from('x') };
    await service.translate(plain, 'en');
    expect(repo.find).not.toHaveBeenCalled();
    expect(plain.name).toBe('яблуко');
  });

  it('set() upserts values and removes empty ones', async () => {
    await service.set('thing', 5, 'en', { name: 'apple', description: '', color: undefined });
    expect(repo.upsert).toHaveBeenCalledWith(
      { entity: 'thing', entity_id: '5', field: 'name', locale: 'en', value: 'apple' },
      ['entity', 'entity_id', 'field', 'locale'],
    );
    expect(repo.delete).toHaveBeenCalledWith({ entity: 'thing', entity_id: '5', field: 'description', locale: 'en' });
  });

  it('get() groups translations by field and locale', async () => {
    repo.find.mockResolvedValue([
      { field: 'name', locale: 'en', value: 'apple' },
      { field: 'name', locale: 'de', value: 'Apfel' },
      { field: 'description', locale: 'en', value: 'fruit' },
    ]);
    expect(await service.get('thing', 1)).toEqual({
      name: { en: 'apple', de: 'Apfel' },
      description: { en: 'fruit' },
    });
  });
});

describe('TranslateInterceptor', () => {
  class Plain {
    open() {}
    @SkipTranslation()
    raw() {}
  }
  @SkipTranslation()
  class Skipped {
    any() {}
  }

  const context = (cls: any, method: string) =>
    ({ getHandler: () => cls.prototype[method], getClass: () => cls }) as any;

  it('translates the response', async () => {
    const translations = { translate: jest.fn(async (data) => data) };
    const interceptor = new TranslateInterceptor(translations as any, new Reflector());
    const result = await lastValueFrom(interceptor.intercept(context(Plain, 'open'), { handle: () => of({ ok: 1 }) }));
    expect(result).toEqual({ ok: 1 });
    expect(translations.translate).toHaveBeenCalledWith({ ok: 1 });
  });

  it('skips methods and classes marked with @SkipTranslation()', async () => {
    const translations = { translate: jest.fn() };
    const interceptor = new TranslateInterceptor(translations as any, new Reflector());
    await lastValueFrom(interceptor.intercept(context(Plain, 'raw'), { handle: () => of(1) }));
    await lastValueFrom(interceptor.intercept(context(Skipped, 'any'), { handle: () => of(1) }));
    expect(translations.translate).not.toHaveBeenCalled();
  });
});
