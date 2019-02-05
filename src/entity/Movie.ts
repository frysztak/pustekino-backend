import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(["multikinoId"])
export class Movie {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    multikinoId: number;

    @Column()
    name_pl: string;

    @Column()
    name_eng: string;

    @Column()
    poster_url: string;

    @Column()
    description_pl: string;

    @Column("text", { array: true })
    genres: string[];

    @Column()
    runtime: string;

    @Column("text", { array: true })
    images_desktop: string[];

    @Column("text", { array: true })
    images_mobile: string[];
}
