import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  OneToOne,
  JoinColumn
} from "typeorm";
import { Cinema } from "./Cinema";
import { Movie } from "./Movie";

@Entity()
@Unique(["multikinoId"])
export class Seance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  multikinoId: number;

  @Column()
  date: Date;

  @Column({ nullable: true })
  allSeatCount: number;

  @Column({ nullable: true })
  takenSeatCount: number;

  @OneToOne(type => Cinema)
  @JoinColumn()
  cinema: Cinema;

  @OneToOne(type => Movie)
  @JoinColumn()
  movie: Movie;
}
