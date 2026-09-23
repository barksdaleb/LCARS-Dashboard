import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

export class JackeryAuth {
  async login(email: string, password: string) {
    // Authentication remains a scaffold; callers currently receive no result.
    void email;
    void password;
  }

}

export function generateUDID(
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