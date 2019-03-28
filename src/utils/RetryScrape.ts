const N = 10;

export type Method = "GET" | "POST";

export const RetryScrape = async (
  method: Method,
  scraper: any,
  url: string,
  formData?: object
) => {
  for (let i = 0; i < N; i++) {
    try {
      const response =
        method === "GET"
          ? await scraper.get(url)
          : await scraper.post({ uri: url, formData: formData });

      if (response !== "null") {
        return response;
      }
    } catch (err) {}
  }

  console.error(`Fetching ${url} failed completely`);
  return "null";
};
