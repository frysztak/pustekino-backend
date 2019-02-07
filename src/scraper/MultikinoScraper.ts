import { CinemaScraper } from "./CinemaScraper";
import { Movie } from "../entity/Movie";
import {
  Showings,
  Film,
  Gallery,
  MovieVersion,
  MovieDay
} from "./MultikinoTypes";
import * as cheerio from "cheerio";
import * as url from "url";
import puppeteer from "puppeteer";
import { debug } from "util";
import { Seance } from "../entity/Seance";
import moment from "moment";
import "moment-timezone";
import { axiosClient } from "./Axios";
import querystring from "querystring";
import { Cinema } from "../entity/Cinema";

const getShowingsUrl = (cinemaId: number) =>
  `/data/filmswithshowings/${cinemaId}`;

type HeroImage = {
  movieId: number;
  hero_desktop: string;
  hero_mobile: string;
};

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

    return $(".carousel__ctafull")
      .map((idx, el) => {
        let movieId: number = -1;
        try {
          movieId = parseInt(el.attribs["data-adobe-id"]);
        } catch (e) {
          console.log(e);
        }

        if (!movieId) {
          console.log("Invalid movieId");
          return [];
        }

        const hero = $(el).children(".carousel__hero-image");
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

  async getPreviewImages(moviename: string): Promise<string[]> {
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
      return gallery[0].photos.map(p => p.url);
    } catch (err) {
      console.error(`Puppeteer failed: ${err}`);
      return [];
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
      movie.title_pl = film.title;
      movie.poster_url = film.image_poster;
      movie.description_pl = film.synopsis_short;
      movie.genres = film.genres.names.map(g => g.name);
      movie.runtime = parseInt(film.info_runningtime.split(" ")[0]);
      movie.preview_image_urls = await this.getPreviewImages(
        film.film_page_name
      );
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
}
