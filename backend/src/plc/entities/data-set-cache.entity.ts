import { Entity, Column, PrimaryColumn } from "typeorm";

@Entity("data_sets_cache")
export class DataSetCache {
  @PrimaryColumn()
  dataSetId: number;

  @Column({ type: "integer", default: 0 })
  length: number;

  @Column({ type: "simple-array" })
  values: number[];

  @Column({ type: "timestamptz" })
  timestamp: Date;

  @Column({ nullable: true })
  error?: string;
}
