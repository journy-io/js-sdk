import {
  HttpClient,
  HttpClientNode,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from "@journyio/http";
import { URL } from "url";
import { Event, Metadata } from "./Event";

export interface Config {
  apiKey: string;
  rootUrl?: string;
}

export class Client {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly config: Config
  ) {
    this.assertNotRunningInBrowser();
    this.assertConfigIsValid(this.config);
  }

  static withDefaults(apiKey: string) {
    return new Client(new HttpClientNode(5000), {
      apiKey: apiKey,
    });
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
    const url = this.config.rootUrl
      ? this.config.rootUrl
      : "https://api.journy.io";

    return new URL(url + path);
  }

  private static parseCallsRemaining(
    httpResponse: HttpResponse
  ): string | undefined {
    const remaining = httpResponse.getHeaders().byName("X-RateLimit-Remaining");
    if (Array.isArray(remaining)) return undefined;
    else return remaining;
  }

  // noinspection JSMethodCanBeStatic
  private handleError(httpResponse?: HttpResponse): Error {
    if (httpResponse instanceof HttpResponse) {
      const remaining = Client.parseCallsRemaining(httpResponse);

      return {
        success: false,
        requestId: JSON.parse(httpResponse.getBody()).meta.requestId,
        callsRemaining:
          remaining !== undefined ? parseInt(remaining) : undefined,
        error: statusCodeToError(httpResponse.getStatusCode()),
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
    if (clientConfig.rootUrl) {
      try {
        new URL(clientConfig.rootUrl);
      } catch (error) {
        throw new Error(
          `The API url is not a valid URL: ${clientConfig.rootUrl}`
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
    const formatted: { [name: string]: string } = {};
    for (const name of Object.keys(properties)) {
      const value = properties[name];

      if (
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number"
      ) {
        formatted[name] = String(value);
      }

      if (value instanceof Date) {
        formatted[name] = value.toISOString();
      }
    }

    return formatted;
  }

  // noinspection JSMethodCanBeStatic
  private stringifyMetadata(metadata: Metadata) {
    const formatted: { [key: string]: string } = {};
    for (const key of Object.keys(metadata)) {
      const value = metadata[key];

      if (
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number"
      ) {
        formatted[key] = String(value);
      }

      if (value instanceof Date) {
        formatted[key] = value.toISOString();
      }
    }

    return formatted;
  }

  async addEvent(event: Event): Promise<Result<undefined>> {
    const date = event.getDate();
    const request = new HttpRequest(
      this.createURL("/events"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        identification: {
          userId: event.getUserId(),
          accountId: event.getAccountId(),
        },
        name: event.getName(),
        triggeredAt: date ? date.toISOString() : undefined,
        metadata:
          Object.keys(event.getMetadata()).length > 0
            ? this.stringifyMetadata(event.getMetadata())
            : undefined,
      })
    );

    try {
      const response = await this.httpClient.send(request);

      if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
        return this.handleError(response);
      }

      const remaining = Client.parseCallsRemaining(response);

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining !== undefined ? parseInt(remaining, 10) : 0,
        data: undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async upsertUser(args: UpsertUserArguments): Promise<Result<undefined>> {
    if (!args.email) {
      throw new Error(`Email cannot be empty!`);
    }
    if (!args.userId) {
      throw new Error(`User ID cannot be empty!`);
    }

    const request = new HttpRequest(
      this.createURL("/users/upsert"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        email: args.email,
        userId: args.userId,
        properties: args.properties
          ? this.stringifyProperties(args.properties)
          : undefined,
      })
    );

    try {
      const response = await this.httpClient.send(request);

      if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
        return this.handleError(response);
      }

      const remaining = Client.parseCallsRemaining(response);

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining !== undefined ? parseInt(remaining, 10) : 0,
        data: undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async upsertAccount(
    args: UpsertAccountArguments
  ): Promise<Result<undefined>> {
    if (!args.accountId) {
      throw new Error("Account ID cannot be empty!");
    }
    if (!args.name) {
      throw new Error("Account name cannot be empty!");
    }

    const request = new HttpRequest(
      this.createURL("/accounts/upsert"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        accountId: args.accountId,
        name: args.name,
        properties: args.properties
          ? this.stringifyProperties(args.properties)
          : undefined,
        members: args.memberIds
          ? args.memberIds.map((id) => String(id))
          : undefined,
      })
    );

    try {
      const response = await this.httpClient.send(request);

      if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
        return this.handleError(response);
      }

      const remaining = Client.parseCallsRemaining(response);

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining !== undefined ? parseInt(remaining, 10) : 0,
        data: undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async link(args: LinkArguments): Promise<Result<undefined>> {
    if (!args.deviceId) {
      throw new Error(`Device ID cannot be empty!`);
    }
    if (!args.userId) {
      throw new Error(`User ID cannot be empty!`);
    }

    const request = new HttpRequest(
      this.createURL(`/link`),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        deviceId: args.deviceId,
        userId: args.userId,
      })
    );

    try {
      const response = await this.httpClient.send(request);

      if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
        return this.handleError(response);
      }

      const remaining = Client.parseCallsRemaining(response);

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining !== undefined ? parseInt(remaining, 10) : 0,
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

    if (!domain) {
      throw new Error("Domain cannot be empty!");
    }

    const request = new HttpRequest(
      this.createURL(`/tracking/snippet?domain=${encodeURIComponent(domain)}`),
      "GET",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      })
    );

    try {
      const response = await this.httpClient.send(request);

      if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
        return this.handleError(response);
      }

      const parsed = JSON.parse(response.getBody()).data;
      const remaining = Client.parseCallsRemaining(response);
      const snippet = parsed.snippet;

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining !== undefined ? parseInt(remaining, 10) : 0,
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
      this.createURL("/validate"),
      "GET",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      })
    );

    try {
      const response = await this.httpClient.send(request);
      const details: ApiKeyDetails = JSON.parse(response.getBody()).data;
      const remaining = Client.parseCallsRemaining(response);

      if (response.getStatusCode() < 200 || response.getStatusCode() >= 300) {
        return this.handleError(response);
      }

      return {
        success: true,
        requestId: JSON.parse(response.getBody()).meta.requestId,
        callsRemaining: remaining !== undefined ? parseInt(remaining, 10) : 0,
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
  permissions: string[];
}

export interface UpsertUserArguments {
  email: string;
  userId: string;
  properties?: Properties;
}

export interface UpsertAccountArguments {
  accountId: string;
  name: string;
  properties?: Properties;
  memberIds?: string[];
}

export interface LinkArguments {
  deviceId: string;
  userId: string;
}

export interface GetTrackingSnippetArguments {
  domain: string;
}

export interface TrackingSnippetResponse {
  domain: string;
  snippet: string;
}
