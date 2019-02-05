import { Movie } from "../entity/Movie";
import { Seance } from "../entity/Seance";

export abstract class CinemaScraper {
    abstract async getCurrentlyShownMovies(cinemaId: number): Promise<Movie[]>
    abstract async getSeances(cinemaId: number, movieId: number): Promise<Seance[]>
}