import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
} from "@aws-sdk/client-cognito-identity";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from "amazon-cognito-identity-js";
import { WgTokens } from "./types";

const REGION = "us-west-2";
const USER_POOL_ID = "us-west-2_icsnuWQWw";
const CLIENT_ID = "7pk5du7fitqb419oabb3r92lni";
const IDENTITY_POOL_ID = "us-west-2:691e3287-5776-40f2-a502-759de65a8f1c";
const LAMBDA_FUNCTION = "prod-getDashboardView";

export default class WaterGuruAPI {
  private username: string;
  private password: string;
  private tokens: WgTokens | null = null;
  private cachedUserId: string | null = null;

  constructor({ username, password }: { username: string; password: string }) {
    if (!username || !password)
      throw new Error("WaterGuru username and password are required");

    this.username = username;
    this.password = password;
  }

  protected async cognitoLogin(): Promise<WgTokens> {
    if (this.tokens?.idToken) return this.tokens;

    const userPool = new CognitoUserPool({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
    });

    const user = new CognitoUser({
      Username: this.username,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: this.username,
      Password: this.password,
    });

    const tokens: WgTokens = await new Promise((resolve, reject) => {
      user.authenticateUser(authDetails, {
        onSuccess: (result: CognitoUserSession) => {
          const idToken = result.getIdToken().getJwtToken();
          const accessToken = result.getAccessToken().getJwtToken();
          const refreshToken = result.getRefreshToken().getToken();
          const username =
            result.getIdToken().payload["cognito:username"] || this.username;
          resolve({ idToken, accessToken, refreshToken, username });
        },
        onFailure: (err: unknown) => {
          reject(err);
        },
        newPasswordRequired: () => {
          reject(
            new Error("User requires new password; cannot continue login here")
          );
        },
      });
    });
    this.tokens = tokens;
    return tokens;
  }

  /* istanbul ignore next */
  private async getAwsCredentialsFromIdToken(idToken: string) {
    const cognitoIdentity = new CognitoIdentityClient({ region: REGION });

    const getIdMcd = new GetIdCommand({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
      },
    });

    const getIdResp = await cognitoIdentity.send(getIdMcd);
    if (!getIdResp.IdentityId) throw new Error("Failed to get IdentityId");

    const identityId = getIdResp.IdentityId;

    const getCredCmd = new GetCredentialsForIdentityCommand({
      IdentityId: identityId,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
      },
    });

    const credResp = await cognitoIdentity.send(getCredCmd);
    const creds = credResp.Credentials;
    if (!creds) throw new Error("Failed to get credentials for identity");

    return {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretKey,
      sessionToken: creds.SessionToken,
      expiration: creds.Expiration,
    };
  }

  protected async invokeDashboardLambda(idToken: string) {
    const awsCreds = await this.getAwsCredentialsFromIdToken(idToken);

    const lambda = new LambdaClient({
      region: REGION,
      credentials: {
        accessKeyId: awsCreds.accessKeyId || "",
        secretAccessKey: awsCreds.secretAccessKey || "",
        sessionToken: awsCreds.sessionToken || "",
      },
    });

    const payloadBase64 = idToken.split(".")[1];
    const payloadJson = JSON.parse(
      Buffer.from(payloadBase64, "base64").toString("utf-8")
    );
    const userId = payloadJson["cognito:username"];
    payloadJson.username;
    payloadJson.sub;
    this.cachedUserId = this.cachedUserId || userId;

    const body = {
      userId: this.cachedUserId,
      clientType: "WEB_APP",
      clientVersion: "0.2.3",
    };

    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION,
      Payload: Buffer.from(JSON.stringify(body)),
    });

    const resp = await lambda.send(command);

    if (!resp.Payload) throw new Error("Lambda returned no payload");
    const responseText = Buffer.from(resp.Payload).toString("utf8");

    return JSON.parse(responseText);
  }

  public async getDashboard() {
    const tokens = await this.cognitoLogin();
    return this.invokeDashboardLambda(tokens.idToken);
  }

  public async getPools() {
    const dash = await this.getDashboard();
    return dash;
  }
}
