import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { HardwareProfile } from "./hardware-profile.entity";

@Entity("chutes")
@Unique(["profileId", "no"])
export class Chute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  profileId: number;

  @Column()
  no: number; // 1~5

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  exists: boolean;

  @ManyToOne(() => HardwareProfile, (profile) => profile.chutes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profileId" })
  profile: HardwareProfile;
}
