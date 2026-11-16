# typeorm-translations

Database-backed translations for NestJS + TypeORM (PostgreSQL).

Entities keep their base columns (`name`, `description`, …) in the default language. Other languages live as rows in one `translations` table, so adding a language needs no migration. The module reads the language from `?lang=` or `Accept-Language` and swaps the translated fields in every response automatically. Clients just read `name`.

- one query per entity type per response (no N+1, no joins in your queries)
- falls back to the stored value when a translation is missing
- `en-US,en;q=0.9` → `en`, `q`-values respected, unsupported languages fall back to the default
- works for nested and wrapped responses (`{ data: [...], total }`)
- `@SkipTranslation()` for routes that need the raw values (admin)

## Install

```bash
pnpm add typeorm-translations
```

Peer dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/typeorm`, `typeorm`, `rxjs`, `reflect-metadata`.

## Setup

```ts
// app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    TranslationsModule.forRoot({ defaultLocale: 'uk', locales: ['uk', 'en'] }),
  ],
})
export class AppModule {}
```

`forRootAsync({ imports, inject, useFactory })` works too. By default the module registers `LocaleMiddleware` on all routes and `TranslateInterceptor` globally; pass `{ registerMiddleware: false }` / `{ registerInterceptor: false }` (second argument of `forRoot`, or fields of `forRootAsync`) to wire them yourself.

Mark entities and fields:

```ts
@TranslatableEntity('product')   // key used in the translations table
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Translatable() @Column() name: string;          // base value in the default language
  @Translatable() @Column({ nullable: true }) description?: string;
}
```

Add `Translation` to your TypeORM `entities` (and to your migration data source) and create the table in a migration:

```ts
import { createTranslationsTable, dropTranslationsTable } from 'typeorm-translations';

export class CreateTranslations1700000000000 implements MigrationInterface {
  up = (q: QueryRunner) => createTranslationsTable(q);   // Postgres 13+ (gen_random_uuid)
  down = (q: QueryRunner) => dropTranslationsTable(q);
}
```

## Usage

```
GET /products                       → names in the default language
GET /products?lang=en               → names in English
GET /products  Accept-Language: en-US,en;q=0.9
```

Write translations with `TranslationsService`:

```ts
await translations.set('product', product.id, 'en', { name: 'Carrot', description: 'A root vegetable' });
await translations.set('product', product.id, 'en', { description: null });   // null / '' removes it
await translations.get('product', product.id);   // { name: { en: 'Carrot' }, ... } for admin forms
```

Translate values yourself (plain objects built in services are not seen by the interceptor, only entity instances are):

```ts
await translations.translate(payload);               // current request's language
await translations.translate(payload, 'en');
```

Skip the substitution:

```ts
@SkipTranslation()
@Get('admin/products')
list() { return this.repo.find(); }   // always the base values
```

## Filtering and sorting

Translations live in their own table, so filtering and sorting need a join. `column()` adds it (once per field and locale) and returns a `COALESCE(translation, base value)` expression, so rows without a translation fall back to the base value:

```ts
const qb = repo.createQueryBuilder('p');
qb.where(`${translations.column(qb, 'p', 'name')} ILIKE :q`, { q: '%milk%' });
translations.orderBy(qb, 'p', 'name', 'ASC');   // also fine with skip() / take()
const products = await qb.skip(0).take(20).getMany();
```

The locale is the current request's; pass one as the last argument to override it. For the default locale both helpers use the plain column and add no join. Postgres only (ids are compared as `varchar`).

## Options

| option | default | |
|---|---|---|
| `defaultLocale` | required | language of the base columns, also the fallback |
| `locales` | required | supported languages (the default is added if missing) |
| `queryParam` | `lang` | query parameter that wins over `Accept-Language` |

## Notes

- Only entity **instances** are translated. Objects you build by hand (`{ name: p.name }`) are left alone: call `translate()` on the entity before mapping.
- Substitution mutates the entity instances in the response. Don't `save()` an entity after it went through `translate()`.

## How it differs from other packages

`nestjs-translatable` and `@nestbolt/translatable` keep every language in a JSON column (`{"en": "...", "uk": "..."}`) on the entity itself. This package uses one shared `translations` table instead (`entity`, `entity_id`, `field`, `locale`, `value`):

- adding a language adds rows, not columns or migrations, and existing columns stay as they are (the base column keeps the default language);
- no JSON columns and no per-entity translation classes (`typeorm-translatable`);
- trade-off: Postgres only, and filtering or sorting goes through a join (see above) rather than a JSON expression.

## License

MIT

## Development

```bash
pnpm install
pnpm test
TRANSLATIONS_TEST_DATABASE_URL=postgres://user:pw@localhost:5432/db pnpm test   # also runs the end-to-end tests
pnpm build
```
