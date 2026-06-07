import axios from 'axios';
import { API_URL_AUTH } from './config';

export interface LoginPayload {
	username: string;
	password: string;
}

export interface RegisterPayload {
	fullName: string;
	email: string;
	username: string;
	password: string;
	studentCode?: string;
	phone?: string;
}

export const login = (payload: LoginPayload) => {
	return axios.post(`${API_URL_AUTH}/login`, payload);
};

export const register = (payload: RegisterPayload) => {
	return axios.post(`${API_URL_AUTH}/register`, payload);
};

export const forgotPassword = (email: string) => {
	return axios.post(`${API_URL_AUTH}/forgot-password`, { email });
};

export const resetPassword = (token: string, newPassword: string) => {
	return axios.post(`${API_URL_AUTH}/reset-password`, { token, newPassword });
};
