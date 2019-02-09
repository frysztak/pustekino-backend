import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Unique,
  JoinColumn,
  ManyToOne
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

  @Column({ nullable: true })
  seatAvailability: number;

  @ManyToOne(type => Cinema)
  @JoinColumn()
  cinema: Cinema;

  @ManyToOne(type => Movie)
  @JoinColumn()
  movie: Movie;
}
