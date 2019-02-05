import { CinemaScraper } from "./CinemaScraper";
import { Movie } from "../entity/Movie";
import { Showings } from "./MultikinoTypes";
import fetch from "fetch-with-proxy";
import * as cheerio from "cheerio"
import * as url from "url"

const getShowingsUrl = (cinemaId: number) => `https://multikino.pl/data/filmswithshowings/${cinemaId}`

type HeroImage = {
    movieId: number
    hero_desktop: string
    hero_mobile: string
}

export class MultikinoScraper extends CinemaScraper {

    async getHeroImages(): Promise<HeroImage[]> {
        const res = await fetch(`https://multikino.pl`)
        const html = await res.text()
        const $ = cheerio.load(html)

        return $('.carousel__ctafull').map((idx, el) => {
            let movieId: number = -1
            try {
                movieId = parseInt(el.attribs["data-adobe-id"])
            }
            catch (e) { console.log(e); }

            if (!movieId) {
                console.log("Invalid movieId")
                return []
            }

            const hero = $(el).children(".carousel__hero-image")
            if (hero.length !== 1) {
                throw new Error(`Invalid number of hero images ${hero.length}`)
            }

            let desktopImg = hero.attr("data-desktop-image")
            let mobileImg = hero.attr("data-mobile-image")

            desktopImg = url.resolve('https://multikino.pl', desktopImg)
            mobileImg = url.resolve('https://multikino.pl', mobileImg)

            return { movieId: movieId, hero_desktop: desktopImg, hero_mobile: mobileImg }
        }).get()
    }

    async getPreviewImages(moviename: string): Promise<string[]> {
        const u = `https://multikino.pl/filmy/${moviename}`
        const res = await fetch(u)
        const html = await res.text()
        const $ = cheerio.load(html)

        return $(".ml-gallery-container__images__item").map((_, el) => {
            const img = $(el).children("img")
            return img.attr("src")
        }).get()
    }

    async getCurrentlyShownMovies(cinemaId: number): Promise<Movie[]> {
        const url = getShowingsUrl(cinemaId)
        const res = await fetch(url)
        const showings = await res.json() as Showings

        const currentlyShownFilms = showings.films.filter(film => film.showings)
        return await Promise.all(currentlyShownFilms.map(async film => {
            const movie = new Movie()
            movie.multikinoId = parseInt(film.id)
            movie.title_pl = film.title
            movie.poster_url = film.image_poster
            movie.description_pl = film.synopsis_short
            movie.genres = film.genres.names.map(g => g.name)
            movie.runtime = parseInt(film.info_runningtime.split(" ")[0])
            movie.preview_image_urls = await this.getPreviewImages(film.film_page_name)
            return movie
        }))
    }

}