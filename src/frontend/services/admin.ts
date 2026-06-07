import axios from 'axios';
import { API_URL_ADMIN } from './config';
import { getToken } from '../utils/auth';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${getToken()}` },
});

export interface ProfileListParams {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const getProfiles = (params: ProfileListParams = {}) =>
  axios.get(`${API_URL_ADMIN}/profiles`, { params, ...authHeaders() });

export const getProfileDetail = (id: number) =>
  axios.get(`${API_URL_ADMIN}/profiles/${id}`, authHeaders());

export const approveProfile = (id: number) =>
  axios.put(`${API_URL_ADMIN}/profiles/${id}/approve`, {}, authHeaders());

export const rejectProfile = (id: number, reject_reason: string) =>
  axios.put(`${API_URL_ADMIN}/profiles/${id}/reject`, { reject_reason }, authHeaders());

export const getStatistics = () =>
  axios.get(`${API_URL_ADMIN}/statistics`, authHeaders());

export const getUniversities = () =>
  axios.get(`${API_URL_ADMIN}/universities`, authHeaders());

export const exportProfiles = (status?: string) =>
  axios.get(`${API_URL_ADMIN}/export/profiles`, { params: { status }, ...authHeaders() });
