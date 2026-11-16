import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Один переклад одного поля одного запису. Додавання мови — це нові рядки,
 * а не нові колонки чи міграції.
 */
@Entity('translations')
@Index('UQ_translations_entity_field_locale', ['entity', 'entity_id', 'field', 'locale'], { unique: true })
@Index('IDX_translations_entity_locale', ['entity', 'locale'])
export class Translation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Ключ сутності з @TranslatableEntity. */
  @Column({ type: 'varchar', length: 50 })
  entity: string;

  /** Рядок, бо id сутностей бувають і uuid, і int. */
  @Column({ type: 'varchar', length: 36 })
  entity_id: string;

  @Column({ type: 'varchar', length: 50 })
  field: string;

  @Column({ type: 'varchar', length: 10 })
  locale: string;

  @Column({ type: 'text' })
  value: string;
}
