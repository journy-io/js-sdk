import {
  HttpClient,
  HttpClientAxios,
  HttpHeaders,
  HttpRequest,
  HttpRequestError,
} from "./HttpClient";
import axios from "axios";

export interface Config {
  apiKey: string;
  apiUrl?: string;
}

export function createClient(config: Config): Client {
  const instance = axios.create();
  delete instance.defaults.headers.common;
  const httpClient = new HttpClientAxios(instance, 5000);

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
  private handleError(error: Error): Error {
    if (error instanceof HttpRequestError) {
      const remaining = error.getHeaders().byName("X-RateLimit-Remaining");

      return {
        success: false,
        requestId: error.getApiRequestId(),
        callsRemaining: remaining ? parseInt(remaining) : undefined,
        error: statusCodeToError(error.getStatusCode()),
      };
    }

    return {
      success: false,
      requestId: undefined,
      error: APIError.UnknownError,
      callsRemaining: undefined,
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
      this.getHeaders(),
      {
        email: args.email,
        tag: args.tag,
        recordedAt: args.recordedAt ? args.recordedAt.toISOString() : undefined,
        properties: args.properties
          ? this.stringifyProperties(args.properties)
          : undefined,
      }
    );

    try {
      const response = await this.httpClient.send(request);
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining ? parseInt(remaining, 10) : 0,
        data: undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async trackProperties(
    args: TrackPropertiesArguments
  ): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL(`/journeys/properties`),
      "POST",
      this.getHeaders(),
      {
        email: args.email,
        properties: args.properties
          ? this.stringifyProperties(args.properties)
          : undefined,
      }
    );

    try {
      const response = await this.httpClient.send(request);
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining ? parseInt(remaining, 10) : 0,
        data: undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
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

    try {
      const response = await this.httpClient.send(request);
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
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getApiKeyDetails(): Promise<Result<ApiKeyDetails>> {
    const request = new HttpRequest(
      this.createURL(`/validate`),
      "GET",
      this.getHeaders()
    );

    try {
      const response = await this.httpClient.send(request);
      const details: ApiKeyDetails = JSON.parse(response.getBody()).data;
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining ? parseInt(remaining, 10) : 0,
        data: details,
      };
    } catch (error) {
      return this.handleError(error);
    }
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
  propertyGroupName: string;
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
