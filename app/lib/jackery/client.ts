import crypto from "crypto";

import { encryptAES, encryptRSA } from "./crypto";
import type { LoginBean } from "./types";

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

  /** Authenticate using the same encrypted request as the reference client. */
  async testConnection(): Promise<boolean> {
    if (!this.account || !this.password) {
      throw new Error("Jackery email and password are required");
    }
    const login: LoginBean = {
      account: this.account,
      password: this.password,
      loginType: 2,
      macId: this.generateUdid(),
      phone: "",
      registerAppId: "com.hbxn.jackery",
      verificationCode: "",
    };
    const url = new URL("/v1/auth/login", this.baseUrl);
    url.searchParams.set("aesEncryptData", encryptAES(JSON.stringify(login), AES_KEY));
    url.searchParams.set("rsaForAesKey", encryptRSA(Buffer.from(AES_KEY), PUBLIC_KEY));
    const body = new FormData();
    body.append("file", new Blob([]), "");
    const response = await fetch(url, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
      headers: {
        app_version: "1.0.5", platform: "1", sys_version: "17.2",
        "upload-incomplete": "?0", "upload-draft-interop-version": "3",
        accept: "*/*", "accept-language": "en-US",
        "User-Agent": "DxPowerProject/1.0.5 (com.hb.jackery; build:2; iOS 17.2.0) Alamofire/5.8.0",
        model: "iPad Pro (12.9-inch) (3rd generation)",
      },
    });
    if (!response.ok) throw new Error(`Jackery login failed: HTTP ${response.status}`);
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null || !("code" in result) || result.code !== 0 || !("token" in result) || typeof result.token !== "string" || !result.token) {
      throw new Error("Jackery login returned no valid authentication token");
    }
    this.token = result.token;
    return this.token.length > 0;
  }

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
