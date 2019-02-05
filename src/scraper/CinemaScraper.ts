import { Movie } from "../entity/Movie";

export abstract class CinemaScraper {
    abstract async getCurrentlyShownMovies(cinemaId: number): Promise<Movie[]>
}