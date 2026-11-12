import { describe, expect, it } from "vitest";
import { mappedDocPaths, mappingMatchesEndpoint } from "../mappings";

const POST_SWAP = { method: "POST", path: "/swap", handler: "handleSwap" };

describe("doc mapping matching", () => {
  it("matches method and path pairs", () => {
    expect(
      mappingMatchesEndpoint(
        { routePattern: "POST /swap", docPath: "docs/swap.mdx" },
        POST_SWAP,
      ),
    ).toBe(true);
  });

  it("rejects a different method", () => {
    expect(
      mappingMatchesEndpoint(
        { routePattern: "GET /swap", docPath: "docs/swap.mdx" },
        POST_SWAP,
      ),
    ).toBe(false);
  });

  it("matches path-only patterns with any method", () => {
    expect(
      mappingMatchesEndpoint(
        { routePattern: "/swap", docPath: "docs/swap.mdx" },
        POST_SWAP,
      ),
    ).toBe(true);
  });

  it("matches nested paths and wildcard suffixes", () => {
    expect(
      mappingMatchesEndpoint(
        { routePattern: "POST /swap/*", docPath: "docs/swap.mdx" },
        { ...POST_SWAP, path: "/swap/sub" },
      ),
    ).toBe(true);
  });

  it("matches nested paths under a base path", () => {
    expect(
      mappingMatchesEndpoint(
        { routePattern: "/v1/swap", docPath: "docs/swap.mdx" },
        { ...POST_SWAP, path: "/v1/swap/status" },
      ),
    ).toBe(true);
  });

  it("does not match unrelated paths", () => {
    expect(
      mappingMatchesEndpoint(
        { routePattern: "POST /trade", docPath: "docs/trade.mdx" },
        POST_SWAP,
      ),
    ).toBe(false);
  });

  it("collects unique existing doc paths", () => {
    const paths = mappedDocPaths(
      [
        { routePattern: "POST /swap", docPath: "docs/swap.mdx" },
        { routePattern: "/swap", docPath: "docs/swap.mdx" },
        { routePattern: "GET /trade", docPath: "docs/trade.mdx" },
        { routePattern: "POST /swap", docPath: "docs/missing.mdx" },
      ],
      POST_SWAP,
      (path) => !path.includes("missing"),
    );

    expect(paths).toEqual(["docs/swap.mdx"]);
  });

  it("returns nothing when there is no endpoint path", () => {
    expect(
      mappedDocPaths(
        [{ routePattern: "POST /swap", docPath: "docs/swap.mdx" }],
        { method: "POST", path: null, handler: null },
        () => true,
      ),
    ).toEqual([]);
  });
});
