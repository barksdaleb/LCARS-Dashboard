export interface LoginBean {
  account: string;
  loginType: number;
  macId: string;
  password: string;
  phone: string;
  registerAppId: string;
  verificationCode: string;
}

export interface JackeryResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface JackeryDevice {
  devId: string;
  devName: string;
  [key: string]: unknown;
}

export interface JackeryPropertyResponse {
  properties: Record<string, unknown>;
}