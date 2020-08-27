import {
  ApiKeySpecs,
  Client,
  ClientResponseData,
  createJournyClient,
  JourneyClientError,
  ProfileResponse,
  TrackingSnippetResponse,
} from "../lib";
import nock = require("nock");

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
  let client1: Client;
  let client2: Client;
  let client3: Client;
  it("creates journy clients", async () => {
    client1 = await createJournyClient({
      apiKeySecret: "key-secret",
      apiUrl: "https://api.test.com",
    });
    client2 = await createJournyClient({
      apiKeySecret: "non-existing-secret",
      apiUrl: "https://api.test.com",
    });
    client3 = await createJournyClient({
      apiKeySecret: "key-secret",
      apiUrl: "https://wrong.api.test.com",
    });
  });
  describe("getApiKeySpecs", () => {
    it("correctly errors when too many requests were made", async () => {
      nock("https://api.test.com")
        .get("/validate")
        .matchHeader("x-api-key", "key-secret")
        .reply(
          429,
          {
            status: "429: Too many requests",
            message: "Too many requests were made to the API.",
          },
          { "X-RateLimit-Remaining": "0" }
        );
      const response: ClientResponseData<ApiKeySpecs> = await client1.getApiKeySpecs();
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(0);
      expect(response.error).toEqual(JourneyClientError.TooManyRequests);
      expect(response.data).toBeUndefined();
    });
    it("correctly perseveres an unknown error", async () => {
      nock("https://api.test.com")
        .get("/validate")
        .matchHeader("x-api-key", "key-secret")
        .reply(
          444,
          {
            status: "444: Unknown error",
            message: "This error is not known.",
          },
          { "X-RateLimit-Remaining": "5000" }
        );
      const response: ClientResponseData<ApiKeySpecs> = await client1.getApiKeySpecs();
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.UnknownError);
      expect(response.data).toBeUndefined();
    });
    it("correctly perseveres a server error", async () => {
      nock("https://api.test.com")
        .get("/validate")
        .matchHeader("x-api-key", "key-secret")
        .reply(
          500,
          {
            status: "500: Server error",
            message: "This error is from the server.",
          },
          { "X-RateLimit-Remaining": "5000" }
        );
      const response: ClientResponseData<ApiKeySpecs> = await client1.getApiKeySpecs();
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.ServerError);
      expect(response.data).toBeUndefined();
    });
    it("should correctly get api key specs", async () => {
      nock("https://api.test.com")
        .get("/validate")
        .matchHeader("x-api-key", "key-secret")
        .reply(
          200,
          {
            permissions: ["TrackData", "GetTrackingSnippet", "ReadUserProfile"],
            propertyGroupName: "test",
          },
          { "X-RateLimit-Remaining": "5000" }
        );
      nock("https://api.test.com")
        .get("/validate")
        .matchHeader("x-api-key", "non-existing-secret")
        .reply(
          404,
          {
            message: "404: Not found",
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response: ClientResponseData<ApiKeySpecs> = await client1.getApiKeySpecs();
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
      nock("https://api.test.com")
        .post("/journeys/events", {
          email: "test@journy.io",
          tag: "tag",
          campaign: "campaign",
          source: "source",
        })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          200,
          {
            status: "201: Created",
            message: "The event was succesfully tracked.",
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response = await client1.trackEvent({
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
      nock("https://api.test.com")
        .post("/journeys/events", {
          email: "test@journy.io",
          tag: "tag",
          campaign: "campaign",
          source: "source",
          recordedAt: "2019-01-01T00:00:00.000Z",
        })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          200,
          {
            status: "201: Created",
            message: "The event was succesfully tracked.",
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response = await client1.trackEvent({
        email: "test@journy.io",
        tag: "tag",
        campaign: "campaign",
        source: "source",
        recordedAt: new Date("2019-01-01T00:00:00.000Z"),
      });
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
    });
    it("correctly states when the input is invalid", async () => {
      nock("https://api.test.com")
        .post("/journeys/events", {
          email: "notAnEmail",
          tag: "tag",
          campaign: "campaign",
          source: "source",
        })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          400,
          {
            status: "400: Bad Request",
            message:
              "Some fields/ parameters were filled in incorrectly or were missing.",
            errors: {
              fields: {
                email:
                  "The field email's type and/ or format is incorrect. Expected type: string, expected format (if not undefined): email",
              },
            },
          },
          { "X-RateLimit-Remaining": "5000" }
        );
      const response1 = await client1.trackEvent({
        email: "notAnEmail",
        tag: "tag",
        campaign: "campaign",
        source: "source",
      });
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      expect(response1.error).toBeDefined();
      expect(response1.error).toEqual(JourneyClientError.BadArgumentsError);
    });
  });
  describe("trackProperties", () => {
    it("correctly tracks properties", async () => {
      nock("https://api.test.com")
        .post("/journeys/properties", {
          email: "test@journy.io",
          journeyProperties: {
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
          },
        })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          201,
          {
            status: "201: Created",
            message: "The properties were succesfully tracked.",
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response = await client1.trackProperties({
        email: "test@journy.io",
        journeyProperties: {
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
        },
      });
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toBeUndefined();
    });
    it("correctly shows when the input parameters are invalid", async () => {
      nock("https://api.test.com")
        .post("/journeys/properties", {
          email: "test@journy.io",
          journeyProperties: undefined,
        })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          400,
          {
            status: "400: Bad Request",
            message:
              "Some fields/ parameters were filled in incorrectly or were missing.",
            errors: {
              fields: {
                journeyProperties: "The 'journeyProperties' field is required.",
              },
            },
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response1 = await client1.trackProperties({
        email: "test@journy.io",
        journeyProperties: undefined,
      });
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
      nock("https://api.test.com")
        .get("/journeys/profiles")
        .query({ email: "test@journy.io" })
        .matchHeader("x-api-key", "key-secret")
        .reply(200, profile, { "X-RateLimit-Remaining": "1234" });
      const response: ClientResponseData<ProfileResponse> = await client1.getProfile(
        { email: "test@journy.io" }
      );
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(1234);
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.email).toEqual("test@journy.io");
      expect(response.data.profile).toEqual(profile);
    });
    it("correctly fails with incorrect arguments", async () => {
      const bad = {
        status: "400: Bad Request",
        message:
          "Some fields/ parameters were filled in incorrectly or were missing.",
        errors: {
          parameters: {
            query: {
              email:
                "The parameter email's type and/ or format is incorrect. Expected type: string, expected format (if not undefined): email",
            },
          },
        },
      };
      nock("https://api.test.com")
        .get("/journeys/profiles")
        .matchHeader("x-api-key", "key-secret")
        .query({ email: "" })
        .reply(400, bad, { "X-RateLimit-Remaining": "5000" });
      const response: ClientResponseData<ProfileResponse> = await client1.getProfile(
        { email: "" }
      );
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.BadArgumentsError);
      expect(response.data).toBeUndefined();
    });
    it("correctly fails when not authorized", async () => {
      const bad = {
        status: "401: Unauthorized",
        message:
          "You are not authorized to access the '/journeys/profiles' endpoint.",
      };
      nock("https://api.test.com")
        .get("/journeys/profiles")
        .matchHeader("x-api-key", "key-secret")
        .query({ email: "" })
        .reply(401, bad, { "X-RateLimit-Remaining": "5000" });
      const response: ClientResponseData<ProfileResponse> = await client1.getProfile(
        { email: "" }
      );
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.UnauthorizedError);
      expect(response.data).toBeUndefined();
    });
  });
  describe("getTrackingSnippet", () => {
    it("correctly returns an existing snippet", async () => {
      nock("https://api.test.com")
        .get("/tracking/snippet")
        .query({ domain: "journy.io" })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          200,
          {
            domain: "journy.io",
            snippet: "<script>snippet</script>",
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response: ClientResponseData<TrackingSnippetResponse> = await client1.getTrackingSnippet(
        {
          domain: "journy.io",
        }
      );
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.data.domain).toEqual("journy.io");
      expect(response.data.snippet).toBeDefined();
    });
    it("correctly notifies a domain not being found", async () => {
      nock("https://api.test.com")
        .get("/tracking/snippet")
        .query({ domain: "nonexisting.com" })
        .matchHeader("x-api-key", "key-secret")
        .reply(
          404,
          {
            status: "404: Not Found",
            message: "The domain 'nonexisting.com' could not be found.",
          },
          { "X-RateLimit-Remaining": "5000" }
        );

      const response: ClientResponseData<TrackingSnippetResponse> = await client1.getTrackingSnippet(
        {
          domain: "nonexisting.com",
        }
      );
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      expect(response.error).toEqual(JourneyClientError.NotFoundError);
      expect(response.data).toBeUndefined();
    });
  });
});
