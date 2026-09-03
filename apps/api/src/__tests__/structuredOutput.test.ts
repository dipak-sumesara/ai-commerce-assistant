import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractJsonObject } from "../utils/json.js";

describe("structured output parsing", () => {
  it("parses a fenced JSON object", () => {
    expect(extractJsonObject('```json\n{"ok":true}\n```')).toEqual({
      ok: true,
    });
  });

  it("throws on malformed model JSON", () => {
    expect(() => extractJsonObject("not json")).toThrow();
  });

  it("rejects missing fields through Zod validation", () => {
    const schema = z.object({ required: z.string() });
    expect(() =>
      schema.parse(extractJsonObject('{"optional":true}')),
    ).toThrow();
  });
});
