import { CinemaScraper, HeroImage, SeanceData } from "./CinemaScraper";
import { Movie } from "../entity/Movie";
import {
  Showings,
  Film,
  Gallery,
  MovieVersion,
  MovieDay,
  SeanceInfo
} from "./MultikinoTypes";
import * as cheerio from "cheerio";
import * as url from "url";
import puppeteer from "puppeteer";
import { Seance } from "../entity/Seance";
import moment from "moment";
import "moment-timezone";
import { axiosClient } from "./Axios";
import querystring from "querystring";
import { Cinema } from "../entity/Cinema";

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

interface MovieData {
  "@context": string;
  "@type": string;
  name: string;
  image: string;
  productionCompany: string;
  dateCreated: Date;
  genre: string;
  typicalAgeRange: string;
  duration: string;
  description: string;
  director: Person[];
  actor: Person[];
  aggregateRating: AggregateRating;
  trailer: Trailer;
}

interface Person {
  "@type": string;
  name: string;
}

interface AggregateRating {
  "@type": string;
  ratingCount: number;
  ratingValue: number;
  bestRating: number;
  worstRating: number;
}

interface Trailer {
  "@type": string;
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: Date;
}

export class MultikinoScraper extends CinemaScraper {
  async getHeroImages(): Promise<HeroImage[]> {
    let html: string = "";
    try {
      const res = await axiosClient.get(`https://multikino.pl`);
      html = res.data;
    } catch (err) {
      console.error(err);
    }
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
      const scrapedData = JSON.parse(fixedJson) as MovieData;

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
      await browser.close();
    }
  }

  async getCurrentlyShownMovies(cinemaId: number): Promise<Movie[]> {
    const url = getShowingsUrl(cinemaId);
    const res = await axiosClient.get(url);
    const showings = res.data as Showings;

    const currentlyShownFilms = showings.films.filter(
      film =>
        film.showings.length != 0 &&
        film.showing_type.name === "Filmy" &&
        !film.coming_soon
    );

    const mapMovie = async (film: Film): Promise<Movie> => {
      const movie = new Movie();
      movie.multikinoId = parseInt(film.id);
      movie.currently_shown = true;
      movie.title_pl = film.title;
      movie.poster_url = film.image_poster;
      movie.description_pl = film.synopsis_short;
      movie.genres = film.genres.names.map(g => g.name);
      movie.runtime = parseInt(film.info_runningtime.split(" ")[0]);
      const scrapedData = await this.scrapeMoviePage(film.film_page_name);
      if (scrapedData !== null) {
        return { ...movie, ...scrapedData };
      }
      return movie;
    };

    const movies: Movie[] = [];
    for (const film of currentlyShownFilms) {
      movies.push(await mapMovie(film));
    }

    return movies;
  }

  async getSeances(cinema: Cinema, movie: Movie): Promise<Seance[]> {
    let u = `/data/getVersions`;
    let res = await axiosClient.post(
      u,
      querystring.stringify({
        cinema_id: cinema.multikinoId,
        film_id: movie.multikinoId
      })
    );

    if (!res.data) {
      return [];
    }

    const movieVersions = res.data as MovieVersion[];
    const movieDays = await Promise.all(
      movieVersions.map(async version => {
        const u = `/data/getDays`;
        res = await axiosClient.post(
          u,
          querystring.stringify({
            cinema_id: cinema.multikinoId,
            film_id: movie.multikinoId,
            version_id: version.id
          })
        );
        return res.data as MovieDay[];
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
    const u = `/data/getSeats`;
    let seance: SeanceInfo;
    try {
      const res = await axiosClient.post(
        u,
        querystring.stringify({
          seance_id: seanceId
        })
      );

      if (!res.data) {
        return null;
      }

      seance = res.data as SeanceInfo;
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
