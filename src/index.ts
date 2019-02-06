import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import { Routes } from "./routes";
import { Cinema } from "./entity/Cinema";
import { MultikinoScraper } from "./scraper/MultikinoScraper";
import { Movie } from "./entity/Movie";
import { Scheduler } from "./Scheduler";
const fs = require("fs-extra");

const getMultikinoCinemas = async (): Promise<Cinema[]> => {
    const raw = await fs.readFile(`/home/sebastian/repo/introkino-backend/data/multikino-cinemas.json`);
    const json = JSON.parse(raw);
    return json.map((entry: any) => {
        const cinema = new Cinema()
        cinema.chain = "Multikino"
        cinema.name = entry.city;
        cinema.multikinoId = entry.id;
        return cinema
    })
}

createConnection().then(async connection => {

    // create express app
    const app = express();
    app.use(bodyParser.json());

    // register express routes from defined application routes
    Routes.forEach(route => {
        (app as any)[route.method](route.route, (req: Request, res: Response, next: Function) => {
            const result = (new (route.controller as any))[route.action](req, res, next);
            if (result instanceof Promise) {
                result.then(result => result !== null && result !== undefined ? res.send(result) : undefined);

            } else if (result !== null && result !== undefined) {
                res.json(result);
            }
        });
    });

    // setup express app here
    // ...

    // start express server
    app.listen(3000);

    const multikinoCinemas = await getMultikinoCinemas()
    await connection
        .createQueryBuilder()
        .insert()
        .orIgnore()
        .into(Cinema)
        .values(multikinoCinemas)
        .execute()

    const multikino = new MultikinoScraper()
    const scheduler = new Scheduler(connection, multikino)
    await scheduler.start()

    console.log("Express server has started on port 3000. Open http://localhost:3000/users to see results");
}).catch(error => { console.log(error); throw error; });
