[![journy.io](banner.png)](https://journy.io/?utm_source=github&utm_content=readme-js-sdk)

# journy.io Node.js SDK [Legacy]

[![npm](https://img.shields.io/npm/v/@journyio/sdk?color=%234d84f5&style=flat-square)](https://www.npmjs.com/package/@journyio/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@journyio/sdk?style=flat-square)](https://www.npmjs.com/package/@journyio/sdk)

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
import { Client } from "@journyio/sdk";
```

### Configuration

To be able to use the journy.io SDK you need to generate an API key. If you don't have one you can create one in [journy.io](https://system.journy.io?utm_source=github&utm_content=readme-js-sdk).

If you don't have an account yet, you can create one in [journy.io](https://system.journy.io/register?utm_source=github&utm_content=readme-js-sdk) or [request a demo first](https://www.journy.io/book-demo?utm_source=github&utm_content=readme-js-sdk).

Go to your settings, under the *Connections*-tab, to create and edit API keys. Make sure to give the correct permissions to the API Key.

```ts
const client = Client.withDefaults("your-api-key");
```

If you want to use a custom [HttpClient](https://github.com/journy-io/http):

```ts
const http = new OwnHttpClientImplementation();
const client = new Client(http, { apiKey: "your-api-key" });
```

### Methods

#### Get API key details

```ts
const result = await client.getApiKeyDetails();

if (result.success) {
  console.log(result.data.permissions); // string[]
  console.log(result.callsRemaining); // number
}
```

#### Create or update user

💡 A user ID should be a robust, static, unique identifier that you recognize a user by in your own systems. Because these IDs are consistent across a customer’s lifetime, you should include a user ID in identify calls as often as you can. Ideally, the user ID should be a database ID.

💡 journy.io does not recommend using simple email addresses or usernames as user ID, as these can change over time. journy.io recommends that you use static IDs instead, so the IDs never change. When you use a static ID, you can still recognize the user in your analytics tools, even if the user changes their email address.

💡 The properties `full_name`, `first_name`, `last_name`, `phone` and `registered_at` will be used for creating contacts in destinations like Intercom, HubSpot, Salesforce, ...

```ts
await client.upsertUser({
  // Must provide either an email or userId or both
  userId: "userId", // Unique identifier for the user in your database
  email: "john@doe.tld",

  // optional
  properties: {
    full_name: "John Doe",
    first_name: "John",
    last_name: "Doe",
    phone: "123",
    registered_at: new Date(/* ... */),
    is_admin: true,
    array_of_values: ["value1", "value2"],
    key_with_empty_value: "",
    this_property_will_be_deleted: null,
  },
});
```

#### Delete user

```ts
await client.deleteUser({
  // Must provide either an email or userId or both
  userId: "userId", // Unique identifier for the user in your database
  email: "john@doe.tld",
});
```

#### Create or update account

💡 An account ID should be a robust, static, unique identifier that you recognize an account by in your own systems. Ideally, the account ID should be a database ID.

💡 The properties `name`, `mrr`, `plan` and `registered_at` will be used to create companies in destinations like Intercom, HubSpot, Salesforce, ...

```ts
await client.upsertAccount({
  // Must provide either an domain or accountId or both
  accountId: "accountId", // Unique identifier for the account in your database
  domain: "acme-inc.com",

  // optional
  properties: {
    name: "ACME, Inc",
    mrr: 399,
    plan: "Pro",
    registered_at: new Date(/* ... */),
    is_paying: true,
    array_of_values: ["value1", "value2"],
    key_with_empty_value: "",
    this_property_will_be_deleted: null,
  }
});
```

#### Delete account

```ts
await client.deleteAccount({
  // Must provide either a domain or accountId or both
  accountId: "accountId", // Unique identifier for the account in your database
  domain: "test.com",
});
```

#### Add user(s) to an account

```ts
await client.addUsersToAccount({
  account: AccountIdentified.byAccountId("accountId"),
  users: [UserIdentified.byUserId("userId1"), UserIdentified.byEmail("user2@domain.tld")]
});
```

#### Remove user(s) from an account

When removing a user, the user will still be stored in journy.io, but marked as "removed".

```ts
await client.removeUsersFromAccount({
  account: AccountIdentified.byAccountId("accountId"),
  users: [UserIdentified.byUserId("userId1"), UserIdentified.byEmail("user2@domain.tld")]
});
```

#### Link web activity to a user

You can link web activity to a user in your application when you have our snippet installed on your website. The snippet sets a cookie named `__journey`. If the cookie exists, you can link the web activity to the user that is currently logged in:

```ts
if (request.cookies["__journey"]) {
  const result = await client.link({
    deviceId: request.cookies["__journey"],

    userId: request.user.id, // Unique identifier for the user in your database
    // or
    email: request.user.email,
  });
}
```

(The above example is for express based applications using [https://github.com/expressjs/cookie-parser](https://github.com/expressjs/cookie-parser))

#### Add event

```ts
import { Event, UserIdentified, AccountIdentified } from "@journyio/sdk";

event = Event.forUser("login", UserIdentified.byUserId("userId"));

event = Event.forUser("some_historic_event", UserIdentified.byUserId("userId"))
  .happenedAt(new Date(...))
;

event = Event.forAccount("reached_monthly_volume", AccountIdentified.byAccountId("accountId"))
  .withMetadata({
    "number": 1313,
    "string": "string",
    "boolean": true,
  })
;

event = Event.forUserInAccount(
  "updated_settings",
  UserIdentified.byUserId("userId"),
  AccountIdentified.byAccountId("accountId")
);

await client.addEvent(event);
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

Every call will return a result, we don't throw errors when a call fails. We don't want to break your application when things go wrong. An exception will be thrown for required arguments that are empty or missing.

You can check whether the call succeeded using `result.success`:

```ts
const result = await client.getTrackingSnippet({
  domain: "www.journy.io",
});

if (!result.success) {
  console.log(result.error); // string
  console.log(result.requestId); // string
}

await client.getTrackingSnippet({
  domain: "", // empty string will throw
});
```

The request ID can be useful when viewing API logs in [journy.io](https://system.journy.io?utm_source=github&utm_content=readme-js-sdk).


## 📬 API Docs

[API reference](https://developers.journy.io)

## 💯 Tests

To run the tests:

```bash
npm run test
```

## ❓ Help

We welcome your feedback, ideas and suggestions. We really want to make your life easier, so if we’re falling short or should be doing something different, we want to hear about it.

Please create an issue or contact us via the chat on our website.

## 🔒 Security

If you discover any security related issues, please email security at journy io instead of using the issue tracker.
