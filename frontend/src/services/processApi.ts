import axios from "axios";
import { ProcessFunction, ProcessProgram, HardwareProfile } from "../types";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const listFunctions = async (): Promise<ProcessFunction[]> => {
  const res = await api.get("/process/functions");
  return res.data;
};

export const createFunction = async (payload: any): Promise<ProcessFunction> => {
  const res = await api.post("/process/functions", payload);
  return res.data;
};

export const listPrograms = async (): Promise<ProcessProgram[]> => {
  const res = await api.get("/process/programs");
  return res.data;
};

export const createProgram = async (payload: any): Promise<ProcessProgram> => {
  const res = await api.post("/process/programs", payload);
  return res.data;
};

export const deployProgram = async (programId: number, options: { baseAddress?: number; stepWords?: number } = {}) => {
  const res = await api.post(`/process/programs/${programId}/deploy`, options);
  return res.data;
};

export const listHardwareProfiles = async (): Promise<HardwareProfile[]> => {
  const res = await api.get("/hardware/profiles");
  return res.data;
};

export const createHardwareProfile = async (payload: any): Promise<HardwareProfile> => {
  const res = await api.post("/hardware/profiles", payload);
  return res.data;
};
