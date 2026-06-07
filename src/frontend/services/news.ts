import axios from 'axios';

const NEWS_API_URL = 'http://localhost:5000/api/news';

export const getAllNews = () => {
	return axios.get(`${NEWS_API_URL}`);
};

export const getLatestNews = (limit?: number) => {
	return axios.get(`${NEWS_API_URL}/latest`, { params: limit ? { limit } : {} });
};

export const getNewsById = (id: number) => {
	return axios.get(`${NEWS_API_URL}/${id}`);
};
