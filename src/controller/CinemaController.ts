import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Cinema } from "../entity/Cinema";

export class CinemaController {
  private cinemaRepository = getRepository(Cinema);

  async all(request: Request, response: Response, next: NextFunction) {
    return this.cinemaRepository.find();
  }
}
