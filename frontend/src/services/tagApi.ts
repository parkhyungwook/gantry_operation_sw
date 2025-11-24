import axios from 'axios';
import { DataSet, Tag, TagValue, TagPollingStatus } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== DataSet APIs ====================

export const getDataSets = async (): Promise<DataSet[]> => {
  const response = await api.get('/plc/data-sets');
  return response.data;
};

export const getDataSet = async (id: number): Promise<DataSet> => {
  const response = await api.get(`/plc/data-sets/${id}`);
  return response.data;
};

export const createDataSet = async (dataSet: Omit<DataSet, 'id'>): Promise<DataSet> => {
  const response = await api.post('/plc/data-sets', dataSet);
  return response.data;
};

export const updateDataSet = async (id: number, updates: Partial<DataSet>): Promise<void> => {
  await api.put(`/plc/data-sets/${id}`, updates);
};

export const deleteDataSet = async (id: number): Promise<void> => {
  await api.delete(`/plc/data-sets/${id}`);
};

// ==================== Tag APIs ====================

export const getTags = async (): Promise<Tag[]> => {
  const response = await api.get('/plc/tags');
  return response.data;
};

export const getTag = async (key: string): Promise<Tag> => {
  const response = await api.get(`/plc/tags/${key}`);
  return response.data;
};

export const createTag = async (tag: Tag): Promise<Tag> => {
  const response = await api.post('/plc/tags', tag);
  return response.data;
};

export const updateTag = async (key: string, updates: Partial<Tag>): Promise<void> => {
  await api.put(`/plc/tags/${key}`, updates);
};

export const deleteTag = async (key: string): Promise<void> => {
  await api.delete(`/plc/tags/${key}`);
};

// ==================== Tag Value APIs (핵심!) ====================

export const getTagValue = async (key: string): Promise<TagValue> => {
  const response = await api.get(`/plc/tags/${key}/value`);
  return response.data;
};

export const writeTagValue = async (key: string, value: number | string | boolean): Promise<void> => {
  await api.post(`/plc/tags/${key}/value`, { value });
};

// ==================== Tag Polling APIs ====================

export const startTagPolling = async (): Promise<void> => {
  await api.post('/plc/tags/polling/start');
};

export const stopTagPolling = async (): Promise<void> => {
  await api.post('/plc/tags/polling/stop');
};

export const getTagPollingStatus = async (): Promise<TagPollingStatus> => {
  const response = await api.get('/plc/tags/polling/status');
  return response.data;
};

export const getTagPollingMetrics = async (): Promise<{
  readCount: number;
  readsPerSecond: number;
  elapsedSeconds: number;
}> => {
  const response = await api.get('/plc/tags/polling/metrics');
  return response.data;
};
