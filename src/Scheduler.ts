import schedule from "node-schedule";
import { Connection, MoreThan } from "typeorm";
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

  private async scrapeCurrentMovies(cinemas: Cinema[]) {
    try {
      console.log(
        `Starting to get currently shown movies @ ${cinemas.length} cinemas`
      );

      const movies = await this.scraper.getCurrentlyShownMovies(
        cinemas.map(c => c.multikinoId)
      );

      if (movies.length === 0) {
        console.log(`Received 0 currently shown movies`);
        return;
      }

      await this.dbConnection
        .createQueryBuilder()
        .insert()
        .orIgnore()
        .into(Movie)
        .values(movies)
        .execute();

      console.log(
        `Finished getting currently shown movies @ ${
          cinemas.length
        } cinemas. Received ${movies.length} movies.`
      );
    } catch (err) {
      console.log(
        `Getting currently shown movies @ ${
          cinemas.length
        } cinemas failed: ${err}`
      );
    }
  }

  private async scrapeSeances(cinema: Cinema, movie: Movie) {
    try {
      console.log(
        `Starting to get seances of ${movie.title_pl} @ ${cinema.name}`
      );

      const seances = await this.scraper.getSeances(cinema, movie);
      if (seances.length === 0) {
        console.log(
          `Finished getting seances of ${movie.title_pl} @ ${
            cinema.name
          }. Received ${seances.length} seances.`
        );
        return;
      }

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
      if (heroImages.length === 0) {
        console.log(`Received ${heroImages.length} hero images`);
        return;
      }

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
      if (!seanceData) {
        console.log(`Failed to receive seance data for ID ${seanceId}`);
        return;
      }

      await this.dbConnection
        .createQueryBuilder()
        .update(Seance)
        .set({
          allSeatCount: seanceData.nAllSeats,
          takenSeatCount: seanceData.nTakenSeats,
          seatAvailability: seanceData.availability,
          seatAvailabilityLastCheck: moment.utc().toDate()
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
    const seances = await seanceRepo.find({
      date: MoreThan(moment().toDate())
    });

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

  private async markMoviesWithoutSeances() {
    try {
      console.log("Starting to mark movies without seances");

      const seanceRepo = this.dbConnection.getRepository(Seance);
      const usedMovies = await seanceRepo
        .createQueryBuilder("seance")
        .select("DISTINCT movie.multikinoId")
        .where("movie.currently_shown = true")
        .andWhere("seance.date >= :now", { now: moment.utc().toDate() })
        .leftJoin("seance.movie", "movie")
        .getRawMany();
      const usedMoviesIds = usedMovies.map(m => m.multikinoId);

      const movieRepo = this.dbConnection.getRepository(Movie);
      const existingMovies = await movieRepo.find();

      const movieIdsNotShownAnymore = existingMovies
        .map(m => m.multikinoId)
        .filter(m => !usedMoviesIds.includes(m));

      await this.dbConnection.transaction(async transactionalEntityManager => {
        for (const multikinoId of movieIdsNotShownAnymore) {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(Movie)
            .set({ currently_shown: false })
            .where("multikinoId = :movieId", { movieId: multikinoId })
            .execute();
        }
      });

      console.log(`Marked ${movieIdsNotShownAnymore.length} movies in DB`);
    } catch (err) {
      console.log(`Marking movies without seances failed: ${err}`);
    }
  }

  async start() {
    const cinemaRepo = this.dbConnection.getRepository(Cinema);
    const allCinemas = await cinemaRepo.find();

    const job = schedule.scheduleJob({ hour: 1 }, async () => {
      console.log("Starting scraping...");
      await this.scrapeCurrentMovies(allCinemas);

      const moviesRepo = this.dbConnection.getRepository(Movie);
      const movies = await moviesRepo.find();
      for (const cinema of allCinemas) {
        await Promise.all(movies.map(m => this.scrapeSeances(cinema, m)));
      }
      await this.scrapeHeroImages();

      await this.markMoviesWithoutSeances();
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

    await this.scheduleSeanceTasks();
  }
}
