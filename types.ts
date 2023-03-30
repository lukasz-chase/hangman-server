export type Player = {
  name: string;
  id: string;
  socketId: string;
  guessedLetters: string[];
  score: number;
};
export type Message = {
  playerName: string;
  playerAvatar: string;
  playerId: string;
  message: string;
  createdAt: string;
};

export type room = {
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
  messages: Message[];
  customWord: boolean;
};
export type roomPayload = {
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
