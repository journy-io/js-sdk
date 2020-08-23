const journy = require("@journy/sdk");

const config = {
  apiKeySecret: process.env.API_KEY,
  apiUrl: process.env.API_URL,
};

async function doExample() {
  const client = journy.createJournyClient(config);
  const initialisation = await client.init();
  if (!initialisation.success) {
    console.error("Initialisation failed");
  }
  const trackPropertiesResponse = await client.trackEvent({
    email: "test@journy.io",
    tag: "tag",
    campaign: "campaign",
    source: "source",
  });
  if (!trackPropertiesResponse.success) {
    console.error(trackPropertiesResponse.error);
  }
}

doExample();
