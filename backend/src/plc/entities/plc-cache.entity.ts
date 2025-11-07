import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('plc_cache')
export class PlcCache {
  @PrimaryColumn()
  key: string;

  @Column('simple-json')
  value: number[] | string | boolean;

  @UpdateDateColumn()
  timestamp: Date;

  @Column({ nullable: true })
  error?: string;
}
