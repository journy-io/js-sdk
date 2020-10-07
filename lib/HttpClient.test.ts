import {
  HttpClientFixed,
  HttpClientLogging,
  HttpClientThatThrows,
  HttpHeaders,
  HttpRequest,
  HttpRequestError,
  HttpResponse,
} from "./HttpClient";

describe("HttpHeaders", () => {
  it("works", () => {
    const headers = new HttpHeaders({
      "Content-Type": "text/HTML",
      "x-real-ip": "127.0.0.1",
      "set-Cookie": "cookie",
    });

    expect(headers.byName("Content-Type")).toEqual("text/HTML");
    expect(headers.byName("content-type")).toEqual("text/HTML");
    expect(headers.byName("X-real-ip")).toEqual("127.0.0.1");
    expect(headers.byName("x-real-ip")).toEqual("127.0.0.1");
    expect(headers.byName("unknown")).toEqual(undefined);
    expect(headers.byName("set-cookie")).toEqual("cookie");
    expect(headers.byName("Set-COOKIE")).toEqual("cookie");
  });
});

describe("HttpRequest", () => {
  it("works", () => {
    const request = new HttpRequest(
      new URL("https://journy.io"),
      "GET",
      new HttpHeaders({ accept: "text/html" }),
      { hasBody: true }
    );
    expect(request).toBeDefined();
    expect(request.getHeaders()).toEqual(
      new HttpHeaders({ accept: "text/html" })
    );
    expect(request.getMethod()).toEqual("GET");
    expect(request.getBody()).toEqual({ hasBody: true });
  });
});

describe("HttpResponse", () => {
  it("works", () => {
    const response = new HttpResponse(
      404,
      new HttpHeaders({ "content-type": "text/html" }),
      "<html>body</html>"
    );
    expect(response).toBeDefined();
    expect(response.getHeaders().byName("content-type")).toEqual("text/html");
    expect(response.getStatusCode()).toEqual(404);
  });
});

describe("HttpRequestError", () => {
  it("works", () => {
    const error = new HttpRequestError(
      "You are not authorized",
      401,
      "requestId"
    );
    expect(error.message).toEqual("You are not authorized");
    expect(error.getStatusCode()).toEqual(401);
    expect(error.getHeaders().toObject()).toEqual({});
    expect(error.getApiRequestId()).toEqual("requestId");
  });
});

describe("HttpClientThatThrows", () => {
  it("works", async () => {
    const client = new HttpClientThatThrows();
    await expect(
      client.send(new HttpRequest(new URL("https://journy.io")))
    ).rejects.toThrow();
  });
});

describe("HttpClientLogging", () => {
  it("works", async () => {
    const fixedResponse = new HttpResponse(200, new HttpHeaders(), "success");
    const fixedClient = new HttpClientFixed(fixedResponse);

    const client = new HttpClientLogging(fixedClient);
    const response = await client.send(
      new HttpRequest(new URL("https://journy.io/"))
    );
    expect(response.getBody()).toEqual("success");
  });
});

describe("HttpClientFixed", () => {
  it("works", async () => {
    const response = new HttpResponse();
    const client = new HttpClientFixed(response);
    client.setResponse(response);
    client.send(new HttpRequest(new URL("https://journy.io"))).then((res) => {
      expect(res).toEqual(response);
    });
  });
});
