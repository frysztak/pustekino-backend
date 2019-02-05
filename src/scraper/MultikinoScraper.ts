import { CinemaScraper } from "./CinemaScraper";
import { Movie } from "../entity/Movie";
import {
  Showings,
  Film,
  Gallery,
  MovieVersion,
  MovieDay
} from "./MultikinoTypes";
import axios from "axios";
import * as cheerio from "cheerio";
import * as url from "url";
import puppeteer from "puppeteer";
import { debug } from "util";
import { Seance } from "../entity/Seance";
import moment from "moment";

const getShowingsUrl = (cinemaId: number) =>
  `https://multikino.pl/data/filmswithshowings/${cinemaId}`;

type HeroImage = {
  movieId: number;
  hero_desktop: string;
  hero_mobile: string;
};

export class MultikinoScraper extends CinemaScraper {
  async getHeroImages(): Promise<HeroImage[]> {
    let html: string = "";
    try {
      const res = await axios.get(`https://multikino.pl`);
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

  async getPreviewImages(moviename: string): Promise<string[]> {
    const u = `https://multikino.pl/filmy/${moviename}`;
    debug(`Fetching ${u}`);
    const browser = await puppeteer.launch({ headless: true });
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
    const res = await axios.get(url);
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

  async getSeances(cinemaId: number, movieId: number): Promise<Seance[]> {
    let u = `https://multikino.pl/data/getVersions`;
    const config = {headers: {'Content-Type': 'application/x-www-form-urlencoded'}}
    let res = await axios.post(u, { cinema_id: cinemaId, film_id: movieId }, config);


    const movieVersions = res.data as MovieVersion[];
    const movieDays = await Promise.all(
      movieVersions.map(async version => {
        const u = `https://multikino.pl/data/getDays`;
        res = await axios.post(u, {
          cinema_id: cinemaId,
          film_id: movieId,
          version_id: version.id
        }, config);
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

        seance.date = moment(datetime, "HH:mm DD.MM.YYYY").toDate();
        seance.multikinoId = hour.id;

        seances.push(seance);
      }
    }

    return seances;
  }
}
