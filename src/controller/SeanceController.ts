import { getRepository, MoreThan } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Seance } from "../entity/Seance";
import moment from "moment";

export interface Seances {
  movieId: number;
  cinemaId: number;
  today: Seance[];
  tomorrow: Seance[];
  later: Seance[];
}

export class SeanceController {
  private seanceRepository = getRepository(Seance);

  async all(request: Request, response: Response, next: NextFunction) {
    return this.seanceRepository.find();
  }

  private groupSeances(
    list: Seance[]
  ): Pick<Seances, "today" | "tomorrow" | "later"> {
    const now = moment();
    const twoDaysAfter = now.clone().add(2, "days");

    const today = list.filter(seance => moment(seance.date).isSame(now, "day"));
    const tomorrow = list.filter(
      seance =>
        moment(seance.date).isAfter(now, "day") &&
        moment(seance.date).isBefore(twoDaysAfter, "day")
    );
    const later = list.filter(seance =>
      moment(seance.date).isAfter(twoDaysAfter, "day")
    );

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
}
