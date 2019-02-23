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

  private async scrapeCurrentMovies(cinema: Cinema) {
    try {
      console.log(`Starting to get currently shown movies @ ${cinema.name}`);

      const currentlyShownMovies = await this.scraper.getCurrentlyShownMovies(
        cinema.multikinoId
      );

      await this.dbConnection.transaction(async transactionalEntityManager => {
        for (const movie of currentlyShownMovies) {
          await transactionalEntityManager
            .createQueryBuilder()
            .update(Movie)
            .set({
              release_date: movie.release_date,
              poster_large_url: movie.poster_large_url,
              hero_url: movie.hero_url,
              directors: movie.directors,
              actors: movie.actors,
              country: movie.country
            })
            .where("multikinoId = :movieId", { movieId: movie.multikinoId })
            .execute();
        }
      });
      /*
      await this.dbConnection
        .createQueryBuilder()
        .update(Movie)
        .set({
          
        })
        .values(currentlyShownMovies)
        .execute();
        */

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
          takenSeatCount: seanceData.nTakenSeats,
          seatAvailability: seanceData.availability
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
  }
}
