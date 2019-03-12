import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(["multikinoId"])
export class Cinema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chain: string;

  @Column()
  name: string;

  @Column()
  multikinoId: number;

  @Column()
  latitude: number;

  @Column()
  longitude: number;
}
