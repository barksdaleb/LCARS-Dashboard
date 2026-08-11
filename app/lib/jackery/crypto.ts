import crypto from "crypto";
import forge from "node-forge";

/**
 * AES-128-ECB encryption with PKCS7 padding.
 * Matches the Python implementation.
 */
export function encryptAES(
  plainText: string,
  key: string
): string {
  const cipher = crypto.createCipheriv(
    "aes-128-ecb",
    Buffer.from(key, "utf8"),
    null
  );

  cipher.setAutoPadding(true);

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plainText, "utf8")),
    cipher.final(),
  ]);

  return encrypted.toString("base64");
}

/**
 * RSA PKCS#1 v1.5 encryption.
 * Matches the Python implementation.
 */
export function encryptRSA(
  data: Buffer,
  publicKeyBase64: string
): string {
  const pem = [
    "-----BEGIN PUBLIC KEY-----",
    publicKeyBase64,
    "-----END PUBLIC KEY-----",
  ].join("\n");

  const publicKey = forge.pki.publicKeyFromPem(pem);

  const encrypted = publicKey.encrypt(
    forge.util.binary.raw.encode(data),
    "RSAES-PKCS1-V1_5"
  );

  return forge.util.encode64(encrypted);
}