import { Config } from "../lib/Config";
import { HttpClientApi } from "../lib/HttpClient";
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
});
