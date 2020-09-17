# journy.io Node.js SDK

This is the Node.js SDK for [journy.io](https://journy.io?utm_source=github&utm_content=readme-js-sdk).

## 💾 Installation

You can use your package manager (`npm` or `yarn`) to install the SDK. Therefore run:

```bash
npm install --save @journy-io/sdk
```
or
```bash
yarn add @journy-io/sdk
```

## 🔌 Getting started

### Import

To start, first import the client.

```typescript
import { Client, createClient } from "@journy-io/sdk";
```

### Configuration and Client creation

To create a journy-io Client use the `createJournyClient(config: ClientConfig)`-function.
A `ClientConfig`-configuration should be given to the `createJournyClient(config: ClientConfig)`-function.

The `ClientConfig` includes two fields: the `apiKeySecret`-field and the `apiUrl`-field. 
The `apiKeySecret` should include the API Key secret generated from the [journy.io](https://journy.io?utm_source=github&utm_content=readme-js-sdk) application.
The `apiUrl` should include the API URL of the [journy.io](https://journy.io?utm_source=github&utm_content=readme-js-sdk) API.  

```typescript
const config = {
    apiKeySecret: "api-key-secret",
    apiUrl: "https://api.journy.io"
};
```

```typescript
const client: Client = createClient(config);
```

or if you want to use a custom [HttpClient](/lib/HttpClient.ts#L70)-implementation you can create a client as follows:

```typescript
const httpClient: HttpClient = new OwnHttpClientImplementation();
const client: Client = new Client(httpClient, config);
```

### Methods

#### getApiKeySpecs

```typescript
await client.getApiKeySpecs();
```

The response of the method-call includes the *property-group-name* configured in the [journy.io](https://journy.io) application and a list of *permissions* the API Key has.


#### trackEvent

```typescript
await client.trackEvent(args);
```

This method can be used to track a user event.

The `trackEvent`-arguments interface is:

```typescript
interface args {
    email: string;
    tag: string;
    campaign: string;
    source: string;
    recordedAt?: DateTime;
    journeyProperties?: Properties;
}
```

#### trackProperties

```typescript
await client.trackProperties(args);
```

This method can be used to track user properties.

The `trackProperties`-arguments interface is:

```typescript
interface args {
  email: string;
  journeyProperties: Properties;
}
```

#### getProfile

```typescript
await client.getProfile(args);
```

This method can be used to retrieve a profile of a user.

The `getProfile`-arguments interface is:

```typescript
interface args {
  email: string;
}
```

The response of the method-call will include (if existing) the profile of the user.

#### getTrackingSnippet

```typescript
await client.getTrackingSnippet(args);
```

This method will retrieve a tracking snippet of a specific domain.

The `getTrackingSnippet`-arguments interface is:

```typescript
interface args {
  domain: string;
}
``` 

### Response types

> Note: instead of `await` (as in the examples above) you can also use `.then()` to interact with the responses.

The basic method-response type is the `Result<T>` whereas `T` is the type of the data if the response should provide data. 

```typescript
export type Result<T> = Success<T> | Error;
```

```typescript
export interface Success<T> {
  success: true;
  callsRemaining: number | undefined;
  data: T;
}

export interface Error {
  success: false;
  callsRemaining: number | undefined;
  error: JourneyClientError;
}
```

The `success`-field states if the method-call succeeded. The `callsRemaining`-field states the amount of requests the API Key still can perform in the current timeframe (more information about the Rate-Limiting can be found in our [API documentation](https://journy-io.readme.io/docs).

In case the `success`-field is `true`, the return-type will be `Succes<T>` and the `data`-field will contain the result data.
In case the `success`-field is `false`, the return-type will be `Error` and the `error`-field will contain the error.

## 🔑 Account creation and API Key management

To be able to use the journy.io SDK you should have an API Key. If you don't have one you can create one in the [journy.io](https://journy.io?utm_source=github&utm_content=readme-js-sdk) application. 
If you don't have an account already, you can create one in [the journy.io application](https://app.journy.io/register?utm_source=github&utm_content=readme-js-sdk). 
After creating an account - or if you already have an account - you can go to your settings, under the *sources*-tab, to create and edit API Keys. Make sure to give the correct permissions to the API Key and set the correct property-group-name.

## 📬 API

More documentation and information about the [journy.io](https://journy.io?utm_source=github&utm_content=readme-js-sdk) API can be found in our [API documentation](https://journy-io.readme.io/docs).

## 💯 Tests

Tests can be found in the `/tests`-folder. To run the tests run:

```bash
yarn test
```

## 📄 Examples

Example(s) can be found in the `/examples`-folder.

## ❓ Feedback/ questions or problems?

In case of questions, problems or feedback about the SDK (or the API). Do not hesitate to create an issue.
