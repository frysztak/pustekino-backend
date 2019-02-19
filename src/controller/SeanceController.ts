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
    const movieId = request.params.movieId;
    const cinemaId = request.params.cinemaId;

    const seances = await this.seanceRepository.find({
      where: {
        "movie.multikinoId": movieId,
        "cinema.multikinoId": cinemaId,
        date: MoreThan(moment.utc().toDate())
      },
      order: { date: "ASC" }
    });

    const groups = this.groupSeances(seances);
    return { movieId: movieId, cinemaId: cinemaId, ...groups };
  }
}
