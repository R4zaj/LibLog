import axios from 'axios';
import { Platform } from 'react-native';
import { getItem } from '../utils/Storage';

import Constants from 'expo-constants';

const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost?.split(':')[0] || '192.168.1.19';
const host = Platform.OS === 'web' ? 'localhost' : localIp;

const API_URL = `http://${host}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  async (config) => {
    const token = await getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const { DeviceEventEmitter } = require('react-native');
      DeviceEventEmitter.emit('auth:logout');
    }
    return Promise.reject(error);
  }
);

export default api;
