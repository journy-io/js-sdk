import { HttpClient, HttpClientApi, HttpClientAxios } from "./HttpClient";
import axios from "axios";
import { Duration } from "luxon";
import PQueue from "p-queue";
import { FifoQueue } from "./FifoQueue";

export class Config {
  constructor(private readonly apiKeySecret: string) {}

  getHttpClient(
    timeout: Duration = Duration.fromObject({ seconds: 5 })
  ): HttpClient {
    const instance = axios.create();
    delete instance.defaults.headers.common;

    return new HttpClientApi(
      this.apiKeySecret,
      new HttpClientAxios(instance, timeout)
    );
  }

  getPQueue(): PQueue {
    return new PQueue({ queueClass: FifoQueue });
  }
}
