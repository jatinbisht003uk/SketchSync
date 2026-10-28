# SketchSync

SketchSync is a lightweight collaborative whiteboard built with React, TypeScript, Canvas, Zustand, and Socket.IO. Drawing objects stay editable as structured data and save to the browser automatically.

## Features

- Pencil, rectangle, ellipse, line, arrow, diamond, text, eraser, select, and hand tools
- Color, fill, stroke width, solid or dashed lines
- Select, multi-select with Shift, move, resize from corner handles, restyle, and delete objects; double-click text to edit it
- Local autosave, undo and redo, light and dark themes
- Zoom, pointer-centered mouse-wheel zoom, hand tool, and space plus drag panning
- PNG and JSON export, validated JSON import
- Shared rooms with live drawing updates, participant initials, and live cursors

## Technology

- React 19, TypeScript, Vite, CSS, Lucide React
- Canvas 2D renderer, Zustand state with localStorage persistence
- Node.js, Express, Socket.IO, nanoid

## Project layout

```text
src/                 React app, canvas, drawing engine, state, and collaboration client
server/src/           Express and Socket.IO room server
```

## Requirements

- Node.js 20.19+ (Node 22 LTS recommended)
- npm

## Install and run on macOS

From the project root in Terminal or VS Code:

```sh
npm install
cp .env.example .env
cp server/.env.example server/.env
npm run dev
```

The development command starts both processes:

- Frontend: http://127.0.0.1:5173 (also available as http://localhost:5173)
- Collaboration server and health check: http://localhost:3001 and http://localhost:3001/health

The frontend-only and server-only commands are `npm run client:dev` and `npm run server:dev`. To start the backend independently, run `cd server && npm install && npm run dev`.

### Environment variables

The root `.env` sets `VITE_SERVER_URL`, which the browser uses to connect to Socket.IO. `server/.env` sets `PORT` and `CLIENT_ORIGIN`. Copy the example files before changing these values. For deployment, set the same variables in the hosting provider’s environment settings.

## Collaboration

Open the app and use **Share** to copy its room URL. Open that URL in a second browser tab or another browser. Both clients should show the same room ID and participant count. Draw in either tab to see the other canvas update. Use **New room** to create an isolated room with a new link.

Room IDs are random URL-safe strings. The server validates room IDs and drawing payloads. Room contents live in server memory and are lost when the server restarts. The board also persists in each browser’s local storage. Undo and redo are local to the browser; remote actions are retained when local history is applied so undo does not roll back another participant’s work.

## Import and export

- **PNG** downloads a raster image of the visible whiteboard area with its background.
- **JSON** downloads the structured board objects.
- **Import** accepts a SketchSync JSON export up to 20 MB and validates the background and every shape before replacing the current board. Imported work syncs to the active room.

## Checks

```sh
npm run build
npm run lint
```

The build checks the frontend and server TypeScript and bundles the production frontend. Start both services with `npm run dev` to test two browser clients as described above.

## Deployment

Deploy the static Vite frontend and Node server separately. Build the frontend with `npm run build` and deploy the generated `dist/` directory to a static host. Set `VITE_SERVER_URL` to the public Socket.IO server URL at build time. Deploy `server/` to a Node host, install its dependencies, run `npm start`, and set `PORT` plus `CLIENT_ORIGIN` to the deployed frontend origin. The server host must support persistent WebSocket connections. Use HTTPS for both services in production.

## Current limitations

- Rooms are in-memory and disappear on server restart; there is no database or authentication.
- Undo/redo history is per browser and cannot undo another person’s action.
- Selection supports moving, corner resizing, style edits, and Shift multi-select. Marquee selection and simultaneous conflict resolution are not included yet.
- There is no automated browser test suite in this starter.

Potential next additions include resize handles, sticky notes, snap-to-grid, comments, permissions, and persistent room storage.
