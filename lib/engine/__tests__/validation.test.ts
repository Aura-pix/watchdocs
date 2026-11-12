import { describe, expect, it } from "vitest";
import { addedLines, validateGroundedStatuses } from "../validation";

describe("doc validation", () => {
  it("returns only lines that are new in the updated doc", () => {
    expect(addedLines("keep\nold", "keep\nnew")).toEqual(["new"]);
    expect(addedLines("a\nb\na", "a\nb\na")).toEqual([]);
  });

  it("accepts status codes that appear in the source material", () => {
    const issues = validateGroundedStatuses(
      "Returns 200.",
      "Returns 200 or 429.",
      'throw new ApiError(429, "rate limited")',
    );
    expect(issues).toEqual([]);
  });

  it("rejects status codes not backed by the diff, spec, or fixtures", () => {
    const issues = validateGroundedStatuses(
      "Returns 200.",
      "Returns 200 or 503.",
      "throw new ApiError(429)",
    );
    expect(issues).toEqual([
      "status 503 is not present in the diff, spec, or fixtures",
    ]);
  });
});
