import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: "Water Feature Scout",
  description:
    "Finds Northern Virginia and Maryland homes with maintainable water features and keeps one Excel workbook.",
  model: {
    id: "grok-4.7",
    params: [
      { id: "reasoning_effort", value: "high" },
      { id: "fast", value: "true" },
    ],
  },
  tools: [],
  hosting: {
    egressDomains: ["html.duckduckgo.com", "duckduckgo.com", "api.search.brave.com"],
    secretNames: ["BRAVE_SEARCH_API_KEY"],
  },
});
