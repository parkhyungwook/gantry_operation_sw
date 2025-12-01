export interface DataPoint {
  key: string;
  description: string;
  addressType: 'D' | 'R' | 'M' | 'X' | 'Y';
  address: number;
  length: number;
  bit?: number;
  type: 'number' | 'string' | 'bool';
}

export interface PlcDataResponse {
  value: number[] | string | boolean;
  timestamp: Date;
  error?: string;
}

export interface PollingStatus {
  isPolling: boolean;
  intervalMs: number;
  registeredDataPoints: string[];
}

export interface DataSet {
  id: number;
  name: string;
  addressType: "D" | "R" | "M" | "X" | "Y";
  startAddress: number;
  length: number;
  pollingInterval: number;
  enabled: boolean;
}

export interface Tag {
  key: string;
  description: string;
  dataSetId: number;
  offset: number;
  dataType: "int16" | "int32" | "real" | "string" | "bool";
  wordLength: number;
  bitPosition?: number;
}

export interface TagValue {
  value: number | string | boolean;
  timestamp: string;
  error?: string;
}

export interface TagPollingStatus {
  isPolling: boolean;
  dataSetCount: number;
  tagCount: number;
}
