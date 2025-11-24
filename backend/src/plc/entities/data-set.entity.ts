import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { Tag } from "./tag.entity";

/**
 * DataSet: PLC에서 한 번에 읽어오는 데이터 블록
 * 예: D1000~D1099 (100개 워드)를 100ms마다 폴링
 */
@Entity("data_sets")
export class DataSet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string; // "고속 센서 데이터", "저속 제어 데이터" 등

  @Column({ length: 1 })
  addressType: string; // D, R, M, X, Y

  @Column()
  startAddress: number; // 시작 주소 (예: 1000)

  @Column()
  length: number; // 워드 개수 (예: 100)

  @Column({ default: 1000 })
  pollingInterval: number; // 폴링 주기 (ms)

  @Column({ default: true })
  enabled: boolean; // 활성화 여부

  @OneToMany(() => Tag, (tag) => tag.dataSet)
  tags: Tag[];
}
