import { AutoDiscovery } from "matrix-js-sdk";
import {
  isLivekitFocusConfig,
  LivekitFocus,
} from "matrix-js-sdk/src/matrixrtc/LivekitFocus";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";

const FOCI_WK_KEY = "org.matrix.msc4143.rtc_foci";

export async function makePreferredLivekitFoci(
  rtcSession: MatrixRTCSession,
  livekitAlias: string
): Promise<LivekitFocus[]> {
  console.log("Start building foci_preferred list: ", rtcSession.room.roomId);

  const preferredFoci: LivekitFocus[] = [];

  // Prioritize the .well-known/matrix/client, if available, over the configured SFU
  const domain = rtcSession.room.client.getDomain();
  if (domain) {
    // we use AutoDiscovery instead of relying on the MatrixClient having already
    // been fully configured and started
    const wellKnownFoci = (await AutoDiscovery.getRawClientConfig(domain))?.[
      FOCI_WK_KEY
    ];
    if (Array.isArray(wellKnownFoci)) {
      preferredFoci.push(
        ...wellKnownFoci
          .filter((f) => !!f)
          .filter(isLivekitFocusConfig)
          .map((wellKnownFocus) => {
            console.log(
              "Adding livekit focus from well known: ",
              wellKnownFocus
            );
            return { ...wellKnownFocus, livekit_alias: livekitAlias };
          })
      );
    }
  }
  return preferredFoci;
}
