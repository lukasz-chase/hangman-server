import { nanoid } from "nanoid";
import words from "./wordsList";
import { room, roomPayload } from "./types";

//15 minutes in milliseconds
const roomTimeoutDuration = 900000;

type joinRoomPayload = {
  roomId: string;
  id: string;
  name: string;
};

export default (io: any, socket: any, rooms: room[]) => {
  const removeRoom = (roomId: string) => {
    const index = rooms.findIndex((room) => room.roomId === roomId);
    if (index !== -1) {
      rooms.splice(index, 1);
      io.emit("getRooms", rooms);
      io.to(roomId).emit("roomHasClosed");
    }
  };

  const roomTimeout = (roomId: string) =>
    setTimeout(() => removeRoom(roomId), roomTimeoutDuration);

  const chooseRandomWord = (language: string) =>
    words[language][Math.floor(Math.random() * words[language].length)];

  const create = (
    {
      customWord,
      word,
      language,
      author,
      playersLimit,
      privateRoom,
      roundTime,
    }: roomPayload,
    callback: any
  ) => {
    const wordToGuess = customWord ? word : chooseRandomWord(language);
    const commonRoomValues = {
      players: [
        {
          name: author.name,
          id: author.id,
          socketId: socket.id,
          guessedLetters: [],
          score: 0,
        },
      ],
      creator: author.id,
      playersLimit,
      wordToGuess,
      language,
      inGame: false,
      roundTime: roundTime * 60,
      vacant: true,
      customWord,
      messages: [],
    };
    const roomId = `${privateRoom ? "private" : "public"}-${nanoid(10)}`;
    const newRoom = {
      roomId,
      private: privateRoom,
      ...commonRoomValues,
    };
    rooms.push(newRoom);
    io.emit("getRooms", rooms);
    socket.join(roomId);
    io.to(roomId).emit("room:get", newRoom);
    callback(null, roomId);
    roomTimeout(roomId);
  };

  const join = ({ roomId, id, name }: joinRoomPayload, callback: any) => {
    const room = rooms.find((room: room) => room.roomId === roomId);
    if (!room) return callback({ error: true });
    if (!room.vacant) return callback({ error: "room is full" });
    if (room.players.find((player: any) => player.id === id)) {
      io.to(room.roomId).emit("room:getById", room);
      room.vacant = room.playersLimit === room.players.length ? false : true;
      return callback(null);
    }

    room.players.push({
      name,
      id,
      socketId: socket.id,
      guessedLetters: [],
      score: 0,
    });
    room.vacant = room.playersLimit === room.players.length ? false : true;

    socket.join(roomId);
    io.to(roomId).emit("room:get", room);
    io.to(roomId).emit("room:getById", room);
    io.to(roomId).emit("room:playerJoined", name);
    callback(null, room);
  };

  const update = (payload: room) => {
    const index = rooms.findIndex(
      (room: room) => room.roomId === payload.roomId
    );
    if (index >= 0) {
      rooms[index] = payload;
      io.to(payload.roomId).emit("room:get", payload);
      io.to(payload.roomId).emit("room:getById", payload);
      socket.emit("getRooms", rooms);
    }
  };

  const getById = (id: string) => {
    const room = rooms.find((room: any) => room.roomId === id);
    io.to(id).emit("room:getById", room);
  };

  const playerLeft = ({ roomId, name }: { roomId: string; name: string }) => {
    io.to(roomId).emit("room:playerDisconnected", name);
  };

  socket.on("getRooms", () => {
    socket.emit("getRooms", rooms);
  });
  socket.on("startTheGame", (roomId: string) =>
    io.to(roomId).emit("startTheGame")
  );
  socket.on("room:leave", removeRoom);
  socket.on("room:getById", getById);
  socket.on("room:create", create);
  socket.on("room:join", join);
  socket.on("room:update", update);
  socket.on("room:playerLeft", playerLeft);
};
