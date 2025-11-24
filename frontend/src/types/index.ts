// ========== Tag 기반 PLC 구조 ==========

export interface DataSet {
  id: number;
  name: string;
  addressType: 'D' | 'R' | 'M' | 'X' | 'Y';
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
  dataType: 'int16' | 'int32' | 'real' | 'string' | 'bool';
  wordLength: number;
  bitPosition?: number;
}

export interface TagValue {
  value: number | string | boolean;
  timestamp: Date;
  error?: string;
}

export interface TagPollingStatus {
  isPolling: boolean;
  dataSetCount: number;
  tagCount: number;
}

// Process / Function / Hardware profiles
export interface ProcessFunctionArg {
  id: number;
  position: number;
  name: string;
  type: string;
  required: boolean;
  offset?: number;
  wordLength?: number;
  bitPosition?: number;
}

export interface ProcessFunction {
  id: number;
  code: number;
  name: string;
  description?: string;
  category?: string;
  enabled: boolean;
  args: ProcessFunctionArg[];
}

export interface ProcessStep {
  id: number;
  sequence: number;
  functionId: number;
  args: Record<string, any>;
}

export interface ProcessProgram {
  id: number;
  name: string;
  baseAddress: number;
  stepWords: number;
  version: number;
  description?: string;
  isActive: boolean;
  steps: ProcessStep[];
}

export interface HardwareProfile {
  id: number;
  applied: boolean;
  glName: string;
  controller?: string;
  host?: string;
  port?: number;
  series?: string;
  axes?: number;
  createdAt: Date;
  updatedAt: Date;
}
