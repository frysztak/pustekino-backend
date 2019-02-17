import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Movie } from "../entity/Movie";

export class MovieController {
  private movieRepository = getRepository(Movie);

  async all(request: Request, response: Response, next: NextFunction) {
    return this.movieRepository.find();
  }

  async currentlyShown(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    return this.movieRepository.find({ currently_shown: true });
  }
}
