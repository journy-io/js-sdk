import { HttpClient, HttpClientApi, HttpClientAxios } from "./HttpClient";
import axios from "axios";

export class Config {
  constructor(private readonly apiKeySecret: string) {}

  getHttpClient(timeout: number = 5000): HttpClient {
    const instance = axios.create();
    delete instance.defaults.headers.common;

    return new HttpClientApi(
      this.apiKeySecret,
      new HttpClientAxios(instance, timeout)
    );
  }
}
