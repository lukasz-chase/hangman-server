import { nanoid } from "nanoid";
import words from "./wordsList";

type Player = {
  name: string;
  id: string;
  socketId: string;
  guessedLetters: string[];
  score: number;
};

type room = {
  roomId: string;
  playersLimit: number;
  wordToGuess: {
    word: string;
    translation: string;
    original: string;
  };
  vacant: boolean;
  private: boolean;
  roundTime: number;
  creator: string;
  inGame: boolean;
  language: string;
  players: Player[];
  customWord: boolean;
};
type roomPayload = {
  privateRoom: boolean;
  playersLimit: number;
  customWord: boolean;
  word: {
    word: string;
    translation: string;
    original: string;
  };
  roundTime: number;
  language: string;
  author: {
    name: string;
    id: string;
  };
};

export default (io: any, socket: any, rooms: any) => {
  const removeRoom = (roomId: string) => {
    const index = rooms.findIndex((room: any) => room.roomId === roomId);
    if (index !== -1) {
      rooms.splice(index, 1);
      io.emit("getRooms", rooms);
      io.to(roomId).emit("roomHasClosed");
    }
  };
  //15 minutes in milliseconds
  //60 * 15 * 1000 = 900 000
  const roomTimeout = (roomId: string) =>
    setTimeout(() => removeRoom(roomId), 900000);
  const create = (payload: roomPayload, callback: any) => {
    const wordToGuess =
      words[payload.language][
        Math.floor(Math.random() * words[payload.language].length)
      ];
    const commonRoomValues = {
      players: [
        {
          name: payload.author.name,
          id: payload.author.id,
          socketId: socket.id,
          guessedLetters: [],
          score: 0,
        },
      ],
      creator: payload.author.id,
      playersLimit: payload.playersLimit,
      wordToGuess: payload.customWord ? payload.word : wordToGuess,
      language: payload.language,
      inGame: false,
      roundTime: payload.roundTime * 60,
      vacant: true,
      customWord: payload.customWord,
    };
    if (payload.privateRoom) {
      const room: room = {
        roomId: `private-${nanoid(10)}`,
        private: true,
        ...commonRoomValues,
      };
      rooms.push(room);
      io.emit("getRooms", rooms);
      socket.join(room.roomId);
      io.to(room.roomId).emit("room:get", room);
      callback(null, room.roomId);
      roomTimeout(room.roomId);
    } else {
      const room: room = {
        roomId: `public-${nanoid(10)}`,
        private: false,
        ...commonRoomValues,
      };
      rooms.push(room);
      io.emit("getRooms", rooms);
      socket.join(room.roomId);
      io.to(room.roomId).emit("room:get", room);
      callback(null, room.roomId);
      roomTimeout(room.roomId);
    }
  };

  const join = (payload: any, callback: any) => {
    const index = rooms.findIndex(
      (room: room) => room.roomId === payload.roomId
    );
    const room = rooms[index];
    if (index >= 0) {
      if (!room.vacant) return callback({ error: "room is full" });
      if (room.players.find((player: any) => player.id === payload.id)) {
        io.to(room.roomId).emit("room:getById", room);
        room.vacant = room.playersLimit === room.players.length ? false : true;
        return callback(null);
      }

      room.players.push({
        name: payload.name,
        id: payload.id,
        socketId: socket.id,
        guessedLetters: [],
        score: 0,
      });
      room.vacant = room.playersLimit === room.players.length ? false : true;

      socket.join(room.roomId);
      rooms[index] = room;
      io.to(room.roomId).emit("room:get", room);
      io.to(room.roomId).emit("room:getById", room);
      io.to(room.roomId).emit("room:playerJoined", payload.name);
      callback(null, room);
    } else {
      callback({ error: true });
    }
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
