import {
  HttpClientFixed,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
} from "@journyio/http";
import { Client, createClient, APIError, Config } from "./Client";

describe("createClient", () => {
  it("fails when the config is invalid", async () => {
    expect(() => {
      createClient({ apiKey: "" });
    }).toThrowError("The API key cannot be empty.");

    expect(() => {
      createClient({ apiKey: "api-key", apiUrl: "invalid-url" });
    }).toThrowError("The API url is not a valid URL: invalid-url");
  });

  it("creates a client with API url", () => {
    const client = createClient({
      apiKey: "key-secret",
      apiUrl: "https://api.test.com",
    });
    expect(client).toBeDefined();
  });

  it("creates a client", () => {
    const client = createClient({
      apiKey: "key-secret",
    });
    expect(client).toBeDefined();
  });
});

describe("Client", () => {
  const clientConfig: Config = {
    apiKey: "key-secret",
    apiUrl: "https://api.test.com",
  };
  const nonExistingClientConfig: Config = {
    apiKey: "non-existing-key-secret",
    apiUrl: "https://api.test.com",
  };
  const apiKeyHeaders = new HttpHeaders({
    "x-api-key": "key-secret",
  });
  const nonExistingKeySecretHeader = new HttpHeaders({
    "x-api-key": "non-existing-key-secret",
  });
  const rateLimitHeader = new HttpHeaders({ "X-RateLimit-Remaining": "5000" });
  const tooManyRateLimitHeader = new HttpHeaders({
    "X-RateLimit-Remaining": "0",
  });
  const defaultResponse = JSON.stringify({ meta: { requestId: "requestId" } });
  const tooManyRequestsResponse = new HttpResponse(
    429,
    tooManyRateLimitHeader,
    defaultResponse
  );
  const unknownErrorResponse = new HttpResponse(
    444,
    rateLimitHeader,
    defaultResponse
  );
  const serverErrorResponse = new HttpResponse(
    500,
    rateLimitHeader,
    defaultResponse
  );
  const notFoundResponse = new HttpResponse(
    404,
    rateLimitHeader,
    defaultResponse
  );
  const badRequestResponse = new HttpResponse(
    400,
    rateLimitHeader,
    defaultResponse
  );
  const createdResponse = new HttpResponse(
    201,
    rateLimitHeader,
    defaultResponse
  );

  describe("getApiKeyDetails", () => {
    it("correctly errors when too many requests were made", async () => {
      const validateClient = new HttpClientFixed(tooManyRequestsResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        apiKeyHeaders
      );

      const client = new Client(validateClient, clientConfig);
      const response = await client.getApiKeyDetails();

      expect(validateClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(0);
      if (!response.success) {
        expect(response.error).toEqual(APIError.TooManyRequests);
      }
    });

    it("correctly perseveres an unknown error", async () => {
      const validateClient = new HttpClientFixed(unknownErrorResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        apiKeyHeaders
      );

      const client = new Client(validateClient, clientConfig);
      const response = await client.getApiKeyDetails();

      expect(validateClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      if (!response.success) {
        expect(response.error).toEqual(APIError.UnknownError);
      }
    });

    it("correctly perseveres a server error", async () => {
      const validateClient = new HttpClientFixed(serverErrorResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        apiKeyHeaders
      );

      const client = new Client(validateClient, clientConfig);
      const response = await client.getApiKeyDetails();

      expect(validateClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      if (!response.success) {
        expect(response.error).toEqual(APIError.ServerError);
      }
    });

    it("should correctly get api key specs", async () => {
      const validateClient1 = new HttpClientFixed(
        new HttpResponse(
          200,
          rateLimitHeader,
          JSON.stringify({
            data: {
              permissions: [
                "TrackData",
                "GetTrackingSnippet",
                "ReadUserProfile",
              ],
            },
            meta: {
              requestId: "requestId",
            },
          })
        )
      );
      const expectedRequest1 = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        apiKeyHeaders
      );

      const validateClient2 = new HttpClientFixed(notFoundResponse);
      const expectedRequest2 = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        nonExistingKeySecretHeader
      );

      const client = new Client(validateClient1, clientConfig);
      const client2 = new Client(validateClient2, nonExistingClientConfig);
      const client3 = new Client(
        new HttpClientFixed(new HttpResponse(419)),
        clientConfig
      );

      const response = await client.getApiKeyDetails();
      expect(validateClient1.getLastRequest()).toEqual(expectedRequest1);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      if (response.success) {
        expect(response.data.permissions).toEqual([
          "TrackData",
          "GetTrackingSnippet",
          "ReadUserProfile",
        ]);
      }

      const response2 = await client2.getApiKeyDetails();
      expect(validateClient2.getLastRequest()).toEqual(expectedRequest2);
      expect(response2).toBeDefined();
      expect(response2.success).toBeFalsy();
      expect(response2.callsRemaining).toEqual(5000);
      if (response2.success === false) {
        expect(response2.error).toEqual(APIError.NotFoundError);
      }

      const response3 = await client3.getApiKeyDetails();
      expect(response3).toBeDefined();
      expect(response3.success).toBeFalsy();
      if (!response3.success) {
        expect(response3.error).toEqual(APIError.UnknownError);
      }
      expect(response3.callsRemaining).toBeUndefined();
    });
  });

  describe("trackEvent", () => {
    it("correctly tracks an event", async () => {
      const eventClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/events"),
        "POST",
        apiKeyHeaders,
        JSON.stringify({
          email: "test@journy.io",
          tag: "tag",
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response = await client.trackEvent({
        email: "test@journy.io",
        tag: "tag",
      });

      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
    });

    it("correctly handles dates", async () => {
      const eventClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/events"),
        "POST",
        new HttpHeaders({
          ...apiKeyHeaders.toObject(),
          "content-type": "application/json",
        }),
        JSON.stringify({
          email: "test@journy.io",
          tag: "tag",
          recordedAt: "2019-01-01T00:00:00.000Z",
          properties: {
            likesDog: "true",
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
            firstDogName: "Journy",
          },
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response = await client.trackEvent({
        email: "test@journy.io",
        tag: "tag",
        recordedAt: new Date("2019-01-01T00:00:00.000Z"),
        properties: {
          likesDog: true,
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          firstDogName: "Journy",
        },
      });

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
    });

    it("correctly states when the input is invalid", async () => {
      const eventClient = new HttpClientFixed(badRequestResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/events"),
        "POST",
        new HttpHeaders({
          ...apiKeyHeaders.toObject(),
          "content-type": "application/json",
        }),
        JSON.stringify({
          email: "notAnEmail",
          tag: "tag",
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response1 = await client.trackEvent({
        email: "notAnEmail",
        tag: "tag",
      });

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      if (!response1.success) {
        expect(response1.error).toBeDefined();
        expect(response1.error).toEqual(APIError.BadArgumentsError);
      }
    });
  });

  describe("updateProperties", () => {
    it("correctly updates properties", async () => {
      const propertiesClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/properties"),
        "POST",
        new HttpHeaders({
          "x-api-key": "key-secret",
          "content-type": "application/json",
        }),
        JSON.stringify({
          email: "test@journy.io",
          properties: {
            likesDog: "true",
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
            firstDogName: "Journy",
          },
        })
      );

      const client = new Client(propertiesClient, clientConfig);
      const response = await client.updateProperties({
        email: "test@journy.io",
        properties: {
          likesDog: true,
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          firstDogName: "Journy",
        },
      });

      expect(propertiesClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
    });

    it("correctly shows when the input parameters are invalid", async () => {
      const propertiesClient = new HttpClientFixed(badRequestResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/journeys/properties"),
        "POST",
        new HttpHeaders({
          "x-api-key": "key-secret",
          "content-type": "application/json",
        }),
        JSON.stringify({
          email: "test@journy.io",
          properties: {},
        })
      );

      const client = new Client(propertiesClient, clientConfig);
      const response1 = await client.updateProperties({
        email: "test@journy.io",
        properties: {},
      });

      expect(propertiesClient.getLastRequest()).toEqual(expectedRequest);
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      if (!response1.success) {
        expect(response1.error).toBeDefined();
        expect(response1.error).toEqual(APIError.BadArgumentsError);
      }
    });
  });

  describe("getTrackingSnippet", () => {
    it("correctly returns an existing snippet", async () => {
      const trackingsnippetClient = new HttpClientFixed(
        new HttpResponse(
          200,
          new HttpHeaders({ "X-RateLimit-Remaining": "5000" }),
          JSON.stringify({
            data: {
              domain: "journy.io",
              snippet: "<script>snippet</script>",
            },
            meta: {
              requestId: "requestId",
            },
          })
        )
      );
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/tracking/snippet?domain=journy.io"),
        "GET",
        apiKeyHeaders
      );

      const client = new Client(trackingsnippetClient, clientConfig);
      const response = await client.getTrackingSnippet({
        domain: "journy.io",
      });

      expect(trackingsnippetClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
      if (response.success) {
        expect(response.data.domain).toEqual("journy.io");
        expect(response.data.snippet).toBeDefined();
      }
    });

    it("correctly notifies a domain not being found", async () => {
      const trackingsnippetClient = new HttpClientFixed(notFoundResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/tracking/snippet?domain=nonexisting.com"),
        "GET",
        apiKeyHeaders
      );

      const client = new Client(trackingsnippetClient, clientConfig);
      const response = await client.getTrackingSnippet({
        domain: "nonexisting.com",
      });
      expect(trackingsnippetClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(5000);
      if (!response.success) {
        expect(response.error).toEqual(APIError.NotFoundError);
      }
    });
  });
});
