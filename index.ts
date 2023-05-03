import dotenv from "dotenv";
import express, { Application } from "express";
import { createServer, Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import roomHandler from "./roomHandler";
import type { room } from "./types";
import { sendRooms } from "./utils/room";
import { adminMessageTypes, sendAdminMessage } from "./utils/message";

dotenv.config();
const app: Application = express();

const httpServer: HTTPServer = createServer(app);
const io: Server = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms: room[] = [];

let page = 1;

io.on("connection", (socket: Socket) => {
  roomHandler(io, socket, rooms, page);
  socket.on("disconnect", () => {
    const roomId: number = rooms.findIndex((room: room) =>
      room.rounds[room.currentRound].players.find(
        (player: any) => player.socketId === socket.id
      )
    );
    const room: room = rooms[roomId];
    const currentRound = room?.rounds[room.currentRound];
    if (!room) return;
    const player: any = currentRound.players.find(
      (player: any) => player.socketId === socket.id
    );

    currentRound.players = currentRound.players.filter(
      (player: any) => player.socketId !== socket.id
    );
    rooms[roomId] = room;

    if (currentRound.players.length === 0 || player.id === room.creator) {
      rooms.splice(roomId, 1);
      sendRooms(rooms, page, io);
      io.to(room.roomId).emit("roomHasClosed");
    }
    sendAdminMessage(
      `${player.name} wyszedł`,
      adminMessageTypes.ERROR,
      room.roomId,
      rooms,
      io
    );
    io.to(room.roomId).emit("room:playerDisconnected", player.name);
  });
});

const port: string | number = process.env.PORT || 8080;
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
