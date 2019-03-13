import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Cinema } from "../entity/Cinema";
const fs = require("fs-extra");

export class CinemaController {
  private cinemaRepository = getRepository(Cinema);

  async all(request: Request, response: Response, next: NextFunction) {
    return this.cinemaRepository.find();
  }

  async map(request: Request, response: Response, next: NextFunction) {
    try {
      const topojson = await fs.readFile("./data/poland.json");
      const obj = JSON.parse(topojson);
      response.json(obj).send();
    } catch {
      response.status(500).send();
    }
  }
}
