import { CinemaScraper, HeroImage, SeanceData } from "./CinemaScraper";
import { Movie } from "../entity/Movie";
import {
  Showings,
  Film,
  Gallery,
  MovieVersion,
  MovieDay,
  SeanceInfo,
  LDJSON
} from "./MultikinoTypes";
import * as cheerio from "cheerio";
import * as url from "url";
import puppeteer from "puppeteer";
import { Seance } from "../entity/Seance";
import moment from "moment";
import "moment-timezone";
import { Cinema } from "../entity/Cinema";
import { RetryScrape } from "../utils/RetryScrape";

var cloudscraper = require("cloudscraper").defaults({
  baseUrl: "https://multikino.pl",
  proxy: process.env["https_proxy"]
});

const getShowingsUrl = (cinemaId: number) =>
  `/data/filmswithshowings/${cinemaId}`;

type ScrapedMovieInfo = Pick<
  Movie,
  | "poster_large_url"
  | "hero_url"
  | "preview_image_urls"
  | "directors"
  | "actors"
  | "country"
>;

export class MultikinoScraper extends CinemaScraper {
  async getHeroImages(): Promise<HeroImage[]> {
    const html: string = await RetryScrape(
      "GET",
      cloudscraper,
      `https://multikino.pl`
    );

    const $ = cheerio.load(html);
    return $("div.carousel__panel")
      .map((_, panel) => {
        const a = $(panel)
          .find("[data-adobe-id]")
          .first();
        let movieId: number = -1;
        try {
          movieId = parseInt(a.attr("data-adobe-id"));
        } catch (e) {
          console.log(e);
        }

        if (!movieId) {
          console.log("Invalid movieId");
          return [];
        }

        const hero = $(panel).find(".carousel__hero-image");
        if (hero.length !== 1) {
          throw new Error(`Invalid number of hero images ${hero.length}`);
        }

        let desktopImg = hero.attr("data-desktop-image");
        let mobileImg = hero.attr("data-mobile-image");

        desktopImg = url.resolve("https://multikino.pl", desktopImg);
        mobileImg = url.resolve("https://multikino.pl", mobileImg);

        return {
          movieId: movieId,
          hero_desktop: desktopImg,
          hero_mobile: mobileImg
        };
      })
      .get();
  }

  getPuppeteerArgs(): string[] {
    const args: string[] = [];

    const proxy = process.env.https_proxy;
    if (proxy) {
      args.push(`--proxy-server:${proxy}`);
    }

    if (process.env.no_sandbox) {
      args.push("--no-sandbox");
    }

    return args;
  }

  private fixLDJson(ldjson: string): string {
    // LD-JSON embedded in Multikino website is malformed, strings are not properly escaped

    // remove newlines inside quotes
    ldjson = ldjson.replace(/"[^"]*(?:""[^"]*)*"/g, (match, capture) =>
      match.replace(/(\r\n|\n|\r)/gm, "")
    );

    const regexr = /\: \"(.+)\"\,/g;
    let fixed = ldjson;

    let matches = [];
    while ((matches = regexr.exec(ldjson))) {
      const match = matches[1];
      const escaped = match.replace(/"/g, '\\"');
      fixed = fixed.replace(match, escaped);
    }
    return fixed;
  }

  private async scrapeMoviePage(moviename: string): Promise<ScrapedMovieInfo> {
    const u = `https://multikino.pl/filmy/${moviename}`;
    console.log(`Fetching ${u}`);
    const browser = await puppeteer.launch({
      headless: true,
      args: this.getPuppeteerArgs()
    });

    const page = await browser.newPage();
    try {
      await page.goto(u);
      const gallery = (await page.evaluate("mlGallery")) as Gallery[];
      const preview_image_urls = gallery[0].photos.map(p => p.url);

      const ldjson = await page.$eval(
        'script[type="application/ld+json"]',
        s => s.innerHTML
      );
      const fixedJson = this.fixLDJson(ldjson);
      const scrapedData = JSON.parse(fixedJson) as LDJSON.MovieData;

      return {
        preview_image_urls: preview_image_urls,
        actors: scrapedData.actor.map(a => a.name),
        directors: scrapedData.director.map(a => a.name),
        country: scrapedData.productionCompany, // not a typo
        hero_url: scrapedData.image,
        poster_large_url: scrapedData.trailer.thumbnailUrl
      };
    } catch (err) {
      console.error(`Puppeteer failed: ${err}`);
      return null;
    } finally {
      await page.close();
      await browser.close();
    }
  }

  private async mapMovie(film: Film): Promise<Movie> {
    const movie = new Movie();
    movie.multikinoId = parseInt(film.id);
    movie.currently_shown = true;
    movie.title_pl = film.title;
    movie.poster_url = film.image_poster;
    movie.description_pl = film.synopsis_short;
    movie.genres = film.genres.names.map(g => g.name);
    movie.runtime = parseInt(film.info_runningtime.split(" ")[0]);
    movie.release_date = film.ReleaseDate;
    const scrapedData = await this.scrapeMoviePage(film.film_page_name);
    if (scrapedData !== null) {
      return { ...movie, ...scrapedData };
    }
    return movie;
  }

  async getCurrentlyShownMovies(cinemaIds: number[]): Promise<Movie[]> {
    const films = await Promise.all(
      cinemaIds.map(async cinemaId => {
        const url = getShowingsUrl(cinemaId);
        //const res = await cloudscraper.get(url);
        const res = await RetryScrape("GET", cloudscraper, url);
        if (!res || res === "null") {
          return [];
        }

        const showings = JSON.parse(res) as Showings;
        const films = showings.films.filter(
          film =>
            film.showings.length !== 0 &&
            film.showing_type.name === "Filmy" &&
            film.show_showings &&
            film.info_runningtime &&
            !film.coming_soon &&
            moment(film.ReleaseDate).isBefore(moment())
        );
        return films;
      })
    );

    const uniqueFilms: Film[] = [];
    const usedIds = new Set();

    for (const filmsForCinema of films) {
      for (const film of filmsForCinema) {
        const id = film.id;
        if (usedIds.has(id)) continue;

        usedIds.add(id);
        uniqueFilms.push(film);
      }
    }

    const movies: Movie[] = [];
    for (const film of uniqueFilms) {
      // doing this sequentially is crucial, since mapMovie() uses puppeeteer
      movies.push(await this.mapMovie(film));
    }

    return movies;
  }

  async getSeances(cinema: Cinema, movie: Movie): Promise<Seance[]> {
    const res = await RetryScrape("POST", cloudscraper, `/data/getVersions`, {
      cinema_id: cinema.multikinoId,
      film_id: movie.multikinoId
    });

    if (res === null || res === "null") {
      return [];
    }

    const movieVersions = JSON.parse(res) as MovieVersion[];
    const movieDays = await Promise.all(
      movieVersions.map(async version => {
        const res = await cloudscraper.post({
          uri: `/data/getDays`,
          formData: {
            cinema_id: cinema.multikinoId,
            film_id: movie.multikinoId,
            version_id: version.id
          }
        });
        return JSON.parse(res) as MovieDay[];
      })
    );

    const flatMovieDays = ([] as MovieDay[]).concat(...movieDays);
    const seances: Seance[] = [];

    for (const movieDay of flatMovieDays) {
      for (const hour of movieDay.hours) {
        const seance = new Seance();
        // 10:20 06.02.2019
        const datetime = `${hour.h} ${movieDay.day}.${movieDay.year}`;

        seance.date = moment
          .tz(datetime, "HH:mm DD.MM.YYYY", "Europe/Warsaw")
          .toDate();
        seance.multikinoId = hour.id;
        seance.movie = movie;
        seance.cinema = cinema;

        seances.push(seance);
      }
    }

    return seances;
  }

  async getSeanceData(seanceId: number): Promise<SeanceData> {
    let seance: SeanceInfo;
    try {
      const res = await RetryScrape("POST", cloudscraper, `/data/getSeats`, {
        seance_id: seanceId
      });

      if (!res || res === "null") {
        return null;
      }

      seance = JSON.parse(res) as SeanceInfo;
    } catch (err) {
      console.log(err);
      return null;
    }

    return {
      seanceId: seanceId,
      nAllSeats: seance.seatsStat.all,
      nTakenSeats: seance.seatsStat.notfree,
      availability: seance.seatsStat.availability
    };
  }
}
