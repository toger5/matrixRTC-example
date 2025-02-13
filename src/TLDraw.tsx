import "@tldraw/tldraw/tldraw.css";

import { HistoryEntry, Tldraw, TLRecord, useTLStore } from "@tldraw/tldraw";
import { createRoot } from "react-dom/client";
import { Room, RoomEvent } from "livekit-client";
import { useEffect, useState } from "react";

const [encoder, decoder] = [new TextEncoder(), new TextDecoder()];
export function initTLDraw(livekitRoom: Room) {
  const root = createRoot(document.getElementById("react")!);

  root.render(<TldrawComponent room={livekitRoom} />);
}

export const TldrawComponent = (props: { room: Room }) => {
  const { room } = props;
  const store = useTLStore({});
  const [hidden, setHidden] = useState(true);
  const [maximised, setMaximised] = useState(false);

  // setup listeners
  useEffect(() => {
    store.listen(
      (changes) => {
        const serializedChanges = JSON.stringify(changes);
        console.log("MatrixRTCExample: TLDraw send event: ", serializedChanges);

        room.localParticipant.publishData(encoder.encode(serializedChanges), {
          reliable: true,
        });
      },
      { source: "user", scope: "document" }
    );

    room.on(RoomEvent.DataReceived, (payload, _participant) => {
      const deserializedChanges = JSON.parse(
        decoder.decode(payload)
      ) as HistoryEntry<TLRecord>;
      console.log(
        "MatrixRTCExample: participant: " +
          _participant?.identity +
          "TLDraw any event: ",
        deserializedChanges
      );

      if ("changes" in deserializedChanges) {
        console.log(
          "MatrixRTCExample: TLDraw changes: ",
          deserializedChanges.changes
        );
        store.mergeRemoteChanges(() => {
          store.applyDiff(deserializedChanges.changes);
        });
      }
    });
  }, [store, room]);
  const display = hidden ? "none" : undefined;
  const maximisedStyleDiv: React.CSSProperties = {
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  };
  const maximisedStyleButton: React.CSSProperties = {
    position: "absolute",
    top: 10,
    right: "40%",
  };
  return (
    <div>
      <div
        style={{
          width: "100%",
          height: "300px",
          display,
          ...(maximised ? maximisedStyleDiv : {}),
        }}
      >
        <Tldraw store={store} />
      </div>
      {hidden && (
        <button style={{ marginTop: "1em" }} onClick={() => setHidden(!hidden)}>
          More.......
        </button>
      )}
      {!hidden && (
        <button
          style={{
            zIndex: 1,
            ...(maximised ? maximisedStyleButton : { margin: 10 }),
          }}
          onClick={() => setMaximised(!maximised)}
        >
          {maximised ? "Minimize" : "Maximise"}
        </button>
      )}
    </div>
  );
};
