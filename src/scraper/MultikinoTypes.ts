export interface Showings {
  films: Film[];
  cdate: string;
  SiteRootPath: string;
  Site: string;
  Lang: string;
}

export interface Film {
  original_s_count: number;
  sortable: number;
  showings: Showing[];
  show_showings: boolean;
  film_page_name: string;
  title: string;
  id: string;
  image_hero: string;
  image_poster: string;
  cert_image: CERTImage;
  cert_desc: null;
  synopsis_short: null | string;
  info_release: string;
  info_runningtime_visible: boolean;
  info_runningtime: string;
  info_age: string;
  pegi_class: string;
  info_director: null | string;
  info_cast: null;
  availablecopy: string;
  videolink: string;
  filmlink: string;
  timeslink: string;
  video: string;
  hidden: boolean;
  coming_soon: boolean;
  comming_soon: boolean;
  announcement: boolean;
  virtual_reality: boolean;
  genres: Categories;
  tags: Categories;
  categories: Categories;
  showing_type: ShowingType;
  rank_votes: string;
  rank_value: string;
  promo_labels: PromoLabels;
  ReleaseDate: Date;
  type: Type;
  wantsee: string;
  showwantsee: boolean;
  newsletterurl: string;
  always_in_QB: boolean;
  priority_value: number;
  available3D: boolean;
  selected3D: boolean;
}

export interface Categories {
  names: CategoriesName[];
  active: boolean;
}

export interface CategoriesName {
  name: string;
  url: null | string;
  highlighted: boolean;
}

export enum CERTImage {
  Empty = "",
  MediaImagesCertificates12PNG = "/-/media/images/certificates/12.png",
  MediaImagesCertificates15PNG = "/-/media/images/certificates/15.png"
}

export interface PromoLabels {
  names: PromoLabelsName[];
  position: Position;
  isborder: boolean;
}

export interface PromoLabelsName {
  name: string;
  class: Class;
  short_name: string;
}

export enum Class {
  PromoLabelHit = "promo-label--hit",
  PromoLabelPromo = "promo-label--promo"
}

export enum Position {
  Empty = "",
  PromoLabelContainerDownRight = "promo-label-container--down-right"
}

export interface ShowingType {
  name: ShowingTypeName;
  active: boolean;
}

export enum ShowingTypeName {
  Filmy = "Filmy",
  Wydarzenia = "Wydarzenia"
}

export interface Showing {
  date_prefix: DatePrefix;
  date_day: DateDay;
  date_short: string;
  date_long: string;
  date_time: Date;
  date_formatted: string;
  times: Time[];
  date: Date;
  cdate: Date;
  clone: boolean;
}

export enum DateDay {
  Czwartek = "czwartek",
  Niedziela = "niedziela",
  Piątek = "piątek",
  Sobota = "sobota",
  Wtorek = "wtorek",
  Środa = "środa"
}

export enum DatePrefix {
  Dzisiaj = "Dzisiaj",
  Empty = "",
  Jutro = "Jutro"
}

export interface Time {
  session_id: string;
  version_id: string;
  time: string;
  screen_type: ScreenType;
  screen_number: null;
  lang: null;
  tags: Tag[];
  event_info: null;
  hidden: boolean;
  date: Date;
  kids_club: boolean;
  first_class: boolean;
}

export enum ScreenType {
  The2D = "2D"
}

export interface Tag {
  name: TagName;
  fullname: Fullname;
}

export enum Fullname {
  The2DDubbing = "2D, Dubbing",
  The2DNapisy = "2D, Napisy",
  The2DPl = "2D, PL",
  The2DWersjaOryginalna = "2D, Wersja oryginalna"
}

export enum TagName {
  Dubbing = " Dubbing",
  Napisy = " Napisy",
  Org = " ORG",
  Pl = " PL"
}

export enum Type {
  FilmDetails = "Film Details",
  MarathonEvent = "Marathon Event",
  StandardEvent = "Standard Event"
}

export interface Gallery {
  id: string;
  trailers: Trailer[];
  photos: Photo[];
}

export interface Photo {
  url: string;
  thumb: string;
  alt: string;
}

export interface Trailer {
  thumb: string;
  poster: string;
  video: string;
  type: string;
}

export interface MovieVersion {
  tech: string;
  ver: string;
  msg: string;
  id: string;
  cinema_id: string;
}

export interface MovieDay {
  day: string;
  year: string;
  label: string;
  hours: Hour[];
  id: number;
}

export interface Hour {
  h: string;
  id: number;
}

export interface SeanceInfo {
  id: number;
  maxSeatsInRow: number;
  room: RoomElement[];
  countVip: number;
  umber: boolean;
  isSC: boolean;
  isReservable: boolean;
  isSale: boolean;
  applyIsPair: boolean;
  seatsStat: SeatsStat;
  rN: string;
  cN: string;
  legend: Legend[];
  nRows: number;
}

export interface Legend {
  id: ID;
  name: string;
  aspect: number;
  color: string;
}

export enum ID {
  B = "B",
  Vip2 = "vip2"
}

export interface RoomElement {
  rN: string;
  rV: number;
  ln: number;
  rS: R[];
}

export interface R {
  id: string;
  b: number;
  x: string;
  y: string;
  n?: string;
  s?: number;
  a?: ID;
  lid?: null;
  f?: number;
  vip?: number;
  t?: any[] | { [key: string]: TValue };
  lock?: boolean;
  color?: string;
  aspect?: number;
}

export interface TValue {
  id: string;
  n: N;
  p: number;
  pV: number;
}

export enum N {
  Dziecko = "DZIECKO",
  KartaRodzinaTydzień = "KARTA RODZINA TYDZIEŃ",
  MKarta = "M!KARTA",
  Normalny = "NORMALNY",
  Senior = "SENIOR",
  Student = "STUDENT",
  Uczeń = "UCZEŃ"
}

export interface SeatsStat {
  all: number;
  free: number;
  notfree: number;
  availability: number;
}
