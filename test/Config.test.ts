import { Config } from "../lib/Config";
import { HttpClientAxios } from "../lib/HttpClient";

describe("Config", () => {
  it("returns a HttpClient", () => {
    const config = new Config("api-key-secret ");
    const client = config.getHttpClient();
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(HttpClientAxios);

    const client2 = config.getHttpClient(20000);
    expect(client2).toBeDefined();
    expect(client2).toBeInstanceOf(HttpClientAxios);
  });
});
