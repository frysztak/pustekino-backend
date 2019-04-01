const errors = require("cloudscraper/errors");

const N = 5;

export type Method = "GET" | "POST";
const proxyUrl = process.env.emergency_https_proxy;

export const RetryScrape = async (
  method: Method,
  scraper: any,
  url: string,
  formData?: object
) => {
  let useProxy = false;

  for (let i = 0; i < N; i++) {
    let params: any =
      method === "GET" ? { uri: url } : { uri: url, formData: formData };
    if (useProxy && proxyUrl) {
      params = { proxy: proxyUrl, ...params };
    }

    try {
      const response =
        method === "GET"
          ? await scraper.get(params)
          : await scraper.post(params);

      return response;
    } catch (err) {
      if (err instanceof errors.CloudflareError) {
        if (!isNaN(err.cause) && (err.cause > 1004 && err.cause < 1009)) {
          useProxy = true;
          console.warn("CloudFlare ban detected");
        }
      }
    }
  }

  console.error(`Fetching ${url} failed completely`);
  return null;
};
