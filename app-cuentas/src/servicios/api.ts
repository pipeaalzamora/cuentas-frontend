import axios from 'axios';
import { obtenerFirebaseIdToken } from './firebase';

// URL base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// Crear instancia de axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token si existe (para futuro)
api.interceptors.request.use(
  async (config) => {
    const firebaseToken = await obtenerFirebaseIdToken();
    const token = firebaseToken || localStorage.getItem('token') || API_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Manejar error de autenticación
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
