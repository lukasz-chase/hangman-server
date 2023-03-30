import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import messagesHandler from "./messagesHandler";
import roomHandler from "./roomHandler";

dotenv.config();
const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms: any = [];

io.on("connection", (socket) => {
  roomHandler(io, socket, rooms);
  messagesHandler(io, socket, rooms);
  socket.on("disconnect", () => {
    const roomId = rooms.findIndex((room: any) =>
      room.players.find((player: any) => player.socketId === socket.id)
    );
    const room = rooms[roomId];
    if (!room) return;
    const player = room.players.find(
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

const port = process.env.PORT || 8080;
httpServer.listen(port, () => console.log(`Listening on port ${port}`));
