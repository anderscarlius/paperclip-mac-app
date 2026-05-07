import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "paperclipai.web-search",
  apiVersion: 1,
  version: "0.2.0",
  displayName: "Web Search",
  description: "Search the public web and return a compact ranked result set for agents.",
  author: "Paperclip",
  categories: ["connector", "automation"],
  capabilities: [
    "http.outbound",
    "agent.tools.register",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        enum: ["duckduckgo_html", "brave"],
        description: "Search backend. Brave is preferred when a Brave Search API key is configured.",
      },
      braveApiKey: {
        type: "string",
        description: "Optional Brave Search API key for stable JSON search results.",
      },
    },
  },
  entrypoints: {
    worker: "./dist/src/worker.js",
  },
  tools: [
    {
      name: "web-search",
      displayName: "Web Search",
      description: "Search the public web for current information and return the top matching results.",
      parametersSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for the public web.",
          },
          maxResults: {
            type: "integer",
            minimum: 1,
            maximum: 8,
            description: "Maximum number of results to return.",
          },
        },
        required: ["query"],
      },
    },
  ],
};

export default manifest;
