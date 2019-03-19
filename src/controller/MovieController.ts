import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Movie } from "../entity/Movie";
import { Seance } from "../entity/Seance";
import { Cinema } from "../entity/Cinema";
import moment = require("moment");

export class MovieController {
  private movieRepository = getRepository(Movie);

  async all(request: Request, response: Response, next: NextFunction) {
    return this.movieRepository.find();
  }

  async atCinema(request: Request, response: Response, next: NextFunction) {
    const multikinoCinemaId = parseInt(request.params.cinemaId);
    const cinemaRepository = getRepository(Cinema);
    const cinemaId = (await cinemaRepository.findOne({
      where: { multikinoId: multikinoCinemaId }
    })).id;

    return this.movieRepository
      .createQueryBuilder("movie")
      .select("movie")
      .where(qb => {
        const subQuery = qb
          .subQuery()
          .select(`seance."movieId"`)
          .from(Seance, "seance")
          .where(`seance."cinemaId" = :cinemaId`)
          .andWhere("seance.date >= :now")
          .getQuery();
        return "movie.id IN " + subQuery;
      })
      .setParameter("cinemaId", cinemaId)
      .setParameter("now", moment.utc().toDate())
      .orderBy("movie.release_date", "DESC")
      .getMany();
  }

  async currentlyShown(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    return this.movieRepository.find({ currently_shown: true });
  }
}
