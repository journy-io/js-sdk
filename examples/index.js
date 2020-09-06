const journy = require("@journyio/sdk");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

const config = {
  apiKeySecret: process.env.API_KEY,
  apiUrl: process.env.API_URL,
};

async function doExample() {
  const client = journy.createClient(config);
  const trackEventResponse = await client.trackEvent({
    email: "test@journy.io",
    tag: "tag",
    campaign: "campaign",
    source: "source",
  });
  if (!trackEventResponse.success) {
    console.error(trackEventResponse.error);
  } else {
    console.log(
      `trackEventResponse succeeded with '${trackEventResponse.callsRemaining}' remaining calls`
    );
  }
}

doExample();
