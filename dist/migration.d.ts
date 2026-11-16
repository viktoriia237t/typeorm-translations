import { QueryRunner } from 'typeorm';
/**
 * Для міграції споживача:
 *
 *   up:   await createTranslationsTable(queryRunner);
 *   down: await dropTranslationsTable(queryRunner);
 *
 * Потрібен Postgres 13+ (gen_random_uuid).
 */
export declare function createTranslationsTable(queryRunner: QueryRunner): Promise<void>;
export declare function dropTranslationsTable(queryRunner: QueryRunner): Promise<void>;
