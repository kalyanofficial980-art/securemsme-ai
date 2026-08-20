export const PAYMENT_PROOF_BUCKET = "payment-proofs";
export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

const mimeToExtension = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type PaymentProofMime = keyof typeof mimeToExtension;
export type PaymentProofExtension = (typeof mimeToExtension)[PaymentProofMime];

type ValidationResult =
  | {
      valid: true;
      mimeType: PaymentProofMime;
      extension: PaymentProofExtension;
    }
  | {
      valid: false;
      error: string;
    };

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((value, index) => bytes[index] === value);
}

function isJpeg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function detectedMime(bytes: Uint8Array): PaymentProofMime | null {
  if (isPng(bytes)) return "image/png";
  if (isJpeg(bytes)) return "image/jpeg";
  if (isWebp(bytes)) return "image/webp";
  return null;
}

export async function validatePaymentProofBlob(blob: Blob): Promise<ValidationResult> {
  if (!blob.size) {
    return { valid: false, error: "Upload a payment confirmation screenshot." };
  }
  if (blob.size > PAYMENT_PROOF_MAX_BYTES) {
    return { valid: false, error: "Payment screenshot must be 5 MB or smaller." };
  }

  const declaredMime = blob.type.toLowerCase() as PaymentProofMime;
  if (!(declaredMime in mimeToExtension)) {
    return {
      valid: false,
      error: "Payment screenshot must be PNG, JPG, or WebP.",
    };
  }

  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const actualMime = detectedMime(header);
  if (!actualMime || actualMime !== declaredMime) {
    return {
      valid: false,
      error: "Payment screenshot file type could not be verified.",
    };
  }

  return {
    valid: true,
    mimeType: actualMime,
    extension: mimeToExtension[actualMime],
  };
}

export function createPaymentProofPath(
  userId: string,
  extension: PaymentProofExtension,
) {
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}
