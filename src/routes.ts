import { MovieController } from "./controller/MovieController";

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
  }
];
