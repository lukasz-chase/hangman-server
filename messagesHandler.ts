import { Message, room } from "./types";

export const adminMessageTypes: {
  INFO: string;
  ERROR: string;
} = {
  INFO: "info",
  ERROR: "error",
};

export default (io: any, socket: any, rooms: any) => {
  const createMessage = (message: Message, roomId: string) => {
    const index = rooms.findIndex((room: room) => room.roomId === roomId);
    const room = rooms[index];

    room.messages.push(message);

    io.to(roomId).emit("room:getById", room);
  };

  socket.on("message", createMessage);
};
