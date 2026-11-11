import axios from 'axios';

const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired/invalid session sends the person back to login. Failed logins (no stored token) are left alone.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export const errorMessage = (error) =>
  error.response?.data?.message || (error.request ? 'Cannot reach the server. Check your connection' : 'Something went wrong');

export default api;
