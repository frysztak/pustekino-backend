import { Movie } from "../entity/Movie";
import { Seance } from "../entity/Seance";
import { Cinema } from "../entity/Cinema";

export abstract class CinemaScraper {
    abstract async getCurrentlyShownMovies(cinemaId: number): Promise<Movie[]>
    abstract async getSeances(cinema: Cinema, movie: Movie): Promise<Seance[]>
}