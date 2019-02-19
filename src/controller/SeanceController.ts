import { getRepository, MoreThan } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Seance } from "../entity/Seance";
import moment from "moment";

export class SeanceController {
  private seanceRepository = getRepository(Seance);

  async all(request: Request, response: Response, next: NextFunction) {
    return this.seanceRepository.find();
  }

  async upcoming(request: Request, response: Response, next: NextFunction) {
    const movieId = request.params.movieId;
    const cinemaId = request.params.cinemaId;

    return this.seanceRepository.find({
      where: {
        "movie.multikinoId": movieId,
        "cinema.multikinoId": cinemaId,
        date: MoreThan(moment.utc().toDate())
      },
      order: { date: "ASC" }
    });
  }
}
