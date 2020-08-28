import {
  HttpClient,
  HttpHeaders,
  HttpRequest,
  HttpRequestError,
} from "./HttpClient";
import { Config } from "./Config";
import { Profile } from "./models/Profile";

export interface ClientConfig {
  apiKeySecret: string;
  apiUrl: string;
}

export interface Client {
  /**
   * Track a user event.
   * @param args The input to track the event
   * @returns A response stating the event was tracked correctly,
   * or an error stating the tracking failed (bad parameters, not authorized...).
   */
  trackEvent(args: TrackEventArguments): Promise<ClientResponse>;

  /**
   * Track properties of a user.
   * @param args The input to track the user properties.
   * @returns A response stating the properties were tracked correctly,
   * or an error stating the tracking failed (bad parameters, not authorized...).
   */
  trackProperties(args: TrackPropertiesArguments): Promise<ClientResponse>;

  /**
   * Get the profile of a user.
   * @param args The parameters to retrieve the profile.
   * @returns A response with the profile, or an error stating something
   * failed (not found, not authorized...).
   */
  getProfile(
    args: GetProfileArguments
  ): Promise<ClientResponseData<ProfileResponse>>;

  /**
   * Get a tracking snippet.
   * @param args The parameters to retrieve the Tracking Snippet.
   * @returns A response with the snippet, or an error stating something
   * failed (not found, not authorized...).
   */
  getTrackingSnippet(
    args: GetTrackingSnippetArguments
  ): Promise<ClientResponseData<TrackingSnippetResponse>>;

  /**
   * Get specs about the API Key such as the permissions and the property-roup-name.
   * @returns The Api Key Specs.
   */
  getApiKeySpecs(): Promise<ClientResponseData<ApiKeySpecs>>;
}

/**
 * Creates a Client.
 * @param clientConfig The configuration for the Client.
 */
export function createJournyClient(clientConfig: ClientConfig): Client {
  const config = new Config();
  return new JournyClient(config.getHttpClient(), clientConfig);
}

export class JournyClient implements Client {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly clientConfig: ClientConfig
  ) {
    JournyClient.validateClientConfig(clientConfig);
  }

  private createURL(path: string) {
    return new URL(this.clientConfig.apiUrl + path);
  }

  private static handleError(error: Error): ClientResponse {
    if (error instanceof HttpRequestError) {
      return {
        success: false,
        callsRemaining: parseInt(
          error.getHeaders().byName("X-RateLimit-Remaining")
        ),
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

  async trackEvent(args: TrackEventArguments): Promise<ClientResponse> {
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
        journeyProperties: args.journeyProperties
          ? stringifyProperties(args.journeyProperties)
          : undefined,
      }
    );
    try {
      const response = await this.httpClient.send(request);
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("X-RateLimit-Remaining")
        ),
      };
    } catch (error) {
      return JournyClient.handleError(error);
    }
  }

  async trackProperties(
    args: TrackPropertiesArguments
  ): Promise<ClientResponse> {
    const request = new HttpRequest(
      this.createURL(`/journeys/properties`),
      "POST",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret }),
      {
        email: args.email,
        journeyProperties: args.journeyProperties
          ? stringifyProperties(args.journeyProperties)
          : undefined,
      }
    );
    try {
      const response = await this.httpClient.send(request);
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("X-RateLimit-Remaining")
        ),
      };
    } catch (error) {
      return JournyClient.handleError(error);
    }
  }

  async getProfile(
    args: GetProfileArguments
  ): Promise<ClientResponseData<ProfileResponse>> {
    const { email } = args;
    const request = new HttpRequest(
      this.createURL(`/journeys/profiles?email=${encodeURI(email)}`),
      "GET",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret })
    );
    try {
      const response = await this.httpClient.send(request);
      const profile: Profile = JSON.parse(response.getBody());
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("X-RateLimit-Remaining")
        ),
        data: {
          email: email,
          profile: profile,
        },
      };
    } catch (error) {
      return JournyClient.handleError(error);
    }
  }

  async getTrackingSnippet(
    args: GetTrackingSnippetArguments
  ): Promise<ClientResponseData<TrackingSnippetResponse>> {
    const { domain } = args;
    const request = new HttpRequest(
      this.createURL(`/tracking/snippet?domain=${encodeURI(domain)}`),
      "GET",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret })
    );
    try {
      const response = await this.httpClient.send(request);
      const parsed = JSON.parse(response.getBody());
      const snippet = parsed.snippet;
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("X-RateLimit-Remaining")
        ),
        data: {
          domain: domain,
          snippet: snippet,
        },
      };
    } catch (error) {
      return JournyClient.handleError(error);
    }
  }

  async getApiKeySpecs(): Promise<ClientResponseData<ApiKeySpecs>> {
    const request = new HttpRequest(
      this.createURL(`/validate`),
      "GET",
      new HttpHeaders({ "x-api-key": this.clientConfig.apiKeySecret })
    );
    try {
      const response = await this.httpClient.send(request);
      const specs: ApiKeySpecs = JSON.parse(response.getBody());
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("X-RateLimit-Remaining")
        ),
        data: specs,
      };
    } catch (error) {
      return JournyClient.handleError(error);
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
  for (let key of Object.keys(properties)) {
    const value = properties[key];
    if (value instanceof Date) {
      newProperties[key] = value.toISOString();
    } else {
      newProperties[key] = value.toString();
    }
  }
  return newProperties;
}

export interface ClientResponse {
  success: boolean;
  callsRemaining: number | undefined;
  error?: JourneyClientError;
}

export interface ClientResponseData<T> extends ClientResponse {
  data?: T;
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
  journeyProperties?: Properties;
}

export interface TrackPropertiesArguments {
  email: string;
  journeyProperties: Properties;
}

export interface GetProfileArguments {
  email: string;
}

export interface ProfileResponse {
  email: string;
  profile: Profile;
}

export interface GetTrackingSnippetArguments {
  domain: string;
}

export interface TrackingSnippetResponse {
  domain: string;
  snippet: string;
}
