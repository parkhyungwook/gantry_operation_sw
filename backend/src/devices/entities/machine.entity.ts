import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { HardwareProfile } from "./hardware-profile.entity";

@Entity("machines")
@Unique(["profileId", "no"])
export class Machine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  profileId: number;

  @Column()
  no: number; // 1~5

  @Column()
  name: string;

  @Column({ nullable: true })
  controller?: string;

  @Column({ nullable: true })
  host?: string;

  @Column({ nullable: true })
  port?: number;

  @Column({ nullable: true })
  type?: string;

  @ManyToOne(() => HardwareProfile, (profile) => profile.machines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "profileId" })
  profile: HardwareProfile;
}
