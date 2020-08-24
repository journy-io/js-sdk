import { Config } from "../lib/Config";
import { HttpClientApi, QueuedHttpClient } from "../lib/HttpClient";
import { Duration } from "luxon";

describe("Config", () => {
  it("returns a HttpClient", () => {
    const config = new Config("api-key-secret ");
    const client = config.getHttpClient();
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(HttpClientApi);

    const client2 = config.getHttpClient(Duration.fromObject({ seconds: 20 }));
    expect(client2).toBeDefined();
    expect(client2).toBeInstanceOf(HttpClientApi);
  });
  it("returns a QueuedHttpClient", () => {
    const config = new Config("api-key-secret ");
    const client = config.getQueuedHttpClient();
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(QueuedHttpClient);

    const client2 = config.getQueuedHttpClient(
      Duration.fromObject({ seconds: 20 })
    );
    expect(client2).toBeDefined();
    expect(client2).toBeInstanceOf(QueuedHttpClient);
  });
});
