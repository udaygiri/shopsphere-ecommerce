import axios from 'axios';

// Create Axios client with base URL from environment variable
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach Bearer token if present in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Provide standardized error messages and handle 401s
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If backend returns a validation error list or detail string, normalize it
    const detail = error.response?.data?.detail;
    let errorMessage = 'An unexpected error occurred. Please try again.';

    if (typeof detail === 'string') {
      errorMessage = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI 422 validation errors array
      errorMessage = detail.map((err) => `${err.loc?.[err.loc.length - 1] || 'Field'}: ${err.msg}`).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Attach normalized message to error object for easy UI consumption
    error.normalizedMessage = errorMessage;

    // If 401 Unauthorized occurs on a authenticated request, clear invalid token
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Dispatch custom event so AuthContext can react without hard page reload
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    return Promise.reject(error);
  }
);

export default api;
