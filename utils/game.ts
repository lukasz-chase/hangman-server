export const pointsCalculator = ({
  currentRoundTime,
  roundTime,
  wordToGuess,
  letter,
  score,
}: {
  currentRoundTime: number;
  roundTime: number;
  wordToGuess: string;
  letter: string;
  score: number;
}) => {
  const correctLettersPoints = 10;
  const maxTimePoints = 1;
  const timePassed = (roundTime - currentRoundTime) / 100;
  const pointsToAdd = wordToGuess.includes(letter)
    ? correctLettersPoints + (maxTimePoints - timePassed)
    : 0;
  return score + pointsToAdd;
};
