import { Client, createJournyClient, Tracking } from "../lib";
import { JournyTracking } from "../lib/Tracking";
import { Config } from "../lib/Config";
import nock = require("nock");

describe("JournyTracking", () => {
  let tracking: Tracking;
  let client: Client;
  it("correctly creates a tracking", async () => {
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

    client = await createJournyClient({
      apiKeySecret: "key-secret",
      apiUrl: "https://api.test.com",
    });
    await client.init();
    tracking = new JournyTracking(client, new Config("key-secret"));
  });
  describe("trackEvent", async () => {
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

      tracking.trackEvent({
        email: "test@journy.io",
        tag: "tag",
        campaign: "campaign",
        source: "source",
      });
    });
  });
  describe("trackProperties", async () => {
    it("correctly tracks properties", async () => {
      nock("https://api.test.com")
        .post("/journeys/properties", {
          email: "test@journy.io",
          journeyProperties: {
            likesDogs: true,
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

      tracking.trackProperties({
        email: "test@journy.io",
        journeyProperties: {
          likesDogs: true,
        },
      });
    });
  });
});
