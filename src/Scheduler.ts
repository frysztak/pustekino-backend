import schedule from "node-schedule";
import { Connection } from "typeorm";
import { CinemaScraper } from "./scraper/CinemaScraper";
import { Cinema } from "./entity/Cinema";
import { Movie } from "./entity/Movie";
import { Seance } from "./entity/Seance";

export class Scheduler {
  private dbConnection: Connection;
  private scraper: CinemaScraper;

  constructor(connection: Connection, scraper: CinemaScraper) {
    this.dbConnection = connection;
    this.scraper = scraper;
  }

  private async scrapeCurrentMovies(cinema: Cinema) {
    try {
      console.log(`Starting to get currently shown movies @ ${cinema.name}`);

      const currentlyShownMovies = await this.scraper.getCurrentlyShownMovies(
        cinema.multikinoId
      );

      await this.dbConnection
        .createQueryBuilder()
        .insert()
        .orIgnore()
        .into(Movie)
        .values(currentlyShownMovies)
        .execute();

      console.log(
        `Finished getting currently shown movies @ ${cinema.name}. Received ${
          currentlyShownMovies.length
        } movies.`
      );
    } catch (err) {
      console.log(
        `Getting currently shown movies @ ${cinema.name} failed: ${err}`
      );
    }
  }

  private async scrapeSeances(cinema: Cinema, movie: Movie) {
    try {
      console.log(
        `Starting to get seances of ${movie.title_pl} @ ${cinema.name}`
      );

      const seances = await this.scraper.getSeances(cinema, movie);

      await this.dbConnection
        .createQueryBuilder()
        .insert()
        .orIgnore()
        .into(Seance)
        .values(seances)
        .execute();

      console.log(
        `Finished getting seances of ${movie.title_pl} @ ${
          cinema.name
        }. Received ${seances.length} seances.`
      );
    } catch (err) {
      console.log(
        `Getting seances of ${movie.title_pl} @ ${cinema.name} failed: ${err}`
      );
    }
  }

  async start() {
    const cinemaRepo = this.dbConnection.getRepository(Cinema);
    const wroclawCinema = await cinemaRepo.findOne({
      where: { multikinoId: 18 }
    });

    schedule.scheduleJob(
      //{ hour: 1, minute: 0 },
      { minute: 28 },
      async () => {
        //await this.scrapeCurrentMovies(wroclawCinema);

        const moviesRepo = this.dbConnection.getRepository(Movie);
        const movies = await moviesRepo.find();
        for (const movie of movies) {
          await this.scrapeSeances(wroclawCinema, movie);
        }
        //await Promise.all(
        //  movies.map(m => this.scrapeSeances(wroclawCinema, m))
        //);
      }
    );
  }
}
