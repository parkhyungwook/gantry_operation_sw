import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_points')
export class DataPoint {
  @PrimaryColumn()
  key: string;

  @Column()
  description: string;

  @Column('int')
  device: number;

  @Column('int')
  address: number;

  @Column('int')
  count: number;

  @Column()
  type: 'number' | 'string';

  @Column({ nullable: true })
  encoding?: 'ascii' | 'utf16le';

  @Column('int', { nullable: true })
  maxChars?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
