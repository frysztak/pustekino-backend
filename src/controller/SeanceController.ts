import { getRepository, MoreThan } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Seance } from "../entity/Seance";
import moment from "moment";
import { MultikinoScraper } from "../scraper/MultikinoScraper";
import _ from "underscore";

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
        seatAvailability: seanceData.availability,
        seatAvailabilityLastCheck: moment.utc().toDate()
      })
      .where("multikinoId = :seanceId", { seanceId: seanceData.seanceId })
      .execute();

    // this is rather inefficient, but it's far easier to just return Seance from DB
    // rather than map SeanceData into Seance (from DB)
    return await this.seanceRepository.findOne({
      multikinoId: seanceData.seanceId
    });
  }

  async popularity(request: Request, response: Response, next: NextFunction) {
    const movieId = parseInt(request.params.movieId);
    const cinemaId = parseInt(request.params.cinemaId);

    const seances = await this.seanceRepository
      .createQueryBuilder("seance")
      .select("seance")
      .where("seance.date <= :now", { now: moment.utc().toDate() })
      .innerJoin(
        "seance.cinema",
        "cinema",
        `cinema."multikinoId" = :cinemaId`,
        { cinemaId: cinemaId }
      )
      .innerJoin("seance.movie", "movie", `movie."multikinoId" = :movieId`, {
        movieId: movieId
      })

      .orderBy("seance.date", "ASC")
      .getMany();

    const points = seances
      .filter(s => s.seatAvailability)
      .map(s => ({
        date: s.date,
        seatAvailability: s.seatAvailability
      }));

    const groups = _.groupBy(points, x => moment(x.date).format("YYYY-MM-DD"));
    const averaged = Object.values(groups).map(points => {
      const values = points.map(p => p.seatAvailability);
      const sum = values.reduce((a, b) => a + b);
      const avg = sum / values.length;

      return {
        date: points[0].date,
        // invert popularity values. return fraction of taken seats, rather than free ones
        seatAvailability: 1.0 - avg
      };
    });

    const weekends: Date[][] = [[]];
    let date = moment(averaged[0].date);
    const lastDate = moment(averaged[averaged.length - 1].date);

    while (!date.isSame(lastDate, "day")) {
      const weekday = date.isoWeekday();
      const isFriday = weekday === 5;
      const isSaturday = weekday === 6;
      const isSunday = weekday === 7;

      let group = weekends[weekends.length - 1];
      if (group.length !== 0) {
        if (!moment(group[group.length - 1]).isSame(moment(date), "week")) {
          weekends.push([]);
          group = weekends[weekends.length - 1];
        }
      }

      if (isFriday) {
        group.push(
          date
            .clone()
            .set("hours", 16)
            .toDate()
        );
      } else if (isSaturday) {
        group.push(
          date
            .clone()
            .set("hours", 24)
            .toDate()
        );
      } else if (isSunday) {
        group.push(
          date
            .clone()
            .set("hours", 23)
            .set("minutes", 59)
            .set("seconds", 59)
            .toDate()
        );
      }

      date = date.add(1, "day");
    }

    //const weekends = _.groupBy(averaged.map(p => p.date), date => {
    //  const weekday = moment(date).isoWeekday();
    //  return weekday === 5 || weekday === 6 || weekday === 7;
    //});

    console.log(weekends);

    return {
      movieId: movieId,
      cinemaId: cinemaId,
      points: averaged,
      weekends: weekends
    };
  }
}
