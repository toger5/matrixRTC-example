# MatrixRTC Example

This is a simple example using MatrixRTC for a demo of the FOSDEM talk:
[**MatrixRTC: Building Real-Time Applications on Matrix**](https://fosdem.org/2025/schedule/event/fosdem-2025-5034-matrixrtc-building-real-time-applications-on-matrix/).

It synchronizes mouse pointer positions and optionally allows users to display a collaborative whiteboard (TLDraw)
that updates in real time. However, there is no persistent state.

This example demonstrates how to build a widget for ElementWeb that sets up a MatrixRTC session using the `matrix-js-sdk`
MatrixRTC implementation and the `matrix-js-sdk` embedded client.

## What you can do

Watch the talk linked above, to see what you can do with it. This is intended as a basis to play around with matrixRTC.
So there is little you can do but it should be easy to extend it to your liking and build sth new with what you have learned.
This is the current behaviour:

- Open the widget and it will immediately connect.
- The widget will be sticky while connected (So we do not get stuck membership events).
- You can leave manually and see how other clients react to this by updating the call member count.
- If left the widget will not be sticky anymore and you can close it by pressing the minimize or back button.
- When connected it will always share the mouse position and show it in all peers.
- If you press the more button you will be able to use TLDraw and all changes will be synced with all
  currently connected peers. New Joiners will not get the historic state however.

## How It Works

The widget communicates with the Matrix client, sending and receiving events within the room.
These events are used to manage the MatrixRTC session state.

- It initiates a MatrixRTC session of type `application: m.call`, which ElementWeb detects as an active call.
- If multiple clients start the widget in the same room, each sends a participation state event.
- ElementWeb and ElementX use these events to determine the number of participants present them in the UI.
- The LiveKit focus type is used to establish WebRTC connections for exchanging mouse positions and whiteboard updates.

## Setup

To experiment with this demo, clone the repository and start the development server:

```bash
pnpm install
pnpm dev
```

This project uses vite with the `basicSsl` plugin. This is needed because the browser will not
allow ElementWeb to render http widgets in an IFrame.
The certificate used will not be trusted so make sure you open the
widget in a dedicated browser tab first and accept the untrusted certificate. Then the ElementWeb IFrame will also
accept the certificate but it will not show you the option to use this certificate initially.

### Adding the Widget to a Matrix Room

Once running, the widget can be added to a Matrix room using the following URL format: `https://localhost:5173/#/?widgetId=$matrix_widget_id&userId=$matrix_user_id&roomId=$matrix_room_id&baseUrl=$org.matrix.msc4039.matrix_base_url&deviceId=$org.matrix.msc3819.matrix_device_id`

To add it to a room in ElementWeb, use this command:

```txt
/addwidget https://localhost:5173/#/?widgetId=$matrix_widget_id&userId=$matrix_user_id&roomId=$matrix_room_id&baseUrl=$org.matrix.msc4039.matrix_base_url&deviceId=$org.matrix.msc3819.matrix_device_id
```
