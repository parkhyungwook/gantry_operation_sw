import { Entity, Column, PrimaryColumn } from "typeorm";
import { PlcValue } from "../plc.types";

/**
 * TagCache: Tag별로 캐시된 값 저장
 */
@Entity("tag_cache")
export class TagCache {
  @PrimaryColumn()
  key: string; // Tag key

  @Column({ type: "simple-json" })
  value: PlcValue; // 최근 값

  @Column({ type: "timestamptz" })
  timestamp: Date; // 갱신 시각

  @Column({ nullable: true })
  error?: string; // 오류 메시지
}
