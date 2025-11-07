import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('data_points')
export class DataPoint {
  @PrimaryColumn()
  key: string;

  @Column()
  description: string;

  @Column({ length: 1 })
  addressType: string; // 'D', 'R', 'M', 'X', 'Y' 등

  @Column('int')
  address: number;

  @Column('int')
  length: number; // number 타입: 워드 수, string 타입: 문자 수

  @Column({ nullable: true })
  bit?: number; // bool 타입일 때 사용할 비트 위치 (0-15)

  @Column()
  type: 'number' | 'string' | 'bool';
}
