import {
  HttpClient,
  HttpClientNode,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from "@journyio/http";
import { URL } from "url";
import { AccountIdentified } from "./AccountIdentified";
import { Event, Metadata } from "./Event";
import { UserIdentified } from "./UserIdentified";

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
    const formatted: { [name: string]: string | string[] } = {};
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

      if (Array.isArray(value)) {
        formatted[name] = value.map((el: string) => el.toString());
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
    const user = event.getUser();
    const account = event.getAccount();

    if (!user && !account) {
      throw new Error("User or account needs to set!");
    }

    const request = new HttpRequest(
      this.createURL("/events"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        identification: {
          user: user ? this.getUserIdentification(user) : undefined,
          account: account ? this.getAccountIdentification(account) : undefined,
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
    const identification = new UserIdentified(args.userId, args.email);
    const request = new HttpRequest(
      this.createURL("/users/upsert"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        identification: this.getUserIdentification(identification),
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

  private getUserIdentification(user: UserIdentified) {
    return {
      userId: user.getUserId(),
      email: user.getEmail(),
    };
  }

  private getAccountIdentification(account: AccountIdentified) {
    return {
      accountId: account.getAccountId(),
      domain: account.getDomain(),
    };
  }

  async upsertAccount(
    args: UpsertAccountArguments
  ): Promise<Result<undefined>> {
    const identification = new AccountIdentified(args.accountId, args.domain);
    const request = new HttpRequest(
      this.createURL("/accounts/upsert"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        identification: this.getAccountIdentification(identification),
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

  async addUsersToAccount(
    args: AddUserToAccountArguments
  ): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL("/accounts/users/add"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        account: this.getAccountIdentification(args.account),
        users: args.users.map((user) => this.getUserIdentification(user)),
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

  async removeUsersFromAccount(
    args: RemoveUserToAccountArguments
  ): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL("/accounts/users/remove"),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        account: this.getAccountIdentification(args.account),
        users: args.users.map((user) => this.getUserIdentification(user)),
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

    const identification = new UserIdentified(args.userId, args.email);
    const request = new HttpRequest(
      this.createURL(`/link`),
      "POST",
      new HttpHeaders({
        ...this.getHeaders().toObject(),
        "Content-Type": "application/json",
      }),
      JSON.stringify({
        deviceId: args.deviceId,
        identification: this.getUserIdentification(identification),
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
  Forbidden = "Forbidden",
  ServerError = "ServerError",
  UnauthorizedError = "UnauthorizedError",
  BadArgumentsError = "BadArgumentsError",
  TooManyRequests = "TooManyRequests",
  NotFoundError = "NotFoundError",
  UnknownError = "UnknownError",
  Unprocessable = "Unprocessable",
}

function statusCodeToError(status: number): APIError {
  switch (status) {
    case 400:
      return APIError.BadArgumentsError;
    case 401:
      return APIError.UnauthorizedError;
    case 403:
      return APIError.Forbidden;
    case 404:
      return APIError.NotFoundError;
    case 422:
      return APIError.Unprocessable;
    case 429:
      return APIError.TooManyRequests;
    case 500:
      return APIError.ServerError;
    default:
      return APIError.UnknownError;
  }
}

export type Properties = {
  [key: string]: string | number | boolean | Date | null | string[];
};

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
  email?: string;
  userId?: string;
  properties?: Properties;
}

export interface UpsertAccountArguments {
  accountId?: string;
  domain?: string;
  properties?: Properties;
}

interface UserToAccountArguments {
  account: AccountIdentified;
  users: UserIdentified[];
}

export type AddUserToAccountArguments = UserToAccountArguments;
export type RemoveUserToAccountArguments = UserToAccountArguments;

export interface LinkArguments {
  deviceId: string;
  userId?: string;
  email?: string;
}

export interface GetTrackingSnippetArguments {
  domain: string;
}

export interface TrackingSnippetResponse {
  domain: string;
  snippet: string;
}
