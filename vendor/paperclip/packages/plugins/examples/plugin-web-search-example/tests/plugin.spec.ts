import { afterEach, describe, expect, it, vi } from "vitest";
import { createTestHarness } from "@paperclipai/plugin-sdk";
import manifest from "../src/manifest.js";
import plugin from "../src/worker.js";

describe("web search plugin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers the tool and parses top web results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => `
          <html>
            <body>
              <a class="result__a" href="https://example.com/one">Example Result One</a>
              <div class="result__snippet">First result snippet.</div>
              <a class="result__a" href="https://example.com/two">Example Result Two</a>
              <div class="result__snippet">Second result snippet.</div>
            </body>
          </html>
        `,
      }),
    );

    const harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.executeTool("web-search", {
      query: "paperclip search",
      maxResults: 2,
    });

    expect(result.error).toBeUndefined();
    expect(result.content).toContain('Web search results for "paperclip search":');
    expect(result.content).toContain("Example Result One");
    expect(result.data).toEqual({
      query: "paperclip search",
      results: [
        {
          title: "Example Result One",
          url: "https://example.com/one",
          snippet: "First result snippet.",
        },
        {
          title: "Example Result Two",
          url: "https://example.com/two",
          snippet: "Second result snippet.",
        },
      ],
    });
  });

  it("returns a structured error for invalid input", async () => {
    const harness = createTestHarness({ manifest });
    await plugin.definition.setup(harness.ctx);

    const result = await harness.executeTool("web-search", {
      query: "   ",
    });

    expect(result.error).toContain('Parameter "query" must be a non-empty string.');
  });
});
