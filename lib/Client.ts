import {
  HttpClient,
  HttpClientAxios,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from "@journyio/http";
import axios from "axios";

export interface Config {
  apiKey: string;
  apiUrl?: string;
}

export function createClient(config: Config): Client {
  const instance = axios.create({ timeout: 5000 });
  delete instance.defaults.headers.common;
  const httpClient = new HttpClientAxios(instance);

  return new Client(httpClient, config);
}

export class Client {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: Config
  ) {
    this.assertNotRunningInBrowser();
    this.assertConfigIsValid(config);
  }

  // noinspection JSMethodCanBeStatic
  private assertNotRunningInBrowser() {
    if (
      typeof window !== "undefined" &&
      typeof window.document !== "undefined"
    ) {
      throw new Error(
        "Sorry, you can't use our SDK in the browser because this will leak your API key."
      );
    }
  }

  private createURL(path: string) {
    const url = this.config.apiUrl || "https://api.journy.io";

    return new URL(url + path);
  }

  // noinspection JSMethodCanBeStatic
  private buildError(response: HttpResponse): Error {
    const remaining = response.getHeaders().byName("X-RateLimit-Remaining");

    let body: { meta: { requestId: string } } | undefined = undefined;
    try {
      body = JSON.parse(response.getBody());
    } catch (error) {
      // ignore
    }

    return {
      success: false,
      requestId: body?.meta.requestId,
      callsRemaining: remaining ? parseInt(remaining) : undefined,
      error: statusCodeToError(response.getStatusCode()),
    };
  }

  // noinspection JSMethodCanBeStatic
  private assertConfigIsValid(clientConfig: Config) {
    if (clientConfig.apiUrl) {
      try {
        new URL(clientConfig.apiUrl);
      } catch (error) {
        throw new Error(
          `The API url is not a valid URL: ${clientConfig.apiUrl}`
        );
      }
    }

    if (!clientConfig.apiKey || !clientConfig.apiKey.trim().length) {
      throw new Error("The API key cannot be empty.");
    }
  }

  private getHeaders() {
    return new HttpHeaders({ "x-api-key": this.config.apiKey });
  }

  // noinspection JSMethodCanBeStatic
  private stringifyProperties(properties: Properties) {
    const newProperties: Properties = {};
    for (const key of Object.keys(properties)) {
      const value = properties[key];
      if (value instanceof Date) {
        newProperties[key] = value.toISOString();
      } else {
        newProperties[key] = value.toString();
      }
    }
    return newProperties;
  }

  async trackEvent(args: TrackEventArguments): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL(`/journeys/events`),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "content-type": "application/json",
      }),
      JSON.stringify({
        email: args.email,
        tag: args.tag,
        recordedAt: args.recordedAt ? args.recordedAt.toISOString() : undefined,
        properties: args.properties
          ? this.stringifyProperties(args.properties)
          : undefined,
      })
    );

    const response = await this.httpClient.send(request);

    if (response.getStatusCode() !== 201) {
      return this.buildError(response);
    }

    const remaining = response.getHeaders().byName("X-RateLimit-Remaining");
    const body: { meta: { requestId: string } } = JSON.parse(
      response.getBody()
    );

    return {
      success: true,
      requestId: body.meta.requestId,
      callsRemaining: remaining ? parseInt(remaining, 10) : 0,
      data: undefined,
    };
  }

  async trackProperties(
    args: TrackPropertiesArguments
  ): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL(`/journeys/properties`),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "content-type": "application/json",
      }),
      JSON.stringify({
        email: args.email,
        properties: args.properties
          ? this.stringifyProperties(args.properties)
          : undefined,
      })
    );

    const response = await this.httpClient.send(request);

    if (response.getStatusCode() !== 201) {
      return this.buildError(response);
    }

    const remaining = response.getHeaders().byName("X-RateLimit-Remaining");

    return {
      success: true,
      requestId: JSON.parse(response.getBody()).meta.requestId,
      callsRemaining: remaining ? parseInt(remaining, 10) : 0,
      data: undefined,
    };
  }

  async getTrackingSnippet(
    args: GetTrackingSnippetArguments
  ): Promise<Result<TrackingSnippetResponse>> {
    const { domain } = args;
    const request = new HttpRequest(
      this.createURL(`/tracking/snippet?domain=${encodeURIComponent(domain)}`),
      "GET",
      this.getHeaders()
    );

    const response = await this.httpClient.send(request);

    if (response.getStatusCode() !== 200) {
      return this.buildError(response);
    }

    const parsed = JSON.parse(response.getBody()).data;
    const remaining = response.getHeaders().byName("X-RateLimit-Remaining");
    const snippet = parsed.snippet;

    return {
      success: true,
      requestId: JSON.parse(response.getBody()).meta.requestId,
      callsRemaining: remaining ? parseInt(remaining, 10) : 0,
      data: {
        domain: domain,
        snippet: snippet,
      },
    };
  }

  async getApiKeyDetails(): Promise<Result<ApiKeyDetails>> {
    const request = new HttpRequest(
      this.createURL(`/validate`),
      "GET",
      this.getHeaders()
    );

    const response = await this.httpClient.send(request);

    if (response.getStatusCode() !== 200) {
      return this.buildError(response);
    }

    const details: ApiKeyDetails = JSON.parse(response.getBody()).data;
    const remaining = response.getHeaders().byName("X-RateLimit-Remaining");

    return {
      success: true,
      requestId: JSON.parse(response.getBody()).meta.requestId,
      callsRemaining: remaining ? parseInt(remaining, 10) : 0,
      data: details,
    };
  }
}

export enum APIError {
  ServerError = "ServerError",
  UnauthorizedError = "UnauthorizedError",
  BadArgumentsError = "BadArgumentsError",
  TooManyRequests = "TooManyRequests",
  NotFoundError = "NotFoundError",
  UnknownError = "UnknownError",
}

function statusCodeToError(status: number): APIError {
  switch (status) {
    case 401:
      return APIError.UnauthorizedError;
    case 400:
      return APIError.BadArgumentsError;
    case 429:
      return APIError.TooManyRequests;
    case 404:
      return APIError.NotFoundError;
    case 500:
      return APIError.ServerError;
    default:
      return APIError.UnknownError;
  }
}

export type Properties = { [key: string]: string | number | boolean | Date };

export type Result<T> = Success<T> | Error;

export interface Success<T> {
  success: true;
  requestId: string;
  callsRemaining: number;
  data: T;
}

export interface Error {
  success: false;
  requestId: string | undefined;
  callsRemaining: number | undefined;
  error: APIError;
}

export interface ApiKeyDetails {
  permissions: string[];
}

export interface TrackEventArguments {
  email: string;
  tag: string;
  recordedAt?: Date;
  properties?: Properties;
}

export interface TrackPropertiesArguments {
  email: string;
  properties: Properties;
}

export interface GetTrackingSnippetArguments {
  domain: string;
}

export interface TrackingSnippetResponse {
  domain: string;
  snippet: string;
}
