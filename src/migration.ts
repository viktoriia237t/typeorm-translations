import { QueryRunner } from 'typeorm';

/**
 * Для міграції споживача:
 *
 *   up:   await createTranslationsTable(queryRunner);
 *   down: await dropTranslationsTable(queryRunner);
 *
 * Потрібен Postgres 13+ (gen_random_uuid).
 */
export async function createTranslationsTable(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(
    `CREATE TABLE "translations" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "entity" character varying(50) NOT NULL,
      "entity_id" character varying(36) NOT NULL,
      "field" character varying(50) NOT NULL,
      "locale" character varying(10) NOT NULL,
      "value" text NOT NULL,
      CONSTRAINT "PK_translations_id" PRIMARY KEY ("id")
    )`,
  );
  await queryRunner.query(
    `CREATE UNIQUE INDEX "UQ_translations_entity_field_locale" ON "translations" ("entity", "entity_id", "field", "locale")`,
  );
  await queryRunner.query(`CREATE INDEX "IDX_translations_entity_locale" ON "translations" ("entity", "locale")`);
}

export async function dropTranslationsTable(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`DROP INDEX "IDX_translations_entity_locale"`);
  await queryRunner.query(`DROP INDEX "UQ_translations_entity_field_locale"`);
  await queryRunner.query(`DROP TABLE "translations"`);
}
