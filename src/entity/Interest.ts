import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToOne, JoinColumn } from "typeorm";
import { Movie } from "./Movie";
import { Cinema } from "./Cinema";

@Entity()
export class Interest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @OneToOne(type => Movie)
    @JoinColumn()
    movie: Movie;

    @OneToOne(type => Cinema)
    @JoinColumn()
    cinema: Cinema;
}