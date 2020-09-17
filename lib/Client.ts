import {
  HttpClient,
  HttpHeaders,
  HttpRequest,
  HttpRequestError,
} from "./HttpClient";
import { Config } from "./Config";

export interface ClientConfig {
  apiKeySecret: string;
  apiUrl: string;
}

const isBrowser =
  typeof window !== "undefined" && typeof window.document !== "undefined";

/**
 * Creates a Client.
 * @param clientConfig The configuration for the Client.
 */
export function createClient(clientConfig: ClientConfig): Client {
  const config = new Config();
  return new Client(config.getHttpClient(), clientConfig);
}

export class Client {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly clientConfig: ClientConfig
  ) {
    if (isBrowser) {
      throw new Error(
        `You can't use our client in the browser, because you may leak your API Key secret.`
      );
    }
    Client.validateClientConfig(clientConfig);
  }

  private createURL(path: string) {
    return new URL(this.clientConfig.apiUrl + path);
  }

  private static handleError(error: Error): Error {
    if (error instanceof HttpRequestError) {
      const remaining = error.getHeaders().byName("X-RateLimit-Remaining");
      return {
        success: false,
        callsRemaining: remaining ? parseInt(remaining) : undefined,
        error: statusCodeToError(error.getStatusCode()),
      };
    }
    return {
      success: false,
      error: JourneyClientError.UnknownError,
      callsRemaining: undefined,
    };
  }

  private static validateClientConfig(clientConfig: ClientConfig) {
    if (!clientConfig.apiUrl || !clientConfig.apiUrl.trim().length) {
      throw new Error(`The API URL can not be empty.`);
    } else if (
      !clientConfig.apiKeySecret ||
      !clientConfig.apiKeySecret.trim().length
    ) {
      throw new Error(`The API Key secret can not be empty.`);
    }
  }

  /**
   * Track a user event.
   * @param args The input to track the event
   * @returns A response stating the event was tracked correctly,
   * or an error stating the tracking failed (bad parameters, not authorized...).
   */
  async trackEvent(args: TrackEventArguments): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL(`/journeys/events`),
      "POST",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret }),
      {
        email: args.email,
        tag: args.tag,
        campaign: args.campaign,
        source: args.source,
        recordedAt: args.recordedAt ? args.recordedAt.toISOString() : undefined,
        properties: args.properties
          ? stringifyProperties(args.properties)
          : undefined,
      }
    );
    try {
      const response = await this.httpClient.send(request);
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");
      return {
        success: true,
        callsRemaining: remaining ? parseInt(remaining) : undefined,
        data: undefined,
      };
    } catch (error) {
      return Client.handleError(error);
    }
  }

  /**
   * Track properties of a user.
   * @param args The input to track the user properties.
   * @returns A response stating the properties were tracked correctly,
   * or an error stating the tracking failed (bad parameters, not authorized...).
   */
  async trackProperties(
    args: TrackPropertiesArguments
  ): Promise<Result<undefined>> {
    const request = new HttpRequest(
      this.createURL(`/journeys/properties`),
      "POST",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret }),
      {
        email: args.email,
        properties: args.properties
          ? stringifyProperties(args.properties)
          : undefined,
      }
    );
    try {
      const response = await this.httpClient.send(request);
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");
      return {
        success: true,
        callsRemaining: remaining ? parseInt(remaining) : undefined,
        data: undefined,
      };
    } catch (error) {
      return Client.handleError(error);
    }
  }

  /**
   * Get a tracking snippet.
   * @param args The parameters to retrieve the Tracking Snippet.
   * @returns A response with the snippet, or an error stating something
   * failed (not found, not authorized...).
   */
  async getTrackingSnippet(
    args: GetTrackingSnippetArguments
  ): Promise<Result<TrackingSnippetResponse>> {
    const { domain } = args;
    const request = new HttpRequest(
      this.createURL(`/tracking/snippet?domain=${encodeURIComponent(domain)}`),
      "GET",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret })
    );
    try {
      const response = await this.httpClient.send(request);
      const parsed = JSON.parse(response.getBody());
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");
      const snippet = parsed.snippet;
      return {
        success: true,
        callsRemaining: remaining ? parseInt(remaining) : undefined,
        data: {
          domain: domain,
          snippet: snippet,
        },
      };
    } catch (error) {
      return Client.handleError(error);
    }
  }

  /**
   * Get specs about the API Key such as the permissions and the property-roup-name.
   * @returns The Api Key Specs.
   */
  async getApiKeySpecs(): Promise<Result<ApiKeySpecs>> {
    const request = new HttpRequest(
      this.createURL(`/validate`),
      "GET",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret })
    );
    try {
      const response = await this.httpClient.send(request);
      const specs: ApiKeySpecs = JSON.parse(response.getBody());
      const remaining = response.getHeaders().byName("X-RateLimit-Remaining");
      return {
        success: true,
        callsRemaining: remaining ? parseInt(remaining) : undefined,
        data: specs,
      };
    } catch (error) {
      return Client.handleError(error);
    }
  }
}

export enum JourneyClientError {
  ServerError = "ServerError",
  UnauthorizedError = "UnauthorizedError",
  BadArgumentsError = "BadArgumentsError",
  TooManyRequests = "TooManyRequests",
  NotFoundError = "NotFoundError",
  UnknownError = "UnknownError",
}

function statusCodeToError(status: number): JourneyClientError {
  switch (status) {
    case 401:
      return JourneyClientError.UnauthorizedError;
    case 400:
      return JourneyClientError.BadArgumentsError;
    case 429:
      return JourneyClientError.TooManyRequests;
    case 404:
      return JourneyClientError.NotFoundError;
    case 500:
      return JourneyClientError.ServerError;
    default:
      return JourneyClientError.UnknownError;
  }
}

export type Properties = { [key: string]: string | number | boolean | Date };

function stringifyProperties(properties: Properties) {
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

export type Result<T> = Success<T> | Error;

export interface Success<T> {
  success: true;
  callsRemaining: number | undefined;
  data: T;
}

export interface Error {
  success: false;
  callsRemaining: number | undefined;
  error: JourneyClientError;
}

export interface ApiKeySpecs {
  propertyGroupName: string;
  permissions: string[];
}

export interface TrackEventArguments {
  email: string;
  tag: string;
  campaign: string;
  source: string;
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
