import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Cinema } from "../entity/Cinema";
import { CinemaScraper } from "../scraper/CinemaScraper";
const fs = require("fs-extra");

export class CinemaController {
  private cinemaRepository = getRepository(Cinema);

  async all(request: Request, response: Response, next: NextFunction) {
    let obj: any;
    let cinemas: Cinema[];

    try {
      const topojson = await fs.readFile("./data/poland.json");
      obj = JSON.parse(topojson);
      cinemas = await this.cinemaRepository.find();
    } catch {
      response.status(500).send();
    }

    response.json({ cinemas: cinemas, map: obj }).send();
  }
}
