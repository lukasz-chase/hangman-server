import type { room } from "../types";

export const adminMessageTypes: {
  INFO: string;
  ERROR: string;
} = {
  INFO: "info",
  ERROR: "error",
};

export const sendAdminMessage = (
  message: string,
  type: string,
  roomId: string,
  rooms: room[],
  io: any
) => {
  const room = rooms.find((room: room) => room.roomId === roomId);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes().toString().padStart(2, "0");
  const adminMessage = {
    playerName: "Admin",
    playerAvatar: "",
    playerId: `admin-${type}`,
    message: message,
    createdAt: `${currentHour}:${currentMinute}`,
  };
  room?.messages.push(adminMessage);
  io.to(roomId).emit("room:getById", room);
};
