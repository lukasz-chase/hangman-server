import dotenv from "dotenv";
import express, { Application } from "express";
import { createServer, Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import messagesHandler from "./messagesHandler";
import roomHandler from "./roomHandler";
import { room } from "./types";

dotenv.config();
const app: Application = express();

const httpServer: HTTPServer = createServer(app);
const io: Server = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms: room[] = [];

io.on("connection", (socket: Socket) => {
  roomHandler(io, socket, rooms);
  messagesHandler(io, socket, rooms);
  socket.on("disconnect", () => {
    const roomId: number = rooms.findIndex((room: room) =>
      room.players.find((player: any) => player.socketId === socket.id)
    );
    const room: room = rooms[roomId];
    if (!room) return;
    const player: any = room.players.find(
      (player: any) => player.socketId === socket.id
    );

    room.players = room.players.filter(
      (player: any) => player.socketId !== socket.id
    );
    rooms[roomId] = room;

    if (room.players.length === 0 || player.id === room.creator) {
      rooms.splice(roomId, 1);
      io.emit("getRooms", rooms);
      io.to(room.roomId).emit("roomHasClosed");
    }
    io.to(room.roomId).emit("room:getById", room);
    io.to(room.roomId).emit("room:playerDisconnected", player.name);
  });
});

const port: string | number = process.env.PORT || 8080;
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
