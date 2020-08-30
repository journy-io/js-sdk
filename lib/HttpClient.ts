import { AxiosInstance } from "axios";

type Method = "GET" | "POST" | "DELETE" | "PUT" | "HEAD";

export class HttpHeaders {
  constructor(private readonly headers: { [name: string]: string } = {}) {
    this.headers = Object.keys(this.headers).reduce((headers, name) => {
      return { ...headers, [name.toLowerCase()]: this.headers[name] };
    }, {});
  }

  byName(name: string) {
    if (name.toLowerCase() in this.headers) {
      return this.headers[name.toLowerCase()];
    }

    return undefined;
  }

  toObject() {
    return { ...this.headers };
  }
}

export class HttpRequest {
  constructor(
    private readonly url: URL,
    private readonly method: Method = "GET",
    private readonly headers: HttpHeaders = new HttpHeaders(),
    private readonly body: any = ""
  ) {}

  getHeaders() {
    return this.headers;
  }

  getBody() {
    return this.body;
  }

  getMethod() {
    return this.method;
  }

  getURL() {
    return this.url;
  }
}

export class HttpResponse {
  constructor(
    private readonly statusCode: number = 200,
    private readonly headers: HttpHeaders = new HttpHeaders(),
    private readonly body: string = ""
  ) {}

  getHeaders() {
    return this.headers;
  }

  getBody() {
    return this.body;
  }

  getStatusCode() {
    return this.statusCode;
  }
}

export interface HttpClient {
  send(request: HttpRequest): Promise<HttpResponse>;
}

export class HttpRequestError extends Error {
  constructor(
    message: string,
    private readonly statusCode: number,
    private readonly headers: HttpHeaders = new HttpHeaders()
  ) {
    super(message);
    Object.setPrototypeOf(this, HttpRequestError.prototype);
  }

  getStatusCode(): number {
    return this.statusCode;
  }

  getHeaders(): HttpHeaders {
    return this.headers;
  }
}

export class HttpClientAxios implements HttpClient {
  constructor(
    private readonly axios: AxiosInstance,
    private readonly timeout: number
  ) {}

  async send(request: HttpRequest) {
    const body = request.getBody();

    let response;
    try {
      response = await this.axios({
        url: request.getURL().toString(),
        method: request.getMethod(),
        timeout: this.timeout,
        headers: request.getHeaders().toObject(),
        data: body ? body : undefined,
        transformResponse: (data) => data,
      });
    } catch (error) {
      if (error.response) {
        throw new HttpRequestError(
          `${request.getMethod()} HTTP request to ${request
            .getURL()
            .toString()} failed: ${error.message} -> ${JSON.stringify(
            error.response.data
          )}`,
          error.response.status,
          new HttpHeaders(error.response.headers)
        );
      }

      throw new Error(
        `${request.getMethod()} HTTP request to ${request
          .getURL()
          .toString()} failed: ${error.message}`
      );
    }

    return new HttpResponse(
      response.status,
      new HttpHeaders(response.headers),
      response.data || ""
    );
  }
}

export class HttpClientThatThrows implements HttpClient {
  async send(_: HttpRequest): Promise<HttpResponse> {
    throw new Error("HttpClientThatThrows");
  }
}

// eslint-disable-next-line import/no-unused-modules
export class HttpClientLogging implements HttpClient {
  constructor(private readonly client: HttpClient) {}

  async send(request: HttpRequest) {
    console.log("Request...", request.getMethod(), request.getURL().toString());
    const response = await this.client.send(request);
    console.log("Response...", response.getStatusCode(), response.getBody());

    return response;
  }
}

export class HttpClientFixed implements HttpClient {
  constructor(private response: HttpResponse) {}

  setResponse(response: HttpResponse) {
    this.response = response;
  }

  async send(_: HttpRequest) {
    return this.response;
  }
}

export class HttpClientMatch implements HttpClient {
  private lastRequest: HttpRequest | undefined;

  constructor(private response: HttpResponse) {}

  async send(request: HttpRequest) {
    this.lastRequest = request;
    if (
      200 <= this.response.getStatusCode() &&
      this.response.getStatusCode() < 300
    ) {
      return this.response;
    } else {
      throw new HttpRequestError(
        `errorMessage`,
        this.response.getStatusCode(),
        this.response.getHeaders()
      );
    }
  }

  getLastRequest() {
    return this.lastRequest;
  }
}
