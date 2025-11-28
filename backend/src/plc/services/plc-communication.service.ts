import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';
import { COMMUNICATION_SERVICE, CommunicationService, DeviceCode } from '../../communication/communication.types';

const HEADER_LEN_3E = 9;

export interface PlcConfig {
  host: string;
  port: number;
}

/**
 * PLC 통신 전용 서비스
 * Mitsubishi MC Protocol 3E Binary 통신만 담당
 * 영구 연결 방식으로 PLC와 단일 세션 유지
 */
@Injectable()
export class PlcCommunicationService implements CommunicationService {
  private readonly logger = new Logger(PlcCommunicationService.name);
  private socket: net.Socket | null = null;
  private isConnecting = false;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;
  private pendingRequests: Array<{
    frame: Buffer;
    resolve: (data: Buffer) => void;
    reject: (error: Error) => void;
  }> = [];
  private currentRequest: {
    resolve: (data: Buffer) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout | null;
  } | null = null;
  private responseBuffer = Buffer.alloc(0);
  private expectedLength = -1;

  constructor(private readonly config: PlcConfig) {}

  /**
   * PLC 연결 설정
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.isConnecting) {
      // 연결 시도 중이면 대기
      await new Promise<void>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (this.isConnected) {
            clearInterval(checkInterval);
            resolve();
          } else if (!this.isConnecting) {
            clearInterval(checkInterval);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      this.socket.setNoDelay(true);
      this.socket.setTimeout(5000);

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.logger.log(`Connected to PLC at ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.socket.on('data', (chunk) => {
        this.handleData(chunk);
      });

      this.socket.on('error', (error) => {
        this.logger.error('Socket error:', error.message);
        if (this.isConnecting) {
          this.isConnecting = false;
          reject(error);
        }
        this.handleDisconnect();
      });

      this.socket.on('close', () => {
        this.logger.warn('Socket closed');
        this.handleDisconnect();
      });

      this.socket.on('timeout', () => {
        this.logger.warn('Socket timeout');
        this.socket?.destroy();
        this.handleDisconnect();
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  /**
   * PLC 연결 해제
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.pendingRequests = [];
    this.currentRequest = null;
    this.responseBuffer = Buffer.alloc(0);
    this.expectedLength = -1;
    this.logger.log('Disconnected from PLC');
  }

  /**
   * 연결 상태 확인
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * 데이터 수신 처리
   */
  private handleData(chunk: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, chunk]);

    // 헤더 파싱
    if (this.expectedLength < 0 && this.responseBuffer.length >= HEADER_LEN_3E) {
      this.expectedLength = HEADER_LEN_3E + this.responseBuffer.readUInt16LE(7);
    }

    // 전체 응답 수신 완료
    if (this.expectedLength > 0 && this.responseBuffer.length >= this.expectedLength) {
      const response = this.responseBuffer.subarray(0, this.expectedLength);
      this.responseBuffer = this.responseBuffer.subarray(this.expectedLength);
      this.expectedLength = -1;

      if (this.currentRequest) {
        if (this.currentRequest.timer) {
          clearTimeout(this.currentRequest.timer);
        }
        this.currentRequest.resolve(response);
        this.currentRequest = null;
      }

      // 다음 요청 처리
      this.processNextRequest();
    }
  }

  /**
   * 연결 끊김 처리
   */
  private handleDisconnect(): void {
    this.isConnected = false;

    // 현재 요청 실패 처리
    if (this.currentRequest) {
      if (this.currentRequest.timer) {
        clearTimeout(this.currentRequest.timer);
      }
      this.currentRequest.reject(new Error('Connection lost'));
      this.currentRequest = null;
    }

    // 대기 중인 요청들 실패 처리
    while (this.pendingRequests.length > 0) {
      const req = this.pendingRequests.shift();
      if (req) {
        req.reject(new Error('Connection lost'));
      }
    }
  }

  /**
   * 다음 요청 처리
   */
  private processNextRequest(): void {
    if (this.currentRequest || this.pendingRequests.length === 0) {
      return;
    }

    const request = this.pendingRequests.shift();
    if (!request || !this.socket || !this.isConnected) {
      return;
    }

    this.currentRequest = {
      resolve: request.resolve,
      reject: request.reject,
      timer: setTimeout(() => {
        if (this.currentRequest) {
          this.currentRequest.reject(new Error('Request timeout'));
          this.currentRequest = null;
          this.processNextRequest();
        }
      }, 5000),
    };

    this.socket.write(request.frame);
  }

  /**
   * 프레임 송수신 (영구 연결 사용)
   */
  private async sendRecv(frame: Buffer): Promise<Buffer> {
    // 연결 확인 및 자동 재연결
    if (!this.isConnected) {
      try {
        await this.connect();
      } catch (error) {
        throw new Error(`Failed to connect to PLC: ${error.message}`);
      }
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ frame, resolve, reject });
      this.processNextRequest();
    });
  }

  async readWords(
    dev: DeviceCode,
    start: number,
    count: number,
  ): Promise<number[]> {
    const buf = Buffer.alloc(21);
    buf.writeUInt16LE(0x0050, 0);
    buf.writeUInt8(0x00, 2);
    buf.writeUInt8(0xff, 3);
    buf.writeUInt16LE(0x03ff, 4);
    buf.writeUInt8(0x00, 6);
    buf.writeUInt16LE(12, 7);
    buf.writeUInt16LE(0x0010, 9);
    buf.writeUInt16LE(0x0401, 11);
    buf.writeUInt16LE(0x0000, 13);
    buf.writeUIntLE(start, 15, 3);
    buf.writeUInt8(dev, 18);
    buf.writeUInt16LE(count, 19);

    try {
      const resp = await this.sendRecv(buf);
      const endCode = resp.readUInt16LE(HEADER_LEN_3E);
      if (endCode) {
        throw new Error(`PLC ERR 0x${endCode.toString(16)}`);
      }

      const payload = resp.subarray(HEADER_LEN_3E + 2);
      const out: number[] = [];
      for (let i = 0; i + 1 < payload.length; i += 2) {
        out.push(payload.readUInt16LE(i));
      }
      return out;
    } catch (error) {
      this.logger.error(
        `Failed to read words from ${dev}:${start}`,
        error.stack,
      );
      throw error;
    }
  }

  async writeWords(
    dev: DeviceCode,
    start: number,
    words: number[],
  ): Promise<void> {
    const payload = Buffer.alloc(words.length * 2);
    words.forEach((w, i) => payload.writeUInt16LE(w & 0xffff, i * 2));

    const buf = Buffer.alloc(HEADER_LEN_3E + 12 + payload.length);
    buf.writeUInt16LE(0x0050, 0);
    buf.writeUInt8(0x00, 2);
    buf.writeUInt8(0xff, 3);
    buf.writeUInt16LE(0x03ff, 4);
    buf.writeUInt8(0x00, 6);
    buf.writeUInt16LE(12 + payload.length, 7);
    buf.writeUInt16LE(0x0010, 9);
    buf.writeUInt16LE(0x1401, 11);
    buf.writeUInt16LE(0x0000, 13);
    buf.writeUIntLE(start, 15, 3);
    buf.writeUInt8(dev, 18);
    buf.writeUInt16LE(words.length, 19);
    payload.copy(buf, 21);

    try {
      const resp = await this.sendRecv(buf);
      const endCode = resp.readUInt16LE(HEADER_LEN_3E);
      if (endCode) {
        throw new Error(`PLC ERR 0x${endCode.toString(16)}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to write words to ${dev}:${start}`,
        error.stack,
      );
      throw error;
    }
  }

  async readNumbers(
    dev: DeviceCode,
    start: number,
    count: number,
  ): Promise<number[]> {
    return this.readWords(dev, start, count);
  }

  async writeNumbers(
    dev: DeviceCode,
    start: number,
    nums: number[],
  ): Promise<void> {
    await this.writeWords(
      dev,
      start,
      nums.map((n) => n & 0xffff),
    );
  }

  /**
   * 특정 워드의 특정 비트를 읽습니다 (0-15)
   */
  async readBit(
    dev: DeviceCode,
    address: number,
    bit: number,
  ): Promise<boolean> {
    if (bit < 0 || bit > 15) {
      throw new Error('Bit position must be between 0 and 15');
    }

    const words = await this.readWords(dev, address, 1);
    const word = words[0];
    return Boolean((word >> bit) & 1);
  }

  /**
   * 특정 워드의 특정 비트를 씁니다 (0-15)
   */
  async writeBit(
    dev: DeviceCode,
    address: number,
    bit: number,
    value: boolean,
  ): Promise<void> {
    if (bit < 0 || bit > 15) {
      throw new Error('Bit position must be between 0 and 15');
    }

    // 먼저 현재 값을 읽어옵니다
    const words = await this.readWords(dev, address, 1);
    let word = words[0];

    // 비트를 설정하거나 클리어합니다
    if (value) {
      word |= (1 << bit);
    } else {
      word &= ~(1 << bit);
    }

    // 수정된 값을 씁니다
    await this.writeWords(dev, address, [word]);
  }

  async readString(
    dev: DeviceCode,
    start: number,
    enc: 'ascii' | 'utf16le' = 'ascii',
    maxChars = 32,
  ): Promise<string> {
    if (dev !== DeviceCode.D && dev !== DeviceCode.R) {
      throw new Error('문자열은 D 또는 R 레지스터에서만 읽으세요.');
    }
    const wordsToRead =
      enc === 'ascii' ? Math.ceil((maxChars + 1) / 2) : maxChars + 1;
    const w = await this.readWords(dev, start, wordsToRead);
    return enc === 'ascii' ? this.unpackAscii(w) : this.unpackU16(w);
  }

  async writeString(
    dev: DeviceCode,
    start: number,
    text: string,
    enc: 'ascii' | 'utf16le' = 'ascii',
  ): Promise<void> {
    if (dev !== DeviceCode.D && dev !== DeviceCode.R) {
      throw new Error('문자열은 D 또는 R 레지스터에만 쓰세요.');
    }
    const words = enc === 'ascii' ? this.packAscii(text) : this.packU16(text);
    await this.writeWords(dev, start, words);
  }

  private packAscii(s: string): number[] {
    const src = Buffer.from(s, 'ascii');
    let len = src.length + 1;
    if (len % 2) len += 1;
    const padded = Buffer.alloc(len);
    src.copy(padded, 0);
    const out: number[] = [];
    for (let i = 0; i < padded.length; i += 2) {
      const lo = padded[i];
      const hi = padded[i + 1];
      out.push((hi << 8) | lo);
    }
    return out;
  }

  private unpackAscii(words: number[]): string {
    const bytes: number[] = [];
    for (const w of words) {
      const lo = w & 0xff;
      const hi = (w >> 8) & 0xff;
      if (lo === 0) break;
      bytes.push(lo);
      if (hi === 0) break;
      bytes.push(hi);
    }
    return Buffer.from(bytes).toString('ascii');
  }

  private packU16(s: string): number[] {
    const buf = Buffer.from(s + '\u0000', 'utf16le');
    const out: number[] = [];
    for (let i = 0; i < buf.length; i += 2) {
      out.push(buf.readUInt16LE(i));
    }
    return out;
  }

  private unpackU16(words: number[]): string {
    const buf = Buffer.alloc(words.length * 2);
    words.forEach((w, i) => buf.writeUInt16LE(w & 0xffff, i * 2));
    let end = 0;
    for (let i = 0; i < buf.length; i += 2) {
      if (buf.readUInt16LE(i) === 0x0000) {
        end = i;
        break;
      }
      end = i + 2;
    }
    return buf.subarray(0, end).toString('utf16le');
  }
}
