import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { DeviceEventEmitter } from 'react-native';
import { getItem } from '../utils/Storage';

const FALLBACK_API_URL = 'https://liblog-backend.onrender.com/api';
const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? FALLBACK_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15s timeout to handle Render cold starts gracefully
});

api.interceptors.request.use(
  async (config) => {
    const token = await getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

type RetryableConfig = InternalAxiosRequestConfig & { __retryCount?: number };

const RETRYABLE_METHODS = new Set(['get']);
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = 500;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const method = config?.method?.toLowerCase();
    const isNetworkOrServerError = !error.response || (status ?? 0) >= 500;

    // Only retry idempotent GETs — retrying a borrow/scan POST could double it up.
    if (config && method && RETRYABLE_METHODS.has(method) && isNetworkOrServerError) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      if (config.__retryCount <= MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS * config.__retryCount!));
        return api(config);
      }
    }

    if (status === 401 || status === 403) {
      DeviceEventEmitter.emit('auth:logout');
    } else if (!error.response) {
      // Distinct from auth:logout so screens can show "offline" instead of bouncing to sign-in.
      DeviceEventEmitter.emit('api:network-error', { message: error.message });
    }

    return Promise.reject(error);
  }
);

export default api;
