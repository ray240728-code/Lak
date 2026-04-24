export type Color = 'red' | 'green' | 'violet';
export type Number = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type BigSmall = 'big' | 'small';

export interface Bet {
  id: string;
  userId: string;
  roundId: string;
  mode: GameMode;
  amount: number;
  selection: Color | Number | BigSmall;
  createdAt: any;
  status: 'pending' | 'win' | 'loss';
  payout?: number;
  result?: {
    number: number;
    color: string[];
    bigSmall: string;
  };
}

export interface GameRound {
  id: string;
  mode: GameMode;
  startTime: number;
  endTime: number;
  resultColor: Color[];
  resultNumber: Number;
  resultBigSmall: BigSmall;
  status: 'active' | 'completed';
}

export type GameMode = '1min' | '3min' | '5min' | '10min';

export interface GiftCard {
  id: string;
  code: string;
  amount: number;
  minDeposit: number;
  status: 'available' | 'claimed' | 'expired';
  maxUses: number;
  usedCount: number;
  claimedBy: string[]; // IDs of users who claimed it
  createdAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'gift' | 'referral';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
  description: string;
  orderNumber?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  amount: number;
  utr: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  orderNumber: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  method: 'upi' | 'bank';
  details: {
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    holderName?: string;
  };
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  orderNumber: string;
}

export interface AppSettings {
  minDeposit: number;
  minWithdrawal: number;
  adminUpi: string;
  whatsapp: string;
  customerSupport: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  type: 'banner' | 'offer';
  createdAt: number;
}

export interface User {
  id: string;
  phone: string;
  password?: string;
  name: string;
  balance: number;
  status: 'active' | 'blocked';
  totalDeposit: number;
  role: 'user' | 'admin';
  referredBy?: string;
  referralCount: number;
  referralDepositCount: number;
  referralDepositAmount: number;
  createdAt: number;
}
