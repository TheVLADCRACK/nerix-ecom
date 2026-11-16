import { describe, expect, it } from "vitest";
import { hasAnyPixel, validIds } from "../src/lib/pixels";

describe("validIds", () => {
  it("garde plusieurs pixels Meta valides, sans doublon, et rejette le reste", () => {
    const ids = validIds({ metaPixelIds: ["123456789", "123456789", "98765", "abc'</script>", ""], tiktokPixelId: "bad id", ga4Id: "G-ABC123", googleAdsId: "", gtmId: "" });
    expect(ids.metaPixelIds).toEqual(["123456789", "98765"]);
    expect(ids.tiktokPixelId).toBe("");
    expect(ids.ga4Id).toBe("G-ABC123");
    expect(hasAnyPixel(ids)).toBe(true);
    expect(hasAnyPixel(validIds({ metaPixelIds: [], tiktokPixelId: "", ga4Id: "", googleAdsId: "", gtmId: "" }))).toBe(false);
  });
});
