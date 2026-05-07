import { definePlugin, runWorker, type ToolResult } from "@paperclipai/plugin-sdk";

const DUCKDUCKGO_SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/";
const BRAVE_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
const DEFAULT_MAX_RESULTS = 5;
const MAX_RESULTS_CAP = 8;

type SearchParams = {
  query?: unknown;
  maxResults?: unknown;
};

type SearchProvider = "duckduckgo_html" | "brave";

type PluginConfig = {
  provider?: unknown;
  braveApiKey?: unknown;
};

type SearchResult = {
  title: string;
  url: string;
  snippet: string | null;
};

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalizeWhitespace(input: string): string {
  return decodeHtmlEntities(stripTags(input)).replace(/\s+/g, " ").trim();
}

function unwrapDuckDuckGoRedirect(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, DUCKDUCKGO_SEARCH_ENDPOINT);
    const redirectUrl = parsed.searchParams.get("uddg");
    return redirectUrl ? decodeURIComponent(redirectUrl) : parsed.toString();
  } catch {
    return rawUrl;
  }
}

function parseTopResults(html: string, maxResults: number): SearchResult[] {
  const anchorPattern =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  const anchors = Array.from(html.matchAll(anchorPattern));
  if (anchors.length === 0) return [];

  const results: SearchResult[] = [];
  for (let index = 0; index < anchors.length && results.length < maxResults; index += 1) {
    const current = anchors[index];
    if (!current) continue;

    const href = current[1] ? unwrapDuckDuckGoRedirect(current[1]) : "";
    const title = current[2] ? normalizeWhitespace(current[2]) : "";
    if (!href || !title) continue;

    const blockStart = current.index ?? 0;
    const blockEnd = anchors[index + 1]?.index ?? html.length;
    const blockHtml = html.slice(blockStart, blockEnd);
    const snippetMatch = blockHtml.match(
      /<(?:a|div|span)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div|span)>/i,
    );
    const snippet = snippetMatch?.[1] ? normalizeWhitespace(snippetMatch[1]) : null;

    results.push({ title, url: href, snippet });
  }

  return results;
}

function buildContent(query: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return `No public web results found for "${query}".`;
  }

  const lines = [`Web search results for "${query}":`];
  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`   URL: ${result.url}`);
    if (result.snippet) {
      lines.push(`   Snippet: ${result.snippet}`);
    }
  }
  return lines.join("\n");
}

function parseInput(params: SearchParams): { query: string; maxResults: number } {
  const query = typeof params.query === "string" ? params.query.trim() : "";
  if (!query) {
    throw new Error('Parameter "query" must be a non-empty string.');
  }

  const requested =
    typeof params.maxResults === "number"
      ? params.maxResults
      : typeof params.maxResults === "string"
        ? Number(params.maxResults)
        : DEFAULT_MAX_RESULTS;

  const maxResults = Number.isFinite(requested)
    ? Math.max(1, Math.min(MAX_RESULTS_CAP, Math.floor(requested)))
    : DEFAULT_MAX_RESULTS;

  return { query, maxResults };
}

function parseConfig(config: PluginConfig): { provider: SearchProvider; braveApiKey: string | null } {
  const braveApiKey = typeof config.braveApiKey === "string" && config.braveApiKey.trim()
    ? config.braveApiKey.trim()
    : null;
  const configuredProvider = config.provider === "brave" || config.provider === "duckduckgo_html"
    ? config.provider
    : null;
  return {
    provider: configuredProvider ?? (braveApiKey ? "brave" : "duckduckgo_html"),
    braveApiKey,
  };
}

function parseBraveResults(payload: unknown, maxResults: number): SearchResult[] {
  const webResults = typeof payload === "object" && payload !== null
    ? (payload as { web?: { results?: unknown } }).web?.results
    : null;
  if (!Array.isArray(webResults)) return [];

  return webResults.slice(0, maxResults).flatMap((item): SearchResult[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? normalizeWhitespace(record.title) : "";
    const url = typeof record.url === "string" ? record.url : "";
    const snippet = typeof record.description === "string" ? normalizeWhitespace(record.description) : null;
    return title && url ? [{ title, url, snippet }] : [];
  });
}

async function searchBrave(
  fetcher: (input: string, init?: RequestInit) => Promise<Response>,
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<ToolResult> {
  const url = new URL(BRAVE_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(maxResults));

  const response = await fetcher(url.toString(), {
    headers: {
      "accept": "application/json",
      "x-subscription-token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const results = parseBraveResults(payload, maxResults);
  return {
    content: buildContent(query, results),
    data: {
      provider: "brave",
      query,
      results,
    },
  };
}

async function searchDuckDuckGoHtml(
  fetcher: (input: string, init?: RequestInit) => Promise<Response>,
  query: string,
  maxResults: number,
): Promise<ToolResult> {
  const url = new URL(DUCKDUCKGO_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("kl", "wt-wt");

  const response = await fetcher(url.toString(), {
    headers: {
      "user-agent": "PaperclipWebSearch/0.1 (+https://paperclip.local)",
      "accept-language": "en-US,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const html = await response.text();
  const results = parseTopResults(html, maxResults);
  return {
    content: buildContent(query, results),
    data: {
      provider: "duckduckgo_html",
      query,
      results,
    },
  };
}

async function searchPublicWeb(
  fetcher: (input: string, init?: RequestInit) => Promise<Response>,
  config: { provider: SearchProvider; braveApiKey: string | null },
  query: string,
  maxResults: number,
): Promise<ToolResult> {
  if (config.provider === "brave") {
    if (!config.braveApiKey) {
      throw new Error("Brave search provider selected but no Brave API key is configured.");
    }
    return searchBrave(fetcher, query, maxResults, config.braveApiKey);
  }

  return searchDuckDuckGoHtml(fetcher, query, maxResults);
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.tools.register(
      "web-search",
      {
        displayName: "Web Search",
        description: "Search the public web for current information and return a compact ranked result set.",
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
              maximum: MAX_RESULTS_CAP,
              description: "Maximum number of results to return.",
            },
          },
          required: ["query"],
        },
      },
      async (params) => {
        try {
          const { query, maxResults } = parseInput((params ?? {}) as SearchParams);
          const config = parseConfig(await ctx.config.get());
          return await searchPublicWeb(ctx.http.fetch, config, query, maxResults);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.logger.warn("web search failed", { error: message });
          return { error: message };
        }
      },
    );
  },

  async onHealth() {
    return { status: "ok", message: "Web search worker is running and ready to execute searches" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
