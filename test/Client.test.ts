import {
  ApiKeySpecs,
  JournyClient,
  ClientResponseData,
  createJournyClient,
  JourneyClientError,
  ProfileResponse,
  TrackingSnippetResponse,
} from "../lib/Client";
import {
  HttpClientMatch,
  HttpClientThatThrows,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from "../lib/HttpClient";

describe("createJournyClient", () => {
  it("fails when the config is invalid", () => {
    expect(() => createJournyClient({ apiKeySecret: "", apiUrl: "" })).toThrow(
      Error
    );
    expect(() =>
      createJournyClient({ apiKeySecret: "non-empty-key", apiUrl: "" })
    ).toThrow(Error);
    expect(() =>
      createJournyClient({ apiKeySecret: "", apiUrl: "non-empty-url" })
    ).toThrow(Error);
  });
  it("creates a journy client", () => {
    const client = createJournyClient({
      apiKeySecret: "key-secret",
      apiUrl: "https://api.test.com",
    });
    expect(client).toBeDefined();
  });
});

describe("JournyClient", () => {
  const clientConfig = {
    apiKeySecret: "key-secret",
    apiUrl: "https://api.test.com",
  };
  const nonExistingClientConfig = {
    apiKeySecret: "non-existing-key-secret",
    apiUrl: "https://api.test.com",
  };
  const keySecretHeader = new HttpHeaders({ "x-api-key": "key-secret" });
  const nonExistingKeySecretHeader = new HttpHeaders({
    "x-api-key": "non-existing-key-secret",
  });
  const rateLimitHeader = new HttpHeaders({ "X-RateLimit-Remaining": "5000" });
  const tooManyRateLimitHeader = new HttpHeaders({
    "X-RateLimit-Remaining": "0",
  });
  const tooManyRequestsResponse = new HttpResponse(429, tooManyRateLimitHeader);
  const unknownErrorResponse = new HttpResponse(444, rateLimitHeader);
  const serverErrorResponse = new HttpResponse(500, rateLimitHeader);
  const notFoundResponse = new HttpResponse(404, rateLimitHeader);
  const notAuthorizedResponse = new HttpResponse(401, rateLimitHeader);
  const badRequestResponse = new HttpResponse(400, rateLimitHeader);
  const createdResponse = new HttpResponse(201, rateLimitHeader);

  describe("getApiKeySpecs", () => {
    it("correctly errors when too many requests were made", async () => {
      const validateClient = new HttpClientMatch(tooManyRequestsResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(validateClient, clientConfig);
      const response: ClientResponseData<ApiKeySpecs> = await client.getApiKeySpecs();

      expect(validateClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(0);
      expect(response.error).toEqual(JourneyClientError.TooManyRequests);
      expect(response.data).toBeUndefined();
    });
    it("correctly perseveres an unknown error", async () => {
      const validateClient = new HttpClientMatch(unknownErrorResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(validateClient, clientConfig);
      const response: ClientResponseData<ApiKeySpecs> = await client.getApiKeySpecs();

      expect(validateClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.UnknownError);
      expect(response.data).toBeUndefined();
    });
    it("correctly perseveres a server error", async () => {
      const validateClient = new HttpClientMatch(serverErrorResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(validateClient, clientConfig);
      const response: ClientResponseData<ApiKeySpecs> = await client.getApiKeySpecs();

      expect(validateClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.ServerError);
      expect(response.data).toBeUndefined();
    });
    it("should correctly get api key specs", async () => {
      const validateClient1 = new HttpClientMatch(
        new HttpResponse(
          200,
          rateLimitHeader,
          JSON.stringify({
            permissions: ["TrackData", "GetTrackingSnippet", "ReadUserProfile"],
            propertyGroupName: "test",
          })
        )
      );
      const expectedRequest1 = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        keySecretHeader
      );

      const validateClient2 = new HttpClientMatch(notFoundResponse);
      const expectedRequest2 = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        nonExistingKeySecretHeader
      );

      const client = new JournyClient(validateClient1, clientConfig);
      const client2 = new JournyClient(
        validateClient2,
        nonExistingClientConfig
      );
      const client3 = new JournyClient(
        new HttpClientThatThrows(),
        clientConfig
      );

      const response: ClientResponseData<ApiKeySpecs> = await client.getApiKeySpecs();
      expect(validateClient1.getLastRequest()).toEqual(expectedRequest1);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
      expect(response.data.permissions).toEqual([
        "TrackData",
        "GetTrackingSnippet",
        "ReadUserProfile",
      ]);
      expect(response.data.propertyGroupName).toEqual("test");

      const response2: ClientResponseData<ApiKeySpecs> = await client2.getApiKeySpecs();
      expect(validateClient2.getLastRequest()).toEqual(expectedRequest2);
      expect(response2).toBeDefined();
      expect(response2.success).toBeFalsy();
      expect(response2.callsRemaining).toEqual(5000);
      expect(response2.error).toEqual(JourneyClientError.NotFoundError);
      expect(response2.data).toBeUndefined();

      const response3: ClientResponseData<ApiKeySpecs> = await client3.getApiKeySpecs();
      expect(response3).toBeDefined();
      expect(response3.success).toBeFalsy();
      expect(response3.error).toEqual(JourneyClientError.UnknownError);
      expect(response3.callsRemaining).toBeUndefined();
      expect(response3.data).toBeUndefined();
    });
  });
  describe("trackEvent", () => {
    it("correctly tracks an event", async () => {
      const eventClient = new HttpClientMatch(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/events"),
        "POST",
        keySecretHeader,
        {
          email: "test@journy.io",
          tag: "tag",
          campaign: "campaign",
          source: "source",
        }
      );

      const client = new JournyClient(eventClient, clientConfig);
      const response = await client.trackEvent({
        email: "test@journy.io",
        tag: "tag",
        campaign: "campaign",
        source: "source",
      });
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
    });
    it("correctly handles dates", async () => {
      const eventClient = new HttpClientMatch(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/events"),
        "POST",
        keySecretHeader,
        {
          email: "test@journy.io",
          tag: "tag",
          campaign: "campaign",
          source: "source",
          recordedAt: "2019-01-01T00:00:00.000Z",
        }
      );

      const client = new JournyClient(eventClient, clientConfig);
      const response = await client.trackEvent({
        email: "test@journy.io",
        tag: "tag",
        campaign: "campaign",
        source: "source",
        recordedAt: new Date("2019-01-01T00:00:00.000Z"),
      });

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
    });
    it("correctly states when the input is invalid", async () => {
      const eventClient = new HttpClientMatch(badRequestResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/events"),
        "POST",
        keySecretHeader,
        {
          email: "notAnEmail",
          tag: "tag",
          campaign: "campaign",
          source: "source",
        }
      );

      const client = new JournyClient(eventClient, clientConfig);
      const response1 = await client.trackEvent({
        email: "notAnEmail",
        tag: "tag",
        campaign: "campaign",
        source: "source",
      });

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      expect(response1.error).toBeDefined();
      expect(response1.error).toEqual(JourneyClientError.BadArgumentsError);
    });
  });
  describe("trackProperties", () => {
    it("correctly tracks properties", async () => {
      const propertiesClient = new HttpClientMatch(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/properties"),
        "POST",
        new HttpHeaders({ "x-api-key": "key-secret" }),
        {
          email: "test@journy.io",
          journeyProperties: {
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
            likesDog: "true",
            firstDogName: "Journy",
          },
        }
      );

      const client = new JournyClient(propertiesClient, clientConfig);
      const response = await client.trackProperties({
        email: "test@journy.io",
        journeyProperties: {
          likesDog: true,
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          firstDogName: "Journy",
        },
      });

      expect(propertiesClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
    });
    it("correctly shows when the input parameters are invalid", async () => {
      const propertiesClient = new HttpClientMatch(badRequestResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/properties"),
        "POST",
        new HttpHeaders({ "x-api-key": "key-secret" }),
        {
          email: "test@journy.io",
          journeyProperties: undefined,
        }
      );

      const client = new JournyClient(propertiesClient, clientConfig);
      const response1 = await client.trackProperties({
        email: "test@journy.io",
        journeyProperties: undefined,
      });

      expect(propertiesClient.getLastRequest()).toEqual(expectedRequest);
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      expect(response1.error).toBeDefined();
      expect(response1.error).toEqual(JourneyClientError.BadArgumentsError);
    });
  });
  describe("getProfile", () => {
    it("correctly returns a profile", async () => {
      const profile = {
        id: "1",
        engagementScore: 0,
        emailAddress: "test@journy.io",
        devices: [],
        touchpoints: [],
      };
      const profileClient = new HttpClientMatch(
        new HttpResponse(
          200,
          new HttpHeaders({ "X-RateLimit-Remaining": "5000" }),
          JSON.stringify(profile)
        )
      );
      const expectedResponse = new HttpRequest(
        new URL(
          "https://api.test.com/journeys/profiles?email=test%40journy.io"
        ),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(profileClient, clientConfig);
      const response: ClientResponseData<ProfileResponse> = await client.getProfile(
        { email: "test@journy.io" }
      );

      expect(profileClient.getLastRequest()).toEqual(expectedResponse);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.email).toEqual("test@journy.io");
      expect(response.data.profile).toEqual(profile);
    });
    it("correctly fails with incorrect arguments", async () => {
      const profileClient = new HttpClientMatch(badRequestResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/profiles?email="),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(profileClient, clientConfig);
      const response: ClientResponseData<ProfileResponse> = await client.getProfile(
        { email: "" }
      );

      expect(profileClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.BadArgumentsError);
      expect(response.data).toBeUndefined();
    });
    it("correctly fails when not authorized", async () => {
      const profileClient = new HttpClientMatch(notAuthorizedResponse);
      const expectedRequest = new HttpRequest(
        new URL(
          "https://api.test.com/journeys/profiles?email=test%40journy.io"
        ),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(profileClient, clientConfig);
      const response: ClientResponseData<ProfileResponse> = await client.getProfile(
        { email: "test@journy.io" }
      );

      expect(profileClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.UnauthorizedError);
      expect(response.data).toBeUndefined();
    });
  });
  describe("getTrackingSnippet", () => {
    it("correctly returns an existing snippet", async () => {
      const trackingsnippetClient = new HttpClientMatch(
        new HttpResponse(
          200,
          new HttpHeaders({ "X-RateLimit-Remaining": "5000" }),
          JSON.stringify({
            domain: "journy.io",
            snippet: "<script>snippet</script>",
          })
        )
      );
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/tracking/snippet?domain=journy.io"),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(trackingsnippetClient, clientConfig);
      const response: ClientResponseData<TrackingSnippetResponse> = await client.getTrackingSnippet(
        {
          domain: "journy.io",
        }
      );

      expect(trackingsnippetClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.data.domain).toEqual("journy.io");
      expect(response.data.snippet).toBeDefined();
    });
    it("correctly notifies a domain not being found", async () => {
      const trackingsnippetClient = new HttpClientMatch(notFoundResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/tracking/snippet?domain=nonexisting.com"),
        "GET",
        keySecretHeader
      );

      const client = new JournyClient(trackingsnippetClient, clientConfig);
      const response: ClientResponseData<TrackingSnippetResponse> = await client.getTrackingSnippet(
        {
          domain: "nonexisting.com",
        }
      );
      expect(trackingsnippetClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.NotFoundError);
      expect(response.data).toBeUndefined();
    });
  });
});
