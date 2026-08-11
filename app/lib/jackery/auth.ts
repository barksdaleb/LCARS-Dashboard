import crypto from "crypto";
import { v3 as uuidv3, v4 as uuidv4 } from "uuid";

const PUBLIC_KEY =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCVmzgJy/4XolxPnkfu32YtJqYGFLYqf9/rnVgURJED+8J9J3Pccd6+9L97/+7COZE5OkejsgOkqeLNC9C3r5mhpE4zk/HStss7Q8/5DqkGD1annQ+eoICo3oi0dITZ0Qll56Dowb8lXi6WHViVDdih/oeUwVJY89uJNtTWrz7t7QIDAQAB";

const AES_KEY = "1234567890123456";

export class JackeryAuth {
  async login(email: string, password: string) {
    // We'll build this together.
  }

}

function generateUDID(
  androidId = "abcd1234567890ef"
): string {
  if (androidId && androidId !== "9774d56d682e549c") {
    return "2" + uuidFromJavaMD5(androidId);
  }

  return "9" + uuidv4().replace(/-/g, "");
}

function uuidFromJavaMD5(data: string): string {
  const md5 = crypto.createHash("md5").update(data).digest();

  // Force UUID version 3 bits
  md5[6] = (md5[6] & 0x0f) | 0x30;
  md5[8] = (md5[8] & 0x3f) | 0x80;

  return Buffer.from(md5)
    .toString("hex")
    .match(/.{1,2}/g)!
    .join("")
    .replace(/-/g, "");
}