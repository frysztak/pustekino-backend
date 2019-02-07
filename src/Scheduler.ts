import schedule from "node-schedule";
import { Connection } from "typeorm";
import { CinemaScraper } from "./scraper/CinemaScraper";
import { Cinema } from "./entity/Cinema";
import { Movie } from "./entity/Movie";
import { Seance } from "./entity/Seance";
import moment = require("moment");

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

  private async scrapeHeroImages() {
    try {
      console.log(`Starting to get hero images`);

      const heroImages = await this.scraper.getHeroImages();

      await this.dbConnection.transaction(async transactionalEntityManager => {
        for (const heroImage of heroImages) {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(Movie)
            .set({
              hero_url_desktop: heroImage.hero_desktop,
              hero_url_mobile: heroImage.hero_mobile
            })
            .where("multikinoId = :movieId", { movieId: heroImage.movieId })
            .execute();
        }
      });

      console.log(`Received ${heroImages.length} hero images`);
    } catch (err) {
      console.log(`Failed to get hero images: ${err}`);
    }
  }

  private async scrapeSeanceData(seanceId: number) {
    try {
      console.log(`Getting seance data: ${seanceId}`);
      const seanceData = await this.scraper.getSeanceData(seanceId);
      await this.dbConnection
        .createQueryBuilder()
        .update(Seance)
        .set({
          allSeatCount: seanceData.nAllSeats,
          takenSeatCount: seanceData.nTakenSeats
        })
        .where("multikinoId = :seanceId", { seanceId: seanceData.seanceId })
        .execute();
      console.log(`Finished getting seance data: ${seanceId}`);
    } catch (err) {
      console.log(`Failed to get seance data: ${err}`);
    }
  }

  private async scheduleSeanceTasks() {
    const seanceRepo = this.dbConnection.getRepository(Seance);
    const seances = await seanceRepo.find();

    for (const seance of seances) {
      const jobName = seance.multikinoId.toString();
      const job = schedule.scheduledJobs[jobName];
      if (job) continue;

      const date = moment(seance.date)
        .subtract(10, "minutes")
        .toDate();
      schedule.scheduleJob(jobName, date, () =>
        this.scrapeSeanceData(seance.multikinoId)
      );
    }
  }

  async start() {
    const cinemaRepo = this.dbConnection.getRepository(Cinema);
    const wroclawCinema = await cinemaRepo.findOne({
      where: { multikinoId: 18 }
    });

    const job = schedule.scheduleJob({ hour: 1 }, async () => {
      console.log("Starting scraping...");
      await this.scrapeCurrentMovies(wroclawCinema);

      const moviesRepo = this.dbConnection.getRepository(Movie);
      const movies = await moviesRepo.find();
      await Promise.all(movies.map(m => this.scrapeSeances(wroclawCinema, m)));

      await this.scrapeHeroImages();
      await this.scheduleSeanceTasks();
      console.log(
        `Finished scraping... ${
          Object.keys(schedule.scheduledJobs).length
        } jobs are scheduled.`
      );
    });

    if (process.env.NODE_ENV !== "production") {
      job.invoke();
    }
  }
}
