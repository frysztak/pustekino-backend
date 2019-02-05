import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity()
@Unique(["multikinoId"])
export class Movie {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    multikinoId: number;

    @Column()
    title_pl: string;

    @Column()
    title_eng: string;

    @Column()
    poster_url: string;

    @Column()
    description_pl: string;

    @Column("text", { array: true })
    genres: string[];

    @Column()
    runtime: number;

    @Column()
    hero_url_desktop: string;

    @Column()
    hero_url_mobile: string;

    @Column("text", { array: true })
    preview_image_urls: string[];
}
