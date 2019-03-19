import { MovieController } from "./controller/MovieController";
import { SeanceController } from "./controller/SeanceController";
import { CinemaController } from "./controller/CinemaController";

export const Routes = [
  {
    method: "get",
    route: "/movies",
    controller: MovieController,
    action: "currentlyShown"
  },
  {
    method: "get",
    route: "/movies/all",
    controller: MovieController,
    action: "all"
  },
  {
    method: "get",
    route: "/movies/at/:cinemaId",
    controller: MovieController,
    action: "atCinema"
  },

  {
    method: "get",
    route: "/seances/:movieId/at/:cinemaId",
    controller: SeanceController,
    action: "upcoming"
  },
  {
    method: "get",
    route: "/seances/all",
    controller: SeanceController,
    action: "all"
  },
  {
    method: "get",
    route: "/seance/:seanceId",
    controller: SeanceController,
    action: "update"
  },
  {
    method: "get",
    route: "/movie/:movieId/popularity/at/:cinemaId",
    controller: SeanceController,
    action: "popularity"
  },

  {
    method: "get",
    route: "/cinemas",
    controller: CinemaController,
    action: "all"
  }
];
