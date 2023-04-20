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
    const currentRoom = room?.rounds[room.currentRound];
    if (!room) return;
    const player: any = currentRoom.players.find(
      (player: any) => player.socketId === socket.id
    );

    currentRoom.players = currentRoom.players.filter(
      (player: any) => player.socketId !== socket.id
    );
    rooms[roomId] = room;

    if (currentRoom.players.length === 0 || player.id === room.creator) {
      rooms.splice(roomId, 1);
      sendRooms(rooms, page, io);
      io.to(room.roomId).emit("roomHasClosed");
    }
    io.to(room.roomId).emit("room:getById", room);
    sendAdminMessage(
      `${player.name} has left`,
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
