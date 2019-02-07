import { Movie } from "../entity/Movie";
import { Seance } from "../entity/Seance";
import { Cinema } from "../entity/Cinema";

export type HeroImage = {
  movieId: number;
  hero_desktop: string;
  hero_mobile: string;
};

export type SeanceData = {
  seanceId: number;
  nAllSeats: number;
  nTakenSeats: number;
};

export abstract class CinemaScraper {
  abstract async getCurrentlyShownMovies(cinemaId: number): Promise<Movie[]>;
  abstract async getSeances(cinema: Cinema, movie: Movie): Promise<Seance[]>;
  abstract async getHeroImages(): Promise<HeroImage[]>;
  abstract async getSeanceData(seanceId: number): Promise<SeanceData>;
}
