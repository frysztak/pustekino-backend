require("dotenv").load();
import axios, { AxiosInstance } from "axios";
import { throttleAdapterEnhancer } from "axios-extensions";
import * as tunnel from "tunnel";

export let axiosClient: AxiosInstance;

const proxy = process.env["https_proxy"];
const adapter = throttleAdapterEnhancer(axios.defaults.adapter, {
  threshold: 2 * 1000
});

if (proxy) {
  const url = new URL(proxy);
  const agent = tunnel.httpsOverHttp({
    proxy: {
      host: url.hostname,
      port: parseInt(url.port),
      headers: []
    }
  });

  axiosClient = axios.create({
    httpsAgent: agent,
    baseURL: "https://multikino.pl:443",
    proxy: false,
    adapter: adapter
  });
} else {
  axiosClient = axios.create({
    baseURL: "https://multikino.pl",
    adapter: adapter
  });
}
