export enum DeviceCode {
  D = 0xa8,
  R = 0xaf,
  M = 0x90,
  X = 0x9c,
  Y = 0x9d,
}

export interface CommunicationService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnectionActive(): boolean;
  readWords(dev: DeviceCode, start: number, count: number): Promise<number[]>;
  writeWords(dev: DeviceCode, start: number, words: number[]): Promise<void>;
  readNumbers(dev: DeviceCode, start: number, count: number): Promise<number[]>;
  writeNumbers(dev: DeviceCode, start: number, nums: number[]): Promise<void>;
  readBit(dev: DeviceCode, address: number, bit: number): Promise<boolean>;
  writeBit(dev: DeviceCode, address: number, bit: number, value: boolean): Promise<void>;
  readString(dev: DeviceCode, start: number, enc?: "ascii" | "utf16le", maxChars?: number): Promise<string>;
  writeString(dev: DeviceCode, start: number, text: string, enc?: "ascii" | "utf16le"): Promise<void>;
}

export const COMMUNICATION_SERVICE = "COMMUNICATION_SERVICE";
