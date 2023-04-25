import { nanoid } from "nanoid";
import words from "./wordsList";
import type {
  guessLetterPayload,
  joinRoomPayload,
  room,
  roomPayload,
  setWordToGuessPayload,
} from "./types";
import { sendAdminMessage } from "./utils/message";
import { adminMessageTypes } from "./utils/message";
import { sendRooms } from "./utils/room";

//30 minutes in milliseconds
const roomTimeoutDuration = 18000000;

const chooseRandomWord = (language: string) =>
  words[language][Math.floor(Math.random() * words[language].length)];

export default (io: any, socket: any, rooms: room[], page: number) => {
  const removeRoom = (roomId: string) => {
    const index = rooms.findIndex((room) => room.roomId === roomId);
    if (index !== -1) {
      rooms.splice(index, 1);
      sendRooms(rooms, page, io);
      io.to(roomId).emit("roomHasClosed");
    }
  };

  const roomTimeout = (roomId: string) =>
    setTimeout(() => removeRoom(roomId), roomTimeoutDuration);

  const roomHalfwayTimeout = (roomId: string) =>
    setTimeout(
      () =>
        sendAdminMessage(
          "room will close in 5 minutes",
          adminMessageTypes.ERROR,
          roomId,
          rooms,
          io
        ),
      roomTimeoutDuration - 600000
    );

  const create = (
    {
      customWord,
      word,
      language,
      creator,
      playersLimit,
      privateRoom,
      roundTime,
      roundsNumber,
      difficulty,
    }: roomPayload,
    callback: any
  ) => {
    const wordToGuess = customWord ? word : chooseRandomWord(language);
    const commonRoomValues = {
      rounds: [
        {
          round: 1,
          roundWinners: [],
          wordToGuessChooser: creator.id,
          players: [
            {
              name: creator.name,
              id: creator.id,
              avatar: creator.avatar,
              socketId: socket.id,
              guessedLetters: [],
              score: 0,
              connectedToRoom: false,
              hasChosenWord: true,
            },
          ],
          playersInGame: [],
          wordToGuess,
          customWord,
          language,
          vacant: true,
          difficulty,
          roundTime: roundTime * 60,
        },
      ],
      createdAt: new Date(),
      roundsNumber: Number(roundsNumber),
      currentRound: 0,
      creator: creator.id,
      playersLimit: Number(playersLimit),
      inGame: false,
      roundTime: roundTime * 60,
      messages: [],
    };
    const roomId = `${privateRoom ? "private" : "public"}-${nanoid(10)}`;
    const newRoom = {
      roomId,
      private: privateRoom,
      ...commonRoomValues,
    };
    io.to(roomId).emit("room:getById", newRoom);
    rooms.push(newRoom);
    sendRooms(rooms, page, io);
    socket.join(roomId);
    callback(null, roomId);
    roomTimeout(roomId);
    roomHalfwayTimeout(roomId);
  };

  const join = ({ roomId, player }: joinRoomPayload, callback: any) => {
    const { name, id, avatar } = player;
    const room = rooms.find((room: room) => room.roomId === roomId);
    if (!room) return callback({ error: true });
    const currentRoom = room.rounds[room.currentRound];
    if (!currentRoom.vacant) return callback({ error: "room is full" });
    if (currentRoom.players.find((player) => player.id === id)) {
      io.to(room.roomId).emit("room:getById", room);
      currentRoom.vacant =
        room.playersLimit === currentRoom.players.length ? false : true;
      return callback(null);
    }
    currentRoom.players.push({
      name,
      id,
      avatar,
      socketId: socket.id,
      guessedLetters: [],
      score: 0,
      connectedToRoom: false,
      hasChosenWord: false,
    });
    sendAdminMessage(
      `${name} has joined`,
      adminMessageTypes.INFO,
      roomId,
      rooms,
      io
    );
    currentRoom.vacant =
      room.playersLimit === currentRoom.players.length ? false : true;

    socket.join(roomId);
    io.to(roomId).emit("room:getById", room);
    io.to(roomId).emit("room:playerJoined", name);
    callback(null, room);
  };

  const playerJoinsGame = ({ roomId, id }: { roomId: string; id: string }) => {
    const room = rooms.find((room: room) => room.roomId === roomId);
    if (!room) return new Error("there is no room with that id");
    room.rounds[room.currentRound].playersInGame.push(id);
    io.to(roomId).emit("room:getById", room);
  };

  const update = (payload: room) => {
    const index = rooms.findIndex(
      (room: room) => room.roomId === payload.roomId
    );
    if (index >= 0) {
      rooms[index] = payload;
      io.to(payload.roomId).emit("room:getById", payload);
      sendRooms(rooms, page, io);
    }
  };
  const setNewWordToGuess = ({
    roomId,
    customWord,
    wordToGuess,
    language,
    playerIndex,
    difficulty,
  }: setWordToGuessPayload) => {
    const index = rooms.findIndex((r) => r.roomId === roomId);
    const room = rooms[index];
    if (index >= 0) {
      const word = customWord ? wordToGuess : chooseRandomWord(language);
      room.rounds[room.currentRound] = {
        ...room.rounds[room.currentRound],
        wordToGuess: word,
        language,
        customWord,
        difficulty,
      };
      room.rounds[room.currentRound].players[playerIndex].hasChosenWord = true;
      io.to(room.roomId).emit("room:getById", room);
    }
  };

  const getById = (id: string) => {
    const room = rooms.find((room: any) => room.roomId === id);
    io.to(id).emit("room:getById", room);
    socket.emit("room:getById", room);
  };

  const playerLeft = ({ roomId, name }: { roomId: string; name: string }) => {
    sendAdminMessage(
      `${name} has left`,
      adminMessageTypes.ERROR,
      roomId,
      rooms,
      io
    );
    io.to(roomId).emit("room:playerDisconnected", name);
  };
  const newRoundHandler = ({
    roomId,
    roundNumber,
  }: {
    roomId: string;
    roundNumber: number;
  }) => {
    sendAdminMessage(
      `round ${roundNumber + 1} starts`,
      adminMessageTypes.INFO,
      roomId,
      rooms,
      io
    );
    io.to(roomId).emit("room:newRound");
  };
  const guessLetterHandler = ({
    letter,
    roomId,
    playerId,
    roundTime,
  }: guessLetterPayload) => {
    const room = rooms.find((room) => room.roomId === roomId);
    if (!room) return;
    const currentRound = room.rounds[room?.currentRound];
    const player = currentRound.players.find((p) => p.id === playerId);
    if (!player) return;
    const guessedLetters = [...player.guessedLetters, letter];
    const score =
      player.score + (currentRound.wordToGuess.word.includes(letter) ? 10 : 0);
    const updatedPlayer = {
      ...player,
      score,
      guessedLetters,
    };
    room.rounds[room?.currentRound] = {
      ...currentRound,
      roundTime,
      players: currentRound.players.map((p) =>
        p.id === player.id ? updatedPlayer! : p
      ),
    };
    io.to(room.roomId).emit("room:getById", room);
  };
  socket.on("getRooms", (newPage: number) => {
    page = newPage;
    sendRooms(rooms, page, io);
  });
  socket.on("startTheGame", (roomId: string) =>
    io.to(roomId).emit("startTheGame")
  );
  socket.on("room:guessLetter", guessLetterHandler);
  socket.on("room:playerJoinsGame", playerJoinsGame);
  socket.on("room:leave", removeRoom);
  socket.on("room:newRound", newRoundHandler);
  socket.on("room:setNewWordToGuess", setNewWordToGuess);
  socket.on("room:getById", getById);
  socket.on("room:create", create);
  socket.on("room:join", join);
  socket.on("room:update", update);
  socket.on("room:playerLeft", playerLeft);
};
