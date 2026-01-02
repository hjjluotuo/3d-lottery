export interface Participant {
  id: string;
  name: string;
  department?: string;
}

export enum PrizeLevel {
  Grand = '特等奖',
  First = '一等奖',
  Second = '二等奖',
  Third = '三等奖',
  Consolation = '幸运奖'
}

export interface PrizeConfig {
  id: string;
  level: PrizeLevel;
  name: string;
  count: number; // Number of winners to draw
  image?: string;
  color: string;
}

export interface Winner {
  participant: Participant;
  prizeId: string;
  timestamp: number;
}

export type AppState = 'IDLE' | 'RUNNING' | 'SHOWING_WINNERS';

export interface LotterySettings {
  musicEnabled: boolean;
  volume: number;
  speed: number;
}
