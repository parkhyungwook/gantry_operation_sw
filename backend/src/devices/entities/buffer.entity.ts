import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { HardwareProfile } from "./hardware-profile.entity";

@Entity("buffers")
@Unique(["profileId", "no"])
export class BufferUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  profileId: number;

  @Column()
  no: number; // 1~4

  @Column({ nullable: true })
  name?: string;

  @Column({ default: false })
  exists: boolean;

  @ManyToOne(() => HardwareProfile, (profile) => profile.buffers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profileId" })
  profile: HardwareProfile;
}
