import { describe, expect, it } from "vitest";
import {
  PAYMENT_PROOF_MAX_BYTES,
  createPaymentProofPath,
  validatePaymentProofBlob,
} from "./payment-proof";

function pngBlob(type = "image/png") {
  return new Blob(
    [
      new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
        0x0d, 0x49, 0x48, 0x44, 0x52,
      ]),
    ],
    { type },
  );
}

describe("payment proof validation", () => {
  it("accepts a PNG whose declared and actual types match", async () => {
    const result = await validatePaymentProofBlob(pngBlob());
    expect(result).toEqual({
      valid: true,
      mimeType: "image/png",
      extension: "png",
    });
  });

  it("rejects a spoofed image mime type", async () => {
    const result = await validatePaymentProofBlob(pngBlob("image/jpeg"));
    expect(result.valid).toBe(false);
  });

  it("rejects files above the payment-proof size limit", async () => {
    const result = await validatePaymentProofBlob(
      new Blob([new Uint8Array(PAYMENT_PROOF_MAX_BYTES + 1)], {
        type: "image/png",
      }),
    );
    expect(result.valid).toBe(false);
  });

  it("creates a user-scoped immutable-style object path", () => {
    const path = createPaymentProofPath(
      "11111111-1111-1111-1111-111111111111",
      "webp",
    );
    expect(path).toMatch(
      /^11111111-1111-1111-1111-111111111111\/[0-9a-f-]{36}\.webp$/,
    );
  });
});
