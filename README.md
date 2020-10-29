![journy.io](banner.png)

# journy.io Node.js SDK

This is the official Node.js SDK for [journy.io](https://journy.io?utm_source=github&utm_content=readme-js-sdk).

## 💾 Installation

You can use your package manager (`npm` or `yarn`) to install the SDK:

```bash
npm install --save @journyio/sdk
```
or
```bash
yarn add @journyio/sdk
```

## 🔌 Getting started

### Import

To start, first import the client.

```ts
import { Client, createClient } from "@journyio/sdk";
```

### Configuration

To be able to use the journy.io SDK you need to generate an API key. If you don't have one you can create one in [journy.io](https://app.journy.io?utm_source=github&utm_content=readme-js-sdk).

If you don't have an account yet, you can create one in [journy.io](https://app.journy.io/register?utm_source=github&utm_content=readme-js-sdk) or [request a demo first](https://www.journy.io/book-demo?utm_source=github&utm_content=readme-js-sdk).

Go to your settings, under the *sources*-tab, to create and edit API keys. Make sure to give the correct permissions to the API Key and set the correct property group name.

```ts
const client: Client = createClient({
  apiKey: "api-key",
});
```

If you want to use a custom [HttpClient](/lib/HttpClient.ts#L70), you can create a client as follows:

```ts
const httpClient: HttpClient = new OwnHttpClientImplementation();
const client = new Client(httpClient, config);
```

### Methods

#### Get API key details

```ts
const result = await client.getApiKeyDetails();

if (result.success) {
  console.log(result.data.propertyGroupName); // string
  console.log(result.data.permissions); // string[]
  console.log(result.data.callsRemaining); // number
}
```

#### Track event for a user

```ts
await client.trackEvent({
  // required
  email: "name@domain.tld",
  tag: "login",

  // optional
  recordedAt: new Date(),
  properties: {
    age: 26,
    name: "John Doe",
    is_developer: true,
    this_property_will_be_deleted: "",
  },
});
```

#### Set, update or delete properties for a user

_Note: when sending an empty value (`""`) as value for a property, the property will be deleted._

```ts
await client.trackProperties({
  email: "name@domain.tld",
  properties: {
    age: 26,
    name: "John Doe",
    is_developer: true,
    this_property_will_be_deleted: "",
  },
});
```

#### Get tracking snippet for a domain

```ts
const result = await client.getTrackingSnippet({
  domain: "www.journy.io",
});

if (result.success) {
  console.log(result.data.snippet); // string
  console.log(result.data.domain); // string
}
```

### Handling errors

Every call will return a result, we don't throw errors when a call fails because working with `Error` instances is not great in JavaScript.

You can check whether the call succeeded using `result.success`:

```ts
const result = await client.getTrackingSnippet({
  domain: "www.journy.io",
});

if (!result.success) {
  console.log(result.error); // string
  console.log(result.requestId); // string
}
```

The request ID can be useful when viewing API logs in [journy.io](https://app.journy.io?utm_source=github&utm_content=readme-js-sdk).

## 📬 API

More documentation and information about our API can be found in the [API documentation](https://journy-io.readme.io/reference).

## 💯 Tests

To run the tests:

```bash
npm run test
```

## ❓ Help

We welcome your feedback, ideas and suggestions. We really want to make your life easier, so if we’re falling short or should be doing something different, we want to hear about it.

Please create an issue or contact us via the chat on our website.
