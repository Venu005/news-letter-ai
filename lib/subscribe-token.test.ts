import { describe, expect, it } from "vitest";
import { hashToken, randomUrlToken, timingSafeEqualHex } from "./subscribe-token";

describe("subscribe-token", () => {
  it("hashToken is deterministic", () => {
    const t = "hello-token";
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(hashToken(`${t}!`));
  });

  it("timingSafeEqualHex accepts equal hashes", () => {
    const h = hashToken("x");
    expect(timingSafeEqualHex(h, h)).toBe(true);
  });

  it("timingSafeEqualHex rejects unequal length or value", () => {
    expect(timingSafeEqualHex("abc", "abc")).toBe(false);
    expect(timingSafeEqualHex(hashToken("a"), hashToken("b"))).toBe(false);
  });

  it("randomUrlToken has entropy", () => {
    expect(randomUrlToken()).not.toBe(randomUrlToken());
  });
});
