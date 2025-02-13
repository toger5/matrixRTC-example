import "./assets/style.css";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<div>
<h1>Matrix RTC example</h1>
<p id="join_state">
Disconnected
</p>
<div class="card">
<button id="leave" type="button">Join</button>
</div>
<p id="error">
</p>
<div id="react"></div>
</div>
`;

import { widget } from "./helper/widget";
import { makePreferredLivekitFoci } from "./helper/matrixRTC";
import { getSFUConfigWithOpenID } from "./helper/openIDSFU";
import { Room, RoomEvent } from "livekit-client";
import { MatrixRTCSessionEvent } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";
import { CallMembership } from "matrix-js-sdk/src/matrixrtc/CallMembership";
import { initTLDraw } from "./TLDraw";

async function run() {
  if (!widget) throw "There is no widget.";

  const { client, widgetApi } = {
    widgetApi: widget.api,
    client: await widget.client,
  };

  if (!client || !widgetApi) throw "Could not create client.";

  const room = client.getRoom(widget.roomId);

  if (!room) throw "Could not get matrix room.";

  // Matrix RTC
  const session = client.matrixRTC.getRoomSession(room);

  const focus = (
    await makePreferredLivekitFoci(session, session.room.roomId)
  )[0];
  const sfuConfig = await getSFUConfigWithOpenID(client, focus);
  if (!sfuConfig) throw "Could not get SFU config from the jwt service";

  // App state
  let mouses = new Map<string, [number, number]>();

  function createDeleteMouseElements(memberships: CallMembership[]) {
    // use mouses to compute old memberships
    const oldIds = Array.from(mouses.keys());
    const newIds = memberships.map((m) => m.sender + ":" + m.deviceId);
    const left = oldIds.filter((m) => !newIds.includes(m));
    const joined = newIds.filter((m) => !oldIds.includes(m));
    for (const l of left) {
      console.log("MatrixRTCExample: removed: ", l, " because user left");
      mouses.delete(l);
    }
    for (const j of joined) {
      console.log("MatrixRTCExample: added: ", j, " because user joined");
      mouses.set(j, [0, 0]);
    }
    updateMouses();
  }

  // Join Leave listeners
  session.on(
    MatrixRTCSessionEvent.MembershipsChanged,
    (_oldMemberships, newMemberships) => {
      createDeleteMouseElements(newMemberships);
    }
  );

  document.getElementById("leave")!.onclick = () => {
    if (session.isJoined()) {
      session
        .leaveRoomSession()
        .then(() => widget?.api.setAlwaysOnScreen(false));
      livekitRoom.disconnect();
    } else {
      widget!.api.setAlwaysOnScreen(true);
      session.joinRoomSession([focus]);
      livekitRoom.connect(sfuConfig.url, sfuConfig.jwt);
    }
  };

  session.on(MatrixRTCSessionEvent.JoinStateChanged, (isJoined) => {
    document.getElementById("join_state")!.innerHTML = isJoined
      ? "connected"
      : "disconnected";
    document.getElementById("leave")!.innerHTML = isJoined ? "Leave" : "Join";
  });

  // Setup Livekit
  const livekitRoom = new Room({});
  const [encoder, decoder] = [new TextEncoder(), new TextDecoder()];

  // Setup Livekit listeners
  livekitRoom.on(RoomEvent.DataReceived, (payload, participant) => {
    console.log(
      "check is, ",
      livekitRoom.localParticipant.identity,
      " in ",
      Array.from(mouses.keys())
    );
    const mousePos = JSON.parse(decoder.decode(payload)) as [number, number];
    if (mousePos && typeof mousePos[0] === "number" && participant?.identity) {
      console.log(
        "MatrixRTCExample: receive mouse data: ",
        mousePos,
        "from: ",
        participant
      );
      if (mouses.get(participant.identity))
        mouses.set(participant.identity, mousePos);
    } else {
      console.log("error while parsing: ", payload);
    }
    updateMouses();
  });

  // setup game logic listeners
  document.onmousemove = (ev) => {
    if (mouses.get(livekitRoom.localParticipant.identity))
      mouses.set(livekitRoom.localParticipant.identity, [
        ev.clientX,
        ev.clientY,
      ]);
    if (session.isJoined()) {
      livekitRoom.localParticipant.publishData(
        encoder.encode(JSON.stringify([ev.clientX, ev.clientY])),
        {
          reliable: false,
        }
      );
      updateMouses();
    }
  };

  function updateMouses() {
    const appView = document.querySelector<HTMLDivElement>("#app")!;
    for (const k of mouses.keys()) {
      const mouseEl = document.getElementById(k);
      if (!mouseEl) {
        var mouseDiv = document.createElement("div");
        mouseDiv.className = "mouse";
        mouseDiv.id = k;
        mouseDiv.innerText = k;
        appView.appendChild(mouseDiv);
      }
    }
    const mouseCollection = document.getElementsByClassName("mouse");
    for (let i = 0; i < mouseCollection.length; i++) {
      let m = mouseCollection.item(i)! as HTMLElement;
      if (Array.from(mouses.keys()).includes(m.id)) {
        const mouseData = mouses.get(m.id);
        m.style.top = mouseData![1] + "px";
        m.style.left = mouseData![0] + "px";
      } else {
        appView.removeChild(m);
      }
    }
  }

  // Initial setup
  widget.api.setAlwaysOnScreen(true);
  session.joinRoomSession([focus]);
  createDeleteMouseElements(session.memberships);
  initTLDraw(livekitRoom);
  await livekitRoom.connect(sfuConfig.url, sfuConfig.jwt);
}

try {
  await run();
} catch (e) {
  document.getElementById("error")!.innerHTML = ("Error:<br>" + e) as string;
}
