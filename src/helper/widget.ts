/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

// This code is taken from the Element Call codebase and a bit over engineered
// for this simple demo.

import { logger } from "matrix-js-sdk/src/logger";
import { EventType } from "matrix-js-sdk/src/@types/event";
import { createRoomWidgetClient } from "matrix-js-sdk/src/matrix";
import { MatrixCapabilities, WidgetApi } from "matrix-widget-api";

import type { MatrixClient } from "matrix-js-sdk/src/client";
import { getUrlParams } from "./urlParser";

export interface WidgetHelpers {
  api: WidgetApi;
  client: Promise<MatrixClient>;
  roomId: string;
}

export const widget = ((): WidgetHelpers | null => {
  try {
    const { widgetId, parentUrl } = getUrlParams();

    if (widgetId && parentUrl) {
      const parentOrigin = new URL(parentUrl).origin;
      const api = new WidgetApi(widgetId, parentOrigin);
      api.requestCapability(MatrixCapabilities.AlwaysOnScreen);
      // Now, initialize the matryoshka MatrixClient (so named because it routes
      // all requests through the host client via the widget API)
      // We need to do this now rather than later because it has capabilities to
      // request, and is responsible for starting the transport (should it be?)

      const { baseUrl, roomId, userId, deviceId } = getUrlParams();
      if (!roomId) throw new Error("Room ID must be supplied");
      if (!userId) throw new Error("User ID must be supplied");
      if (!deviceId) throw new Error("Device ID must be supplied");
      if (!baseUrl) throw new Error("Base URL must be supplied");

      const sendState = [
        userId, // Legacy call membership events
        `_${userId}_${deviceId}`, // Session membership events
        `${userId}_${deviceId}`, // The above with no leading underscore, for room versions whose auth rules allow it
      ].map((stateKey) => ({
        eventType: EventType.GroupCallMemberPrefix,
        stateKey,
      }));
      const receiveState = [
        { eventType: EventType.RoomCreate },
        { eventType: EventType.RoomMember },
        { eventType: EventType.GroupCallMemberPrefix },
      ];

      const client = createRoomWidgetClient(
        api,
        {
          sendMessage: ["m.text"],
          sendState,
          receiveState,
          turnServers: false,
          sendDelayedEvents: true,
          updateDelayedEvents: true,
        },
        roomId,
        {
          baseUrl,
          userId,
          deviceId,
          timelineSupport: true,
        },
        // ContentLoaded event will be sent as soon as the theme is set (see useTheme.ts)
        false
      );

      const clientPromise = async (): Promise<MatrixClient> => {
        await client.startClient({ clientWellKnownPollPeriod: 60 * 10 });
        return client;
      };

      return { api, client: clientPromise(), roomId };
    } else {
      return null;
    }
  } catch (e) {
    logger.warn("Continuing without the widget API", e);
    return null;
  }
})();
