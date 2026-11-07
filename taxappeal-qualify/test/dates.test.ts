import { describe, expect, it } from "vitest";
import { isoDate, DeskConfigSchema } from "../src/types.js";
import { qualify } from "../src/pipeline.js";
import { candidate, ctx, config } from "./helpers.js";

describe("calendar dates", () => {
  it.each(["2026-00-00", "2026-02-29", "2026-04-31", "2026-99-99"])("rejects %s at intake and config boundaries", async (date) => {
    expect(isoDate.safeParse(date).success).toBe(false);
    expect((await qualify(candidate({ provenance: { fetchedAt: date } }), ctx())).status).toBe("INCOMPLETE");
    const cfg = config();
    cfg.routes[0]!.closes = date;
    expect(DeskConfigSchema.safeParse(cfg).success).toBe(false);
    await expect(qualify(candidate(), { ...ctx(), today: date })).rejects.toThrow();
  });
  it("accepts leap days in leap years", () => {
    expect(isoDate.safeParse("2028-02-29").success).toBe(true);
  });
});
