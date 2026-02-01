// API Client for Budget System
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!response.ok && response.status === 401) {
      this.clearTokens();
      window.location.reload();
    }

    return response;
  }

  async get(path) {
    const res = await this.request(path);
    return res.json();
  }

  async post(path, data) {
    const response = await this.request(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async put(path, data) {
    const response = await this.request(path, {
      method: 'PUT',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async delete(path) {
    await this.request(path, { method: 'DELETE' });
    return true;
  }
}

export const api = new ApiClient();
export const API_BASE_URL = API_BASE;
