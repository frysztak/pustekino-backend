import { MovieController } from "./controller/MovieController";
import { SeanceController } from "./controller/SeanceController";

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
    route: "/seances/:movieId/at/:cinemaId",
    controller: SeanceController,
    action: "upcoming"
  },
  {
    method: "get",
    route: "/seances/all",
    controller: SeanceController,
    action: "all"
  }
];
