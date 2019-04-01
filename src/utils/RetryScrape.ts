import * as proxies from "../../data/proxies.json";
import { sample } from "underscore";
const errors = require("cloudscraper/errors");

const N = 5;

export type Method = "GET" | "POST";

export const RetryScrape = async (
  method: Method,
  scraper: any,
  url: string,
  formData?: object
) => {
  let useProxy = false;
  let lastError: any;

  for (let i = 0; i < N; i++) {
    let params: any =
      method === "GET" ? { uri: url } : { uri: url, formData: formData };
    if (useProxy) {
      const proxyUrl = sample(proxies);
      params = { proxy: proxyUrl, ...params };
    }

    try {
      const response =
        method === "GET"
          ? await scraper.get(params)
          : await scraper.post(params);

      return response;
    } catch (err) {
      lastError = err;
      if (err instanceof errors.CloudflareError) {
        if (!isNaN(err.cause) && (err.cause > 1004 && err.cause < 1009)) {
          useProxy = true;
          console.warn("CloudFlare ban detected");
        }
      }
    }
  }

  console.error(`Fetching ${url} failed completely, last error: ${lastError}`);
  return null;
};
