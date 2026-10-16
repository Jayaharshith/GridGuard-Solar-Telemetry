/**
 * GridGuard Frontend API Service Layer
 */

const API_BASE_URL = '/api';

function getStoredToken() {
  return localStorage.getItem('gridguard_token');
}

function setStoredToken(token) {
  if (token) {
    localStorage.setItem('gridguard_token', token);
  } else {
    localStorage.removeItem('gridguard_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: 'include', // Include cookies if set
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (err) {
    throw new Error('Network error: Unable to connect to GridGuard backend server on port 5000.');
  }

  // Handle CSV download
  if (options.responseType === 'blob') {
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || 'Failed to download file.');
    }
    return await response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data.code;
    error.details = data.details;
    throw error;
  }

  return data;
}

export const api = {
  // Auth APIs
  login: async (credentials) => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  register: async (userData) => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },

  getMe: () => request('/auth/me'),

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch (_) {}
    setStoredToken(null);
  },

  // Telemetry APIs
  getLatestTelemetry: () => request('/telemetry/latest'),

  getTelemetryHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/telemetry/history?${query}`);
  },

  getTelemetryStats: (range = '24h') => request(`/telemetry/stats?range=${range}`),

  exportCsv: async (range = '24h', status = 'All') => {
    const token = getStoredToken();
    const query = new URLSearchParams({ range, status }).toString();
    const blob = await request(`/telemetry/export?${query}`, {
      responseType: 'blob',
    });
    // Trigger browser download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridguard-telemetry-${range}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Battery APIs
  getBatteryStatus: () => request('/battery/status'),
  getBatteryHistory: (range = '24h') => request(`/battery/history?range=${range}`),

  // Alert APIs
  getAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/alerts?${query}`);
  },

  getActiveAlerts: () => request('/alerts/active'),

  resolveAlert: (id) => request(`/alerts/${id}/resolve`, { method: 'PATCH' }),

  // Settings APIs
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  }),
  resetDemoData: () => request('/settings/reset-demo', {
    method: 'POST',
    body: JSON.stringify({ confirmed: true }),
  }),

  // Simulation APIs
  getSimulationStatus: () => request('/simulation/status'),
  startSimulation: () => request('/simulation/start', { method: 'POST' }),
  stopSimulation: () => request('/simulation/stop', { method: 'POST' }),

  // Health and System Diagnostics
  checkHealth: () => request('/health'),

  // Utilities
  getToken: getStoredToken,
  clearToken: () => setStoredToken(null),
};

export default api;
