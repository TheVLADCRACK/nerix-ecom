import { describe, expect, it } from "vitest";
import { retryable } from "@/lib/db";

const net = (code = "") => Object.assign(new Error("Error connecting to database: TypeError: fetch failed"), { sourceError: { cause: { code } } });

describe("retryable", () => {
  it("réessaie une lecture après une coupure réseau", () => expect(retryable(net(), "SELECT 1")).toBe(true));
  it("ne rejoue pas une écriture dont l'envoi est incertain", () => expect(retryable(net("ECONNRESET"), "UPDATE ecom.orders SET x = 1")).toBe(false));
  it("rejoue une écriture si la connexion n'a jamais été établie", () => expect(retryable(net("UND_ERR_CONNECT_TIMEOUT"), "INSERT INTO t VALUES (1)")).toBe(true));
  it("ne réessaie pas une erreur SQL", () => expect(retryable(new Error('relation "x" does not exist'), "SELECT 1")).toBe(false));
});
