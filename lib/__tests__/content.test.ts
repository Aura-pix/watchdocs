import { describe, expect, it } from "vitest";
import { getDocBySlug, getPage, listDocs } from "../content";

describe("content loading", () => {
  it("lists the seeded documentation with metadata", () => {
    const docs = listDocs();

    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((doc) => doc.meta.title.length > 0)).toBe(true);
    expect(docs.every((doc) => doc.meta.slug.length > 0)).toBe(true);
  });

  it("sorts documentation by the order field", () => {
    const docs = listDocs();
    const first = docs[0];

    expect(first.meta.slug).toEqual(["overview"]);
  });

  it("finds a document by slug", () => {
    const doc = getDocBySlug(["overview"]);

    expect(doc?.meta.title).toBe("Overview");
    expect(doc?.body).toContain("GitHub App");
  });

  it("returns null for unknown documents", () => {
    expect(getDocBySlug(["does-not-exist"])).toBeNull();
  });

  it("loads standalone pages", () => {
    const privacy = getPage("privacy");

    expect(privacy?.meta.title).toBe("Privacy Policy");
    expect(getPage("missing")).toBeNull();
  });
});
