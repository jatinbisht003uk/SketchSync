import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket";
import type { ClientToServerEvents, ServerToClientEvents } from "./types";

const port = Number(process.env.PORT ?? 3001);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const app = express();
app.use(cors({ origin: clientOrigin }));
app.get("/health", (_request, response) => response.json({ status: "ok" }));
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: clientOrigin, methods: ["GET", "POST"] } });
registerSocketHandlers(io);
httpServer.listen(port, () => console.info(`SketchSync server listening on http://localhost:${port}`));
import "dotenv/config";
