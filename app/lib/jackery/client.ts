import axios from "axios";
import crypto from "crypto";

import { encryptAES, encryptRSA } from "./crypto";
import {
  JackeryDevice,
  JackeryPropertyResponse,
  JackeryResponse,
  LoginBean,
} from "./types";

const PUBLIC_KEY =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCVmzgJy/4XolxPnkfu32YtJqYGFLYqf9/rnVgURJED+8J9J3Pccd6+9L97/+7COZE5OkejsgOkqeLNC9C3r5mhpE4zk/HStss7Q8/5DqkGD1annQ+eoICo3oi0dITZ0Qll56Dowb8lXi6WHViVDdih/oeUwVJY89uJNtTWrz7t7QIDAQAB";

const AES_KEY = "1234567890123456";

export class JackeryClient {
  private readonly baseUrl = "https://iot.jackeryapp.com";

  private token: string | null = null;

  constructor(
    private readonly account: string,
    private readonly password: string,
    private readonly androidId = "abcd1234567890ef"
  ) {}

  /**
   * Port of Python _name_uuid_from_bytes_java()
   */
  private nameUuidFromBytesJava(data: Buffer): string {
    const md5 = crypto.createHash("md5").update(data).digest();

    // Match Python uuid.UUID(bytes=..., version=3)
    md5[6] = (md5[6] & 0x0f) | 0x30;
    md5[8] = (md5[8] & 0x3f) | 0x80;

    return Array.from(md5)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Port of Python _generate_udid()
   */
  private generateUdid(): string {
    if (
      this.androidId &&
      this.androidId !== "9774d56d682e549c"
    ) {
      return (
        "2" +
        this.nameUuidFromBytesJava(
          Buffer.from(this.androidId, "utf8")
        )
      );
    }

    return "9" + crypto.randomUUID().replace(/-/g, "");
  }
}
