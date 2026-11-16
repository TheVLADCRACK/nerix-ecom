import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhook } from "../src/server/kpay";

const secret = "whsec_test_123";
const sign = (body: string) => createHmac("sha256", secret).update(body).digest("hex");

describe("webhook KPay", () => {
  const body = '{"event":"payment.completed","paymentId":"p-1","externalId":"EP-1-1","status":"COMPLETED"}';
  it("accepte une signature valide sur le corps brut", () => {
    expect(verifyWebhook(body, sign(body), secret)).toBe(true);
  });
  it("refuse un corps modifié, une signature fausse ou absente, un secret vide", () => {
    expect(verifyWebhook(`${body} `, sign(body), secret)).toBe(false);
    expect(verifyWebhook(body, "00".repeat(32), secret)).toBe(false);
    expect(verifyWebhook(body, null, secret)).toBe(false);
    expect(verifyWebhook(body, sign(body), "")).toBe(false);
  });
});
