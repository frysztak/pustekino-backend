import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToOne, JoinColumn } from "typeorm";
import { Cinema } from "./Cinema";
import { Movie } from "./Movie";
import { Room } from "./Room";

@Entity()
@Unique(["multikinoId"])
export class Seance {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    multikinoId: number;

    @Column()
    date: Date;

    @Column()
    allSeatCount: number;

    @Column()
    takenSeatCount: number;

    @OneToOne(type => Cinema)
    @JoinColumn()
    cinema: Cinema;

    @OneToOne(type => Movie)
    @JoinColumn()
    movie: Movie;

    @OneToOne(type => Room)
    @JoinColumn()
    room: Room;
}