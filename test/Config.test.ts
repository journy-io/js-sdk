import { Config } from "../lib/Config";
import { HttpClientApi } from "../lib/HttpClient";
import { Duration } from "luxon";
import PQueue from "p-queue";

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
  it("returns a PQueue", () => {
    const config = new Config("api-key-secret ");
    const queue = config.getPQueue();
    expect(queue).toBeDefined();
    expect(queue).toBeInstanceOf(PQueue);
  });
});
