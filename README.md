# js-sdk

Use https://github.com/formik/tsdx?

- Extract our HTTP client as package

```ts
import { Client } from "@journyio/sdk";

async function fn() {
  const client = new Client(http, "apiKey");
  await client.trackEvent($email, "trial started", { "system/name": "John Doe" });
}
```
