import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { DataSet } from "./data-set.entity";

/**
 * Tag: DataSet 내부의 개별 데이터 정의
 * 예: "x_servo_position" = D1000+0 (offset 0)
 */
@Entity("tags")
export class Tag {
  @PrimaryColumn()
  key: string; // 고정된 태그 이름 (예: "x_servo_position")

  @Column()
  description: string; // 설명 (예: "X축 서보 위치")

  @Column()
  dataSetId: number; // 어느 DataSet에 속하는지

  @Column()
  offset: number; // DataSet 시작 주소로부터의 오프셋 (워드 단위)

  @Column()
  dataType: string; // int16, int32, real, string, bool

  @Column({ default: 1 })
  wordLength: number; // 차지하는 워드 수 (int16=1, int32=2, real=2, string=N)

  @Column({ nullable: true })
  bitPosition?: number; // bool 타입일 때 비트 위치 (0-15)

  @ManyToOne(() => DataSet, (dataSet) => dataSet.tags, { onDelete: "CASCADE" })
  @JoinColumn({ name: "dataSetId" })
  dataSet: DataSet;
}
