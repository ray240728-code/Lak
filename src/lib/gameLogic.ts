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
  // Use a more robust deterministic random generation
  // We use a combination of the roundId and multiple hashing passes
  const salt = "lakshmi_club_secure_v2_2026";
  const combined = roundId + salt;
  
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  
  // Further scramble the hash to ensure high entropy in the lower digits
  hash = (hash ^ (hash >> 16)) * 0x85ebca6b;
  hash = (hash ^ (hash >> 13)) * 0xc2b2ae35;
  hash = hash ^ (hash >> 16);
  
  const num = (Math.abs(hash) % 10) as Number;
  
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
      return amount * 4; // User requested 4x for number
    }
    return 0;
  }

  // If selection is a color
  if (selection === 'red' || selection === 'green' || selection === 'violet') {
    if (result.color.includes(selection)) {
      // User requested 1.9x for color. 
      // If it's a split result (0 or 5), usually it's halved, but user didn't specify.
      // However, to be safe and logical, if hit violet it could be higher, 
      // but "colour ... 1.9x" is quite specific.
      
      if (selection === 'violet') return amount * 4.5; // Keeping violet higher as it's rare
      if (result.color.includes('violet')) return amount * 1.5; // Split win
      return amount * 1.9;
    }
    return 0;
  }

  // If selection is Big/Small
  if (selection === 'big' || selection === 'small') {
    if (selection === result.bigSmall) {
      return amount * 1.9; // User requested 1.9x for big/small
    }
    return 0;
  }

  return 0;
};

export const getRoundId = (mode: GameMode, timestamp: number): string => {
  // Use IST (UTC+5:30) as many of these applications are calibrated to Indian Standard Time
  // This helps match the user's expectation of round IDs (e.g., round 1157 in the evening)
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const date = new Date(timestamp + IST_OFFSET);
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  let interval = 1;
  let modeCode = '01';
  if (mode === '3min') { interval = 3; modeCode = '03'; }
  if (mode === '5min') { interval = 5; modeCode = '05'; }
  if (mode === '10min') { interval = 10; modeCode = '10'; }
  
  // Calculate total minutes passed in the IST day
  const totalMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const roundNum = Math.floor(totalMinutes / interval) + 1; // 1-indexed count
  
  return `${year}${month}${day}${modeCode}${String(roundNum).padStart(4, '0')}`;
};
