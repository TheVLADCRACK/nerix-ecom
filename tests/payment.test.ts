import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "../src/server/saspay";

const secret = "whsec_test_123";
const sign = (ts: string, body: string) => createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");

describe("webhook SasPay", () => {
  const body = '{"event":"transaction.success","data":{"id":"tx-1"}}';
  const now = 1_763_200_000_000;
  const ts = String(now / 1000);
  it("accepte une signature valide sur le corps brut", () => {
    expect(verifyWebhook(body, sign(ts, body), ts, secret, now)).toBe(true);
  });
  it("refuse un corps modifié, une signature fausse ou absente", () => {
    expect(verifyWebhook(`${body} `, sign(ts, body), ts, secret, now)).toBe(false);
    expect(verifyWebhook(body, "00".repeat(32), ts, secret, now)).toBe(false);
    expect(verifyWebhook(body, null, ts, secret, now)).toBe(false);
    expect(verifyWebhook(body, sign(ts, body), ts, "", now)).toBe(false);
  });
  it("refuse un horodatage de plus de 300 s", () => {
    const old = String(now / 1000 - 301);
    expect(verifyWebhook(body, sign(old, body), old, secret, now)).toBe(false);
  });
});
