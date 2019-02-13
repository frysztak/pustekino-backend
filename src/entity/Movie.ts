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

  @Column({ nullable: true })
  title_eng: string;

  @Column()
  currently_shown: boolean;

  @Column()
  poster_url: string;

  @Column({ default: "" })
  poster_large_url: string;

  @Column()
  description_pl: string;

  @Column("text", { array: true })
  genres: string[];

  @Column()
  runtime: number;

  @Column({ default: "" })
  hero_url: string;

  @Column({ nullable: true })
  hero_url_desktop: string;

  @Column({ nullable: true })
  hero_url_mobile: string;

  @Column("text", { array: true })
  preview_image_urls: string[];

  @Column("text", { array: true, default: "{}" })
  directors: string[];

  @Column("text", { array: true, default: "{}" })
  actors: string[];

  @Column({ default: "" })
  country: string;
}
