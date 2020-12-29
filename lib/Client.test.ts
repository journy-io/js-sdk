import { AppEvent } from "./AppEvent";
import { Client, APIError, Config } from "./Client";
import {
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  HttpClientFixed,
  HttpClient,
} from "@journyio/http";
import { URL } from "url";

class HttpClientThatThrows implements HttpClient {
  async send(request: HttpRequest): Promise<HttpResponse> {
    throw new Error(`error`);
  }
}

describe("createClient", () => {
  it("fails when the config is invalid", async () => {
    expect(() => {
      Client.withDefaults("");
    }).toThrowError("The API key cannot be empty.");

    expect(() => {
      new Client(new HttpClientThatThrows(), {
        apiKey: "api-key",
        rootUrl: "invalid-url",
      });
    }).toThrowError("The API url is not a valid URL: invalid-url");
  });

  it("creates a client with API url", () => {
    const client = Client.withDefaults("api-key");
    expect(client).toBeDefined();
  });
});

describe("Client", () => {
  const clientConfig: Config = {
    apiKey: "key-secret",
    rootUrl: "https://api.test.com",
  };
  const nonExistingClientConfig: Config = {
    apiKey: "non-existing-key-secret",
    rootUrl: "https://api.test.com",
  };
  const keySecretHeader = new HttpHeaders({ "x-api-key": "key-secret" });
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
  const unAuthorizedResponse = new HttpResponse(
    401,
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

  describe("getApiKeySpecs", () => {
    it("correctly errors when too many requests were made", async () => {
      const validateClient = new HttpClientFixed(tooManyRequestsResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        keySecretHeader
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
        keySecretHeader
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
        keySecretHeader
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

    it("correctly gives an unknown error if something bad happens", async () => {
      const validateClient = new HttpClientThatThrows();
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        keySecretHeader
      );

      const client = new Client(validateClient, clientConfig);
      const response = await client.getApiKeyDetails();

      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(undefined);
      if (!response.success) {
        expect(response.error).toEqual(APIError.UnknownError);
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
        keySecretHeader
      );

      const validateClient2 = new HttpClientFixed(notFoundResponse);
      const expectedRequest2 = new HttpRequest(
        new URL("https://api.test.com/validate"),
        "GET",
        nonExistingKeySecretHeader
      );

      const client = new Client(validateClient1, clientConfig);
      const client2 = new Client(validateClient2, nonExistingClientConfig);

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
    });
  });

  describe("addEvent", () => {
    it("correctly handles errors being thrown", async () => {
      const eventClient = new HttpClientThatThrows();

      const client = new Client(eventClient, clientConfig);
      const response = await client.addEvent(
        AppEvent.forUserInAccount("tag", "test@journy.io", "accountId")
      );

      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(undefined);
      if (!response.success) {
        expect(response.error).toEqual(APIError.UnknownError);
      }
    });

    it("correctly tracks an event", async () => {
      const eventClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/events"),
        "POST",
        keySecretHeader,
        JSON.stringify({
          identification: {
            userId: "test@journy.io",
            accountId: "accountId",
          },
          name: "tag",
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response = await client.addEvent(
        AppEvent.forUserInAccount("tag", "test@journy.io", "accountId")
      );

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
    });

    it("correctly handles dates", async () => {
      const eventClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/events"),
        "POST",
        keySecretHeader,
        JSON.stringify({
          identification: {
            userId: "test@journy.io",
          },
          name: "tag",
          triggeredAt: "2019-01-01T00:00:00.000Z",
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response = await client.addEvent(
        AppEvent.forUser("tag", "test@journy.io").happenedAt(
          new Date("2019-01-01T00:00:00.000Z")
        )
      );

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response).toBeDefined();
      expect(response.success).toBeTruthy();
      expect(response.callsRemaining).toEqual(5000);
    });

    it("correctly states when the input is invalid", async () => {
      const eventClient = new HttpClientFixed(badRequestResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/events"),
        "POST",
        keySecretHeader,
        JSON.stringify({
          identification: {
            userId: "test@journy.io",
          },
          name: "tag",
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response1 = await client.addEvent(
        AppEvent.forUser("tag", "test@journy.io")
      );

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      if (!response1.success) {
        expect(response1.error).toBeDefined();
        expect(response1.error).toEqual(APIError.BadArgumentsError);
      }
    });

    it("correctly states when the user is unauthorized", async () => {
      const eventClient = new HttpClientFixed(unAuthorizedResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/events"),
        "POST",
        keySecretHeader,
        JSON.stringify({
          identification: {
            userId: "userId",
          },
          name: "tag",
        })
      );

      const client = new Client(eventClient, clientConfig);
      const response1 = await client.addEvent(
        AppEvent.forUser("tag", "userId")
      );

      expect(eventClient.getLastRequest()).toEqual(expectedRequest);
      expect(response1).toBeDefined();
      expect(response1.success).toBeFalsy();
      expect(response1.callsRemaining).toEqual(5000);
      if (!response1.success) {
        expect(response1.error).toBeDefined();
        expect(response1.error).toEqual(APIError.UnauthorizedError);
      }
    });
  });

  describe("upsertUser", () => {
    it("correctly handles errors being thrown", async () => {
      const propertiesClient = new HttpClientThatThrows();

      const client = new Client(propertiesClient, clientConfig);
      const response = await client.upsertAppUser({
        email: "test@journy.io",
        userId: "userId",
        properties: {
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          likesDog: true,
          firstDogName: "Journy",
        },
      });

      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(undefined);
      if (!response.success) {
        expect(response.error).toEqual(APIError.UnknownError);
      }
    });

    it("correctly tracks properties", async () => {
      const propertiesClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/users/upsert"),
        "POST",
        new HttpHeaders({ "x-api-key": "key-secret" }),
        JSON.stringify({
          email: "test@journy.io",
          userId: "userId",
          properties: {
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
            likesDog: "true",
            firstDogName: "Journy",
          },
        })
      );

      const client = new Client(propertiesClient, clientConfig);
      const response = await client.upsertAppUser({
        email: "test@journy.io",
        userId: "userId",
        properties: {
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          likesDog: true,
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
        new URL("https://api.test.com/users/upsert"),
        "POST",
        new HttpHeaders({ "x-api-key": "key-secret" }),
        JSON.stringify({
          email: "test@journy.io",
          userId: "",
        })
      );

      const client = new Client(propertiesClient, clientConfig);
      const response1 = await client.upsertAppUser({
        email: "test@journy.io",
        userId: "",
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

  describe("upsertAccount", () => {
    it("correctly handles errors being thrown", async () => {
      const propertiesClient = new HttpClientThatThrows();

      const client = new Client(propertiesClient, clientConfig);
      const response = await client.upsertAppAccount({
        accountId: "accountId",
        name: "accountName",
        properties: {
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          likesDog: true,
          firstDogName: "Journy",
        },
      });

      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(undefined);
      if (!response.success) {
        expect(response.error).toEqual(APIError.UnknownError);
      }
    });

    it("correctly tracks properties", async () => {
      const propertiesClient = new HttpClientFixed(createdResponse);
      const expectedRequest = new HttpRequest(
        new URL("https://api.test.com/accounts/upsert"),
        "POST",
        new HttpHeaders({ "x-api-key": "key-secret" }),
        JSON.stringify({
          accountId: "accountId",
          name: "accountName",
          properties: {
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
            likesDog: "true",
            firstDogName: "Journy",
          },
        })
      );

      const client = new Client(propertiesClient, clientConfig);
      const response = await client.upsertAppAccount({
        accountId: "accountId",
        name: "accountName",
        properties: {
          hasDogs: "2",
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          likesDog: "true",
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
        new URL("https://api.test.com/accounts/upsert"),
        "POST",
        new HttpHeaders({ "x-api-key": "key-secret" }),
        JSON.stringify({
          accountId: "accountId",
          name: "journy.io",
          properties: {
            hasDogs: "2",
            boughtDog: "2020-08-27T12:08:21.000Z",
            likesDog: "true",
            firstDogName: "Journy",
          },
        })
      );

      const client = new Client(propertiesClient, clientConfig);
      const response1 = await client.upsertAppAccount({
        accountId: "accountId",
        name: "journy.io",
        properties: {
          hasDogs: 2,
          boughtDog: new Date("2020-08-27T12:08:21+00:00"),
          likesDog: true,
          firstDogName: "Journy",
        },
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
    it("correctly handles errors being thrown", async () => {
      const trackingsnippetClient = new HttpClientThatThrows();

      const client = new Client(trackingsnippetClient, clientConfig);
      const response = await client.getTrackingSnippet({
        domain: "journy.io",
      });

      expect(response).toBeDefined();
      expect(response.success).toBeFalsy();
      expect(response.callsRemaining).toEqual(undefined);
      if (!response.success) {
        expect(response.error).toEqual(APIError.UnknownError);
      }
    });

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
        keySecretHeader
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
        keySecretHeader
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
