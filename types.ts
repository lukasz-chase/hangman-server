export type Player = {
  name: string;
  id: string;
  avatar: string;
  socketId: string;
  guessedLetters: string[];
  score: number;
  connectedToRoom: boolean;
  hasChosenWord: boolean;
};
type WordToGuess = {
  word: string;
  translation: string;
  original: string;
};
export type Message = {
  playerName: string;
  playerAvatar: string;
  playerId: string;
  message: string;
  createdAt: string;
};
export type Round = {
  round: number;
  roundWinners: string[];
  wordToGuessChooser: string;
  players: Player[];
  playersInGame: string[];
  customWord: boolean;
  language: string;
  vacant: boolean;
  wordToGuess: WordToGuess;
};

export type room = {
  playersLimit: number;
  roomId: string;
  private: boolean;
  roundTime: number;
  rounds: Round[];
  roundsNumber: number;
  currentRound: number;
  creator: string;
  inGame: boolean;
  messages: Message[];
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
  roundsNumber: number;
  language: string;
  creator: {
    name: string;
    id: string;
    avatar: string;
  };
};
export type joinRoomPayload = {
  roomId: string;
  player: {
    id: string;
    name: string;
    avatar: string;
  };
};
export type setWordToGuessPayload = {
  roomId: string;
  customWord: boolean;
  language: string;
  wordToGuess: WordToGuess;
  playerIndex: number;
};
