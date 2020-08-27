# journy.io Node.js SDK

This is the Node.js SDK for [journy.io](https://journy.io).

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
import { Client } from "@journy-io/sdk";
```

### Configuration and Client creation

To create a journy-io Client use the `createJournyClient(config: ClientConfig)`-function.
A `ClientConfig`-configuration should be given to the `createJournyClient(config: ClientConfig)`-function.

The `ClientConfig` includes two fields: the `apiKeySecret`-field and the `apiUrl`-field. 
The `apiKeySecret` should include the API Key secret generated from the [journy.io](https://journy.io) application.
The `apiUrl` should include the API URL of the [journy.io](https://journy.io) API.  

```typescript
const config = {
    apiKeySecret: "api-key-secret",
    apiUrl: "https://api.journy.io"
};
```

```typescript
const client: Client = createJournyClient(config);
```

### Methods

The Client interface includes five methods.

#### init

```typescript
getApiKeySpecs();
```

The response of the method-call includes the *property-group-name* configured in the [journy.io](https://journy.io) application and a list of *permissions* the API Key has.


#### trackEvent

```typescript
trackEvent(args);
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
trackProperties(args);
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
getProfile(args);
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
getTrackingSnippet(args);
```

This method will retrieve a tracking snippet of a specific domain.

The `getTrackingSnippet`-arguments interface is:

```typescript
interface args {
  domain: string;
}
``` 

### Response types

The basic method-response type is the `ClientResponse`. The `ClientResponse` interface is:

```typescript
interface ClientResponse {
  success: boolean;
  callsRemaining: number | undefined;
  error?: JourneyClientError;
}
```

The `success`-field states if the method call succeeded. The `callsRemaining` states the amount of requests the API Key has left (more information about the Rate-Limiting can be found in our API documentation). The `error?` field contains the error that occurred if the method call was not successful.

If the response includes response data, then the `ClientResponseData`-interface is used:

```typescript
interface ClientResponseData<T> extends ClientResponse {
  data?: T;
}
```

which also includes a data field. When an error occurs (and the method call is thus unsuccessful) the data field will be undefined.

## 🔑 Account creation and API Key management

To be able to use the journy.io SDK you should have an API Key. If you don't have one you can create one in the [journy.io](https://journy.io) application. 
If you don't have an account already, you can create one in [the journy.io application](https://app.journy.io/register). 
After creating an account - or if you already have an account - you can go to your settings, under the *sources*-tab, to create and edit API Keys. Make sure to give the correct permissions to the API Key and set the correct property-group-name.

## 📬 API

More documentation and information about the [journy.io](https://journy.io) API can be found in our [API documentation](https://journy-io.readme.io/docs).

## 💯 Tests

Tests can be found in the `/tests`-folder. To run the tests run:

```bash
yarn test
```

## 📄 Examples

Example(s) can be found in the `/examples`-folder.

## ❓ Feedback/ questions or problems?

In case of questions, problems or feedback about the SDK (or the API). Do not hesitate to create an issue.
