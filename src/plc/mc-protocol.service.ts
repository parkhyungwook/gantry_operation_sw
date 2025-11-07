import { Injectable, Logger } from '@nestjs/common';
import * as net from 'net';

const HEADER_LEN_3E = 9;

export enum DeviceCode {
  D = 0xa8,
  R = 0xaf,
  M = 0x90,
  X = 0x9c,
  Y = 0x9d,
}

export interface PlcConfig {
  host: string;
  port: number;
}

@Injectable()
export class McProtocolService {
  private readonly logger = new Logger(McProtocolService.name);

  constructor(private readonly config: PlcConfig) {}

  private sendRecv(
    frame: Buffer,
    idleMs = 30,
    timeoutMs = 5000,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const s = new net.Socket();
      s.setNoDelay(true);
      s.setTimeout(timeoutMs);

      let acc = Buffer.alloc(0);
      let need = -1;
      let idle: NodeJS.Timeout | null = null;

      const done = (err?: Error, data?: Buffer) => {
        try {
          s.destroy();
        } catch {}
        if (idle) clearTimeout(idle);
        err ? reject(err) : resolve(data!);
      };

      const arm = () => {
        if (idle) clearTimeout(idle);
        idle = setTimeout(() => done(undefined, acc), idleMs);
      };

      s.once('error', (e) => done(e));
      s.on('timeout', () => done(new Error('socket timeout')));
      s.on('data', (chunk) => {
        acc = Buffer.concat([acc, chunk]);
        if (need < 0 && acc.length >= HEADER_LEN_3E) {
          need = HEADER_LEN_3E + acc.readUInt16LE(7);
        }
        if (need > 0 && acc.length >= need) {
          return done(undefined, acc.subarray(0, need));
        }
        arm();
      });
      s.on('close', () => {
        if (acc.length) done(undefined, acc);
        else done(new Error('socket closed without data'));
      });

      s.connect(this.config.port, this.config.host, () => {
        s.write(frame);
        arm();
      });
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
