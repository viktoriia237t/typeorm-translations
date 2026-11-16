import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken, InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from 'typeorm';
import {
  createTranslationsTable,
  dropTranslationsTable,
  SkipTranslation,
  Translatable,
  TranslatableEntity,
  Translation,
  TranslationsModule,
  TranslationsService,
} from '../src';

// Наскрізна перевірка на справжньому Postgres: TRANSLATIONS_TEST_DATABASE_URL=postgres://…
const url = process.env.TRANSLATIONS_TEST_DATABASE_URL;
const describeDb = url ? describe : describe.skip;

@TranslatableEntity('item')
@Entity('items')
class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Translatable()
  @Column()
  name: string;

  @Column({ default: 'red' })
  color: string;
}

@Controller('items')
class ItemsController {
  constructor(@InjectRepository(Item) private readonly repo: Repository<Item>) {}

  @Get()
  list() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  @Get('wrapped')
  async wrapped() {
    return { data: await this.repo.find({ order: { id: 'ASC' } }), total: 2 };
  }

  @SkipTranslation()
  @Get('raw')
  raw() {
    return this.repo.find({ order: { id: 'ASC' } });
  }
}

describeDb('translations end to end', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({ type: 'postgres', url, entities: [Item, Translation], synchronize: true, dropSchema: true }),
        TypeOrmModule.forFeature([Item]),
        TranslationsModule.forRoot({ defaultLocale: 'uk', locales: ['uk', 'en'] }),
      ],
      controllers: [ItemsController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const items = moduleRef.get<Repository<Item>>(getRepositoryToken(Item));
    const [apple] = await items.save([items.create({ name: 'яблуко' }), items.create({ name: 'груша' })]);
    await app.get(TranslationsService).set('item', apple.id, 'en', { name: 'apple' });
  });

  afterAll(() => app.close());

  const names = (res: request.Response, key?: string) => (key ? res.body[key] : res.body).map((i: any) => i.name);

  it('returns the default language without a header', async () => {
    expect(names(await request(app.getHttpServer()).get('/items'))).toEqual(['яблуко', 'груша']);
  });

  it('substitutes by Accept-Language and falls back when a translation is missing', async () => {
    const res = await request(app.getHttpServer()).get('/items').set('Accept-Language', 'en-US,en;q=0.9');
    expect(names(res)).toEqual(['apple', 'груша']);
    expect(res.body[0].color).toBe('red');
  });

  it('substitutes by ?lang and lets it win over the header', async () => {
    const res = await request(app.getHttpServer()).get('/items?lang=en').set('Accept-Language', 'uk');
    expect(names(res)).toEqual(['apple', 'груша']);
  });

  it('treats an unsupported language as the default', async () => {
    const res = await request(app.getHttpServer()).get('/items').set('Accept-Language', 'de');
    expect(names(res)).toEqual(['яблуко', 'груша']);
  });

  it('works inside wrapped responses', async () => {
    const res = await request(app.getHttpServer()).get('/items/wrapped?lang=en');
    expect(names(res, 'data')).toEqual(['apple', 'груша']);
  });

  it('leaves @SkipTranslation() routes untouched', async () => {
    const res = await request(app.getHttpServer()).get('/items/raw?lang=en');
    expect(names(res)).toEqual(['яблуко', 'груша']);
  });
});

describeDb('forRootAsync', () => {
  it('reads options from a factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({ type: 'postgres', url, entities: [Item, Translation], synchronize: true, dropSchema: true }),
        TypeOrmModule.forFeature([Item]),
        TranslationsModule.forRootAsync({
          useFactory: async () => ({ defaultLocale: 'en', locales: ['uk'], queryParam: 'locale' }),
        }),
      ],
      controllers: [ItemsController],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    const items = moduleRef.get<Repository<Item>>(getRepositoryToken(Item));
    const saved = await items.save(items.create({ name: 'apple' }));
    await app.get(TranslationsService).set('item', saved.id, 'uk', { name: 'яблуко' });

    const server = app.getHttpServer();
    expect((await request(server).get('/items')).body[0].name).toBe('apple');
    expect((await request(server).get('/items?locale=uk')).body[0].name).toBe('яблуко');
    expect((await request(server).get('/items?lang=uk')).body[0].name).toBe('apple');

    await app.close();
  });
});

describeDb('migration helpers', () => {
  it('create and drop the translations table', async () => {
    const dataSource = new DataSource({ type: 'postgres', url });
    await dataSource.initialize();
    const runner = dataSource.createQueryRunner();
    try {
      await runner.query('DROP TABLE IF EXISTS "translations"');
      await createTranslationsTable(runner);
      expect(await runner.hasTable('translations')).toBe(true);
      await runner.query(
        `INSERT INTO "translations" ("entity", "entity_id", "field", "locale", "value") VALUES ('a', '1', 'name', 'en', 'x')`,
      );
      await expect(
        runner.query(
          `INSERT INTO "translations" ("entity", "entity_id", "field", "locale", "value") VALUES ('a', '1', 'name', 'en', 'y')`,
        ),
      ).rejects.toThrow(/UQ_translations_entity_field_locale/);
      await dropTranslationsTable(runner);
      expect(await runner.hasTable('translations')).toBe(false);
    } finally {
      await runner.release();
      await dataSource.destroy();
    }
  });
});

describeDb('column() for filtering and sorting', () => {
  let app: INestApplication;
  let items: Repository<Item>;
  let translations: TranslationsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({ type: 'postgres', url, entities: [Item, Translation], synchronize: true, dropSchema: true }),
        TypeOrmModule.forFeature([Item]),
        TranslationsModule.forRoot({ defaultLocale: 'uk', locales: ['uk', 'en'] }),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    items = moduleRef.get<Repository<Item>>(getRepositoryToken(Item));
    translations = app.get(TranslationsService);

    const [apple, pear, milk] = await items.save([
      items.create({ name: 'яблуко' }),
      items.create({ name: 'груша' }),
      items.create({ name: 'молоко' }),
    ]);
    await translations.set('item', apple.id, 'en', { name: 'apple' });
    await translations.set('item', milk.id, 'en', { name: 'milk' });
    void pear; // без перекладу: лишається 'груша'
  });

  afterAll(() => app.close());

  const sorted = (locale: string) => {
    const qb = items.createQueryBuilder('i');
    return translations.orderBy(qb, 'i', 'name', 'ASC', locale).getMany();
  };

  it('sorts by the translated value, falling back to the base one', async () => {
    expect((await sorted('en')).map((i) => i.name)).toEqual(['яблуко', 'молоко', 'груша']); // apple, milk, груша: латиниця перед кирилицею
  });

  it('sorts by the base column for the default locale', async () => {
    expect((await sorted('uk')).map((i) => i.name)).toEqual(['груша', 'молоко', 'яблуко']);
  });

  it('filters by the translated value and by the fallback', async () => {
    const qb = items.createQueryBuilder('i');
    const found = await qb.where(`${translations.column(qb, 'i', 'name', 'en')} ILIKE :q`, { q: '%l%' }).getMany();
    expect(found.map((i) => i.name)).toEqual(['яблуко', 'молоко']); // apple, milk; 'груша' без перекладу не містить l
  });

  it('reuses one join when called twice and does not duplicate rows', async () => {
    const qb = items.createQueryBuilder('i');
    const a = translations.column(qb, 'i', 'name', 'en');
    const b = translations.column(qb, 'i', 'name', 'en');
    expect(a).toBe(b);
    expect(await qb.where(`${a} IS NOT NULL`).andWhere(`${b} <> ''`).getCount()).toBe(3);
  });

  it('works with pagination', async () => {
    const qb = items.createQueryBuilder('i');
    const page = await translations.orderBy(qb, 'i', 'name', 'ASC', 'en').skip(1).take(1).getMany();
    expect(page.map((i) => i.name)).toEqual(['молоко']);
  });

  it('rejects fields that are not translatable', () => {
    const qb = items.createQueryBuilder('i');
    expect(() => translations.column(qb, 'i', 'color', 'en')).toThrow(/not a @Translatable/);
  });
});
