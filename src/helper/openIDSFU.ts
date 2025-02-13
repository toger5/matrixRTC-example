/*
Copyright 2023, 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

// This code is taken from the ElementCall codebase
import { type IOpenIDToken, type MatrixClient } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { type LivekitFocus } from "matrix-js-sdk/src/matrixrtc/LivekitFocus";

export interface SFUConfig {
  url: string;
  jwt: string;
}

export function sfuConfigEquals(a?: SFUConfig, b?: SFUConfig): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;

  return a.jwt === b.jwt && a.url === b.url;
}

// The bits we need from MatrixClient
export type OpenIDClientParts = Pick<
  MatrixClient,
  "getOpenIdToken" | "getDeviceId"
>;

export async function getSFUConfigWithOpenID(
  client: OpenIDClientParts,
  activeFocus: LivekitFocus
): Promise<SFUConfig | undefined> {
  const openIdToken = await client.getOpenIdToken();
  logger.debug("Got openID token", openIdToken);

  try {
    logger.info(
      `Trying to get JWT from call's active focus URL of ${activeFocus.livekit_service_url}...`
    );
    const sfuConfig = await getLiveKitJWT(
      client,
      activeFocus.livekit_service_url,
      activeFocus.livekit_alias,
      openIdToken
    );
    logger.info(`Got JWT from call's active focus URL.`);

    return sfuConfig;
  } catch (e) {
    logger.warn(
      `Failed to get JWT from RTC session's active focus URL of ${activeFocus.livekit_service_url}.`,
      e
    );
    return undefined;
  }
}

async function getLiveKitJWT(
  client: OpenIDClientParts,
  livekitServiceURL: string,
  roomName: string,
  openIDToken: IOpenIDToken
): Promise<SFUConfig> {
  try {
    const res = await fetch(livekitServiceURL + "/sfu/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room: roomName,
        openid_token: openIDToken,
        device_id: client.getDeviceId(),
      }),
    });
    if (!res.ok) {
      throw new Error("SFU Config fetch failed with status code " + res.status);
    }
    const sfuConfig = await res.json();
    console.log(
      "MatrixRTCExample: get SFU config: \nurl:",
      sfuConfig.url,
      "\njwt",
      sfuConfig.jwt
    );
    return sfuConfig;
  } catch (e) {
    throw new Error("SFU Config fetch failed with exception " + e);
  }
}
