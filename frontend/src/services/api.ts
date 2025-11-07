import axios from 'axios';
import { DataPoint, PlcDataResponse, PollingStatus } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Data Points APIs
export const getDataPoints = async (): Promise<DataPoint[]> => {
  const response = await api.get('/plc/data-points');
  return response.data;
};

export const registerDataPoint = async (dataPoint: DataPoint): Promise<void> => {
  await api.post('/plc/data-points', dataPoint);
};

export const deleteDataPoint = async (key: string): Promise<void> => {
  await api.delete(`/plc/data-points/${key}`);
};

// Polling APIs
export const getPollingStatus = async (): Promise<PollingStatus> => {
  const response = await api.get('/plc/polling/status');
  return response.data;
};

export const startPolling = async (): Promise<void> => {
  await api.post('/plc/polling/start');
};

export const stopPolling = async (): Promise<void> => {
  await api.post('/plc/polling/stop');
};

export const setPollingInterval = async (intervalMs: number): Promise<void> => {
  await api.post('/plc/polling/interval', { intervalMs });
};

// Data APIs
export const readData = async (key: string): Promise<PlcDataResponse> => {
  const response = await api.get(`/plc/data/${key}`);
  return response.data;
};

export const writeData = async (
  key: string,
  value: number[] | string | boolean
): Promise<void> => {
  let body: any;

  if (Array.isArray(value)) {
    body = { values: value };
  } else if (typeof value === 'boolean') {
    body = { value };
  } else {
    body = { value };
  }

  await api.post(`/plc/data/${key}`, body);
};
