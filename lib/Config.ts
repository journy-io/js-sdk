import {
  HttpClient,
  HttpClientApi,
  HttpClientAxios,
  QueuedHttpClient,
} from "./HttpClient";
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

  getQueuedHttpClient(
    timeout: Duration = Duration.fromObject({ seconds: 5 })
  ): HttpClient {
    const instance = axios.create();
    delete instance.defaults.headers.common;

    const httpApi = new HttpClientApi(
      this.apiKeySecret,
      new HttpClientAxios(instance, timeout)
    );
    const pQueue = new PQueue({ queueClass: FifoQueue });
    return new QueuedHttpClient(httpApi, pQueue);
  }
}
