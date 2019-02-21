import { getRepository, MoreThan } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Seance } from "../entity/Seance";
import moment from "moment";
import { MultikinoScraper } from "../scraper/MultikinoScraper";

export interface Seances {
  movieId: number;
  cinemaId: number;
  today: Seance[];
  tomorrow: Seance[];
  later: Seance[][];
}

export class SeanceController {
  private seanceRepository = getRepository(Seance);
  private scraper = new MultikinoScraper();

  async all(request: Request, response: Response, next: NextFunction) {
    return this.seanceRepository.find();
  }

  private groupSeances(
    list: Seance[]
  ): Pick<Seances, "today" | "tomorrow" | "later"> {
    const now = moment();
    const tomorowDay = now.clone().add(1, "days");

    const today = list.filter(seance => moment(seance.date).isSame(now, "day"));
    const tomorrow = list.filter(seance =>
      moment(seance.date).isSame(tomorowDay, "day")
    );

    let later: Seance[][] = [];
    let date = tomorowDay.clone().add(1, "days");
    while (true) {
      const l = list.filter(seance => moment(seance.date).isSame(date, "day"));
      if (l.length === 0) break;

      later.push(l);
      date = date.clone().add(1, "days");
    }

    return {
      today: today,
      tomorrow: tomorrow,
      later: later
    };
  }

  async upcoming(request: Request, response: Response, next: NextFunction) {
    const movieId = parseInt(request.params.movieId);
    const cinemaId = parseInt(request.params.cinemaId);

    const seances = await this.seanceRepository
      .createQueryBuilder("seance")
      .select("seance")
      .where("seance.date >= :now", { now: moment.utc().toDate() })
      .innerJoin(
        "seance.cinema",
        "cinema",
        `cinema."multikinoId" = :cinemaId`,
        {
          cinemaId: cinemaId
        }
      )
      .innerJoin("seance.movie", "movie", `movie."multikinoId" = :movieId`, {
        movieId: movieId
      })
      .orderBy("seance.date", "ASC")
      .getMany();

    const groups = this.groupSeances(seances);
    return { movieId: movieId, cinemaId: cinemaId, ...groups };
  }

  async update(request: Request, response: Response, next: NextFunction) {
    const seanceId = parseInt(request.params.seanceId);

    const seanceData = await this.scraper.getSeanceData(seanceId);
    if (seanceData === null) {
      response.status(500).send();
      return;
    }

    await this.seanceRepository
      .createQueryBuilder()
      .update(Seance)
      .set({
        allSeatCount: seanceData.nAllSeats,
        takenSeatCount: seanceData.nTakenSeats,
        seatAvailability: seanceData.availability
      })
      .where("multikinoId = :seanceId", { seanceId: seanceData.seanceId })
      .execute();

    // this is rather inefficient, but it's far easier to just return Seance from DB
    // rather than map SeanceData into Seance (from DB)
    return await this.seanceRepository.findOne({
      multikinoId: seanceData.seanceId
    });
  }
}
