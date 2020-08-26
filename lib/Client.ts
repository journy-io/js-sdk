import {
  HttpClient,
  HttpHeaders,
  HttpRequest,
  HttpRequestError,
} from "./HttpClient";
import { Config } from "./Config";
import { Profile } from "./models/Profile";
import { DateTime } from "luxon";

export interface ClientConfig {
  apiKeySecret: string;
  apiUrl: string;
}

export interface Client {
  /**
   * Initialize the Client.
   * @returns the PropertyGroupName and the Permissions
   * of the specific ApiKey, and test your configuration.
   * Returns a ClientError if something went wrong (not authorized...).
   */
  init(): Promise<ClientResponseData<InitResponse>>;

  /**
   * Track a user event.
   * @param args The input to track the event
   * @returns A response stating the event was tracked correctly,
   * or an error stating the tracking failed (bad parameters, not authorized...).
   * @throws Error if the Client was not yet initialized.
   */
  trackEvent(args: TrackEventArguments): Promise<ClientResponse>;

  /**
   * Track properties of a user.
   * @param args The input to track the user properties.
   * @returns A response stating the properties were tracked correctly,
   * or an error stating the tracking failed (bad parameters, not authorized...).
   * @throws Error if the Client was not yet initialized.
   */
  trackProperties(args: TrackPropertiesArguments): Promise<ClientResponse>;

  /**
   * Get the profile of a user.
   * @param args The parameters to retrieve the profile.
   * @returns A response with the profile, or an error stating something
   * failed (not found, not authorized...).
   * @throws Error if the Client was not yet initialized.
   */
  getProfile(
    args: GetProfileArguments
  ): Promise<ClientResponseData<ProfileResponse>>;

  /**
   * Get a tracking snippet.
   * @param args The parameters to retrieve the Tracking Snippet.
   * @returns A response with the snippet, or an error stating something
   * failed (not found, not authorized...).
   * @throws Error if the Client was not yet initialized.
   */
  getTrackingSnippet(
    args: GetTrackingSnippetArguments
  ): Promise<ClientResponseData<TrackingSnippetResponse>>;
}

/**
 * Creates a Client.
 * @param clientConfig The configuration for the Client.
 */
export function createJournyClient(clientConfig: ClientConfig): Client {
  validateClientConfig(clientConfig);
  return new JournyClient(new Config(clientConfig.apiKeySecret), clientConfig);
}

function validateClientConfig(clientConfig: ClientConfig) {
  if (!clientConfig.apiUrl || !clientConfig.apiUrl.trim().length) {
    throw new Error(`The API URL can not be empty.`);
  } else if (
    !clientConfig.apiKeySecret ||
    !clientConfig.apiKeySecret.trim().length
  ) {
    throw new Error(`The API Key secret can not be empty.`);
  }
}

class JournyClient implements Client {
  private readonly httpClient: HttpClient;
  private initialized: boolean = false;

  constructor(
    private readonly config: Config,
    private readonly clientConfig: ClientConfig
  ) {
    this.httpClient = this.config.getHttpClient();
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

  private assertInitialized() {
    if (!this.initialized) {
      throw new Error(
        `The Client is not yet initialized. You should first call '.init()' to initialize the Client.`
      );
    }
  }

  async init(): Promise<ClientResponseData<InitResponse>> {
    if (this.initialized) {
      throw new Error(`The Client is already initialized.`);
    }
    const request = new HttpRequest(this.createURL(`/validate`), "GET");
    try {
      const response = await this.httpClient.send(request);
      const initResponse: InitResponse = JSON.parse(response.getBody());
      this.initialized = true;
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("X-RateLimit-Remaining")
        ),
        data: initResponse,
      };
    } catch (error) {
      return JournyClient.handleError(error);
    }
  }

  async trackEvent(args: TrackEventArguments): Promise<ClientResponse> {
    this.assertInitialized();
    const request = new HttpRequest(
      this.createURL(`/journeys/events`),
      "POST",
      new HttpHeaders(),
      args
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
    this.assertInitialized();
    const request = new HttpRequest(
      this.createURL(`/journeys/properties`),
      "POST",
      new HttpHeaders(),
      args
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
    this.assertInitialized();
    const { email } = args;
    const request = new HttpRequest(
      this.createURL(`/journeys/profiles?email=${encodeURI(email)}`),
      "GET"
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
    this.assertInitialized();
    const { domain } = args;
    const request = new HttpRequest(
      this.createURL(`/tracking/snippet?domain=${encodeURI(domain)}`),
      "GET"
    );
    try {
      const response = await this.httpClient.send(request);
      const parsed = JSON.parse(response.getBody());
      const snippet = parsed.snippet;
      return {
        success: true,
        callsRemaining: parseInt(
          response.getHeaders().byName("x-rateLimit-remaining")
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

type Properties = { [key: string]: any };

export interface ClientResponse {
  success: boolean;
  callsRemaining: number | undefined;
  error?: JourneyClientError;
}

export interface ClientResponseData<T> extends ClientResponse {
  data?: T;
}

export interface InitResponse {
  propertyGroupName: string;
  permissions: string[];
}

export interface TrackEventArguments {
  email: string;
  tag: string;
  campaign: string;
  source: string;
  recordedAt?: DateTime;
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
