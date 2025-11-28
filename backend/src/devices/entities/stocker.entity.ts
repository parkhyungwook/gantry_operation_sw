import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { HardwareProfile } from "./hardware-profile.entity";

@Entity("stockers")
@Unique(["profileId", "no"])
export class Stocker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  profileId: number;

  @Column()
  no: number; // 1~4

  @Column()
  name: string;

  @Column({ nullable: true })
  type?: string;

  @ManyToOne(() => HardwareProfile, (profile) => profile.stockers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profileId" })
  profile: HardwareProfile;
}
