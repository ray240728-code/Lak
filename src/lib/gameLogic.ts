import { Color, Number, GameRound, Bet, GameMode, BigSmall } from '../types';

export const COLORS: Record<string, string> = {
  red: '#E53E3E',
  green: '#38A169',
  violet: '#805AD5',
  saffron: '#FF9933',
  white: '#FFFFFF',
  chakra: '#000080',
};

export const getColorForResult = (num: number): Color[] => {
  if (num === 0) return ['red', 'violet'];
  if (num === 5) return ['green', 'violet'];
  if (num % 2 === 0) return ['red'];
  return ['green'];
};

export const getBigSmallForResult = (num: number): BigSmall => {
  return num >= 5 ? 'big' : 'small';
};

export const generateRoundResult = (roundId: string): { color: Color[]; number: Number; bigSmall: BigSmall } => {
  // In a real app, this would come from the server
  // For this demo, we'll use the roundId as a seed for pseudo-randomness
  const seed = parseInt(roundId.slice(-4), 16) || Math.floor(Math.random() * 1000);
  const num = (seed % 10) as Number;
  return {
    color: getColorForResult(num),
    number: num,
    bigSmall: getBigSmallForResult(num),
  };
};

export const calculatePayout = (bet: Bet, result: { color: Color[]; number: Number; bigSmall: BigSmall }): number => {
  const { selection, amount } = bet;
  
  // If selection is a number
  if (typeof selection === 'number') {
    if (selection === result.number) {
      return amount * 2; // User requested 2x for a win (100 -> 200)
    }
    return 0;
  }

  // If selection is a color
  if (selection === 'red' || selection === 'green' || selection === 'violet') {
    if (result.color.includes(selection)) {
      return amount * 2; // User requested 2x for a win (100 -> 200)
    }
    return 0;
  }

  // If selection is Big/Small
  if (selection === 'big' || selection === 'small') {
    if (selection === result.bigSmall) {
      return amount * 2; // User requested 2x for a win (100 -> 200)
    }
    return 0;
  }

  return 0;
};

export const getRoundId = (mode: GameMode, timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  let interval = 1;
  let modeCode = '01';
  if (mode === '3min') { interval = 3; modeCode = '03'; }
  if (mode === '5min') { interval = 5; modeCode = '05'; }
  if (mode === '10min') { interval = 10; modeCode = '10'; }
  
  const totalMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const roundNum = Math.floor(totalMinutes / interval);
  return `${year}${month}${day}${modeCode}${String(roundNum).padStart(4, '0')}`;
};
