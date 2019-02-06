import schedule from "node-schedule";
import { Connection } from "typeorm";
import { CinemaScraper } from "./scraper/CinemaScraper";
import { Cinema } from "./entity/Cinema";
import { Movie } from "./entity/Movie";

export class Scheduler {
  private dbConnection: Connection;
  private scraper: CinemaScraper;

  constructor(connection: Connection, scraper: CinemaScraper) {
    this.dbConnection = connection;
    this.scraper = scraper;
  }

  async start() {
    const cinemaRepo = this.dbConnection.getRepository(Cinema);
    const wroclawCinema = await cinemaRepo.findOne({
      where: { multikinoId: 18 }
    });

    schedule.scheduleJob(
      "scrapeCurrentMovies",
      { hour: 1, minute: 0 },
      async () => {
        try {
          console.log(
            `Starting to get currently shown movies @ ${wroclawCinema.name}`
          );

          const currentlyShownMovies = await this.scraper.getCurrentlyShownMovies(
            wroclawCinema.multikinoId
          );

          await this.dbConnection
            .createQueryBuilder()
            .insert()
            .into(Movie)
            .orIgnore()
            .values(currentlyShownMovies)
            .execute();

          console.log(
            `Finished getting currently shown movies @ ${wroclawCinema.name}`
          );
        } catch (err) {
          console.log(
            `Getting currently shown movies @ ${
              wroclawCinema.name
            } failed: ${err}`
          );
        }
      }
    );
  }
}
