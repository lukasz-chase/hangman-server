import type { room } from "../types";

export const sendRooms = (rooms: room[], page: number, io: any) => {
  const itemsPerPage = 4;
  const startIndex = (page - 1) * itemsPerPage;
  const totalPages = Math.ceil(rooms.length / itemsPerPage);
  const slicedRooms = rooms.slice(startIndex, startIndex + itemsPerPage);
  io.emit("getRooms", { rooms: slicedRooms, currentPage: page, totalPages });
};
