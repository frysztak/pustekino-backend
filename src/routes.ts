import { MovieController } from "./controller/MovieController";

export const Routes = [
  {
    method: "get",
    route: "/movies",
    controller: MovieController,
    action: "all"
  }
];
