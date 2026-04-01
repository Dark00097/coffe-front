// File: api(10).js
import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'https://lacoupole-back.onrender.com'}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${config.method.toUpperCase()}] ${config.url}`);
    }
    const token = localStorage.getItem('jwt_token');
    const sessionId = localStorage.getItem('sessionId');
    const deviceId = localStorage.getItem('deviceId');

    if (token && typeof token === 'string' && token !== 'null' && token !== 'undefined' && token.trim()) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Setting Authorization header:', `Bearer ${token.substring(0, 10)}...`);
    } else {
      console.warn('No valid token found for request:', config.url);
      delete config.headers.Authorization;
    }

    if (sessionId && typeof sessionId === 'string' && sessionId.trim()) {
      config.headers['X-Session-Id'] = sessionId;
    } else {
      delete config.headers['X-Session-Id'];
    }

    if (deviceId && typeof deviceId === 'string' && deviceId.trim()) {
      config.headers['X-Device-Id'] = deviceId;
    } else {
      delete config.headers['X-Device-Id'];
    }

    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    }

    return config;
  },
  (error) => {
    console.error('Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Response] ${response.config.url}: ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const message = error.response?.data?.error || error.message;
    console.error(`[Error] ${error.config?.url}: ${message}`);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = localStorage.getItem('jwt_token');
        if (!token || typeof token !== 'string' || token === 'null' || token === 'undefined' || !token.trim()) {
          console.warn('No valid token for refresh, redirecting to login');
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('sessionId');
          localStorage.removeItem('deviceId');
          delete api.defaults.headers.common['Authorization'];
          delete api.defaults.headers.common['X-Session-Id'];
          delete api.defaults.headers.common['X-Device-Id'];
          window.location.href = '/login';
          return Promise.reject(error);
        }
        console.log('Attempting token refresh with:', token.substring(0, 10) + '...');
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL || 'https://lacoupole-back.onrender.com'}/api/refresh-token`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const newToken = res.data.token;
        if (!newToken || typeof newToken !== 'string' || !newToken.trim()) {
          throw new Error('Invalid refresh token received');
        }
        localStorage.setItem('jwt_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        console.log('Token refreshed successfully:', newToken.substring(0, 10) + '...');
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('deviceId');
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['X-Session-Id'];
        delete api.defaults.headers.common['X-Device-Id'];
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Notification API methods
api.getNotifications = (params) => api.get('/notifications', { params });
api.markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
api.clearNotifications = () => api.put('/notifications/clear');

// Table and reservation API methods
api.getTables = () => api.get('/tables');
api.getAvailableTables = () => api.get('/tables?status=available');
api.addTable = (data) => api.post('/tables', data);
api.bulkAddTables = (data) => api.post('/tables/bulk', data);
api.updateTable = (id, data) => api.put(`/tables/${id}`, data);
api.deleteTable = (id, data) => api.delete(`/tables/${id}`, { data });
api.bulkDeleteTables = (data) => api.delete('/tables/bulk', { data });
api.getReservations = () => api.get('/reservations');
api.addReservation = (data) => api.post('/reservations', data);
api.updateReservation = (id, data) => api.put(`/reservations/${id}`, data);

// Rating API methods
api.submitRating = (data) => api.post('/ratings', data);
api.getRatingsByItem = (itemId) => api.get(`/ratings?item_id=${itemId}`);
api.getRatingsByBreakfast = (breakfastId) => api.get(`/breakfast-ratings?breakfast_id=${breakfastId}`);
api.submitBreakfastRating = (data) => api.post('/breakfast-ratings', data);

// User management API methods
api.updateUser = (id, data) => api.put(`/users/${id}`, data);
api.deleteUser = (id, data) => api.delete(`/users/${id}`, { data });

// Category management API methods
api.addCategory = (data) => api.post('/categories', data);
api.updateCategory = (id, data) => api.put(`/categories/${id}`, data);
api.deleteCategory = (id, data) => api.delete(`/categories/${id}`, { data });
api.getTopCategories = () => api.get('/categories/top');

// Menu item API methods
api.addMenuItem = (data) => api.post('/menu-items', data);
api.updateMenuItem = (id, data) => api.put(`/menu-items/${id}`, data);
api.deleteMenuItem = (id, data) => api.delete(`/menu-items/${id}`, { data });
api.searchMenuItems = (query) => api.get('/menu-items/search', { params: { query } });
api.getBestSellers = () => api.get('/menu-items/best-sellers');

// Supplement API methods
api.getSupplementsByMenuItem = (menuItemId) => api.get(`/menu-items/${menuItemId}/supplements`);
api.addSupplementToMenuItem = (menuItemId, data) => api.post(`/menu-items/${menuItemId}/supplements`, data);
api.updateSupplementForMenuItem = (menuItemId, supplementId, data) => api.put(`/menu-items/${menuItemId}/supplements/${supplementId}`, data);
api.deleteSupplementFromMenuItem = (menuItemId, supplementId, data) => api.delete(`/menu-items/${menuItemId}/supplements/${supplementId}`, { data });

// Order API methods
api.submitOrder = (data, config = {}) => api.post('/orders', data, config);
api.submitStaffOrder = (data) => api.post('/orders', { ...data, source: 'staff-console' });
api.approveOrder = (id) => api.post(`/orders/${id}/approve`);
api.cancelOrder = (id, data) => api.post(`/orders/${id}/cancel`, data);
api.getOrder = (id, config = {}) => api.get(`/orders/${id}`, config);
api.createStripeCheckoutSession = (data, config = {}) => api.post('/stripe/checkout-sessions', data, config);
api.getSession = () => api.get('/session');

// Banner API methods
api.getBanners = (params) => api.get('/banners', { params });
api.getEnabledBanners = () => api.get('/banners/enabled');
api.addBanner = (data) => api.post('/banners', data);
api.updateBanner = (id, data) => api.put(`/banners/${id}`, data);
api.deleteBanner = (id, data) => api.delete(`/banners/${id}`, { data });

// Breakfast API methods
api.getBreakfasts = () => api.get('/breakfasts');
api.getBreakfast = (id) => api.get(`/breakfasts/${id}`);
api.getBreakfastOptions = (id) => api.get(`/breakfasts/${id}/options`);
api.addBreakfast = (data) => api.post('/breakfasts', data);
api.updateBreakfast = (id, data) => api.put(`/breakfasts/${id}`, data);
api.deleteBreakfast = (id, data) => api.delete(`/breakfasts/${id}`, { data });
api.addBreakfastOption = (id, data) => api.post(`/breakfasts/${id}/options`, data);
api.deleteBreakfastOption = (breakfastId, optionId, data) => api.delete(`/breakfasts/${breakfastId}/options/${optionId}`, { data });
api.getBreakfastOptionGroups = (id) => api.get(`/breakfasts/${id}/option-groups`);
api.addBreakfastOptionGroup = (id, data) => api.post(`/breakfasts/${id}/option-groups`, data);
api.updateBreakfastOptionGroup = (breakfastId, groupId, data) => api.put(`/breakfasts/${breakfastId}/option-groups/${groupId}`, data);
api.deleteBreakfastOptionGroup = (breakfastId, groupId, data) => api.delete(`/breakfasts/${breakfastId}/option-groups/${groupId}`, { data });
api.updateBreakfastOption = (breakfastId, optionId, data) => api.put(`/breakfasts/${breakfastId}/options/${optionId}`, data);
api.getRelatedBreakfastProducts = (id) => api.get(`/breakfasts/${id}/related`);
api.getReusableOptionGroups = () => api.get('/option-groups/reusable');
api.createReusableOptionGroup = (data) => api.post('/option-groups/reusable', data);
api.updateReusableOptionGroup = (id, data) => api.put(`/option-groups/reusable/${id}`, data);
api.deleteReusableOptionGroup = (id, data) => api.delete(`/option-groups/reusable/${id}`, { data });

// Theme API methods
api.getTheme = () => api.get('/theme');
api.updateTheme = (data) => api.put('/theme', data);
api.updateBranding = (data) => api.put('/theme/branding', data);

// Stock API methods
api.getIngredients = (params) => {
  if (!params.user_id) {
    console.error('user_id is required for getIngredients');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.get('/stock/ingredients', { params });
};
api.addIngredient = (data) => {
  if (!data.user_id) {
    console.error('user_id is required for addIngredient');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.post('/stock/ingredients', data);
};
api.updateIngredient = (id, data) => {
  if (!data.user_id) {
    console.error('user_id is required for updateIngredient');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.put(`/stock/ingredients/${id}`, data);
};
api.deleteIngredient = (id, data) => {
  if (!data.user_id) {
    console.error('user_id is required for deleteIngredient');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.delete(`/stock/ingredients/${id}`, { data });
};
api.assignIngredientToMenuItem = (menuItemId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for assignIngredientToMenuItem');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.post(`/stock/menu-items/${menuItemId}/ingredients`, data);
};
api.updateIngredientForMenuItem = (menuItemId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for updateIngredientForMenuItem');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.put(`/stock/menu-items/${menuItemId}/ingredients/${ingredientId}`, data);
};
api.deleteIngredientFromMenuItem = (menuItemId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for deleteIngredientFromMenuItem');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.delete(`/stock/menu-items/${menuItemId}/ingredients/${ingredientId}`, { data });
};
api.assignIngredientToBreakfast = (breakfastId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for assignIngredientToBreakfast');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.post(`/stock/breakfasts/${breakfastId}/ingredients`, data);
};
api.updateIngredientForBreakfast = (breakfastId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for updateIngredientForBreakfast');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.put(`/stock/breakfasts/${breakfastId}/ingredients/${ingredientId}`, data);
};
api.deleteIngredientFromBreakfast = (breakfastId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for deleteIngredientFromBreakfast');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.delete(`/stock/breakfasts/${breakfastId}/ingredients/${ingredientId}`, { data });
};
api.assignIngredientToSupplement = (supplementId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for assignIngredientToSupplement');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.post(`/stock/supplements/${supplementId}/ingredients`, data);
};
api.updateIngredientForSupplement = (supplementId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for updateIngredientForSupplement');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.put(`/stock/supplements/${supplementId}/ingredients/${ingredientId}`, data);
};
api.deleteIngredientFromSupplement = (supplementId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for deleteIngredientFromSupplement');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.delete(`/stock/supplements/${supplementId}/ingredients/${ingredientId}`, { data });
};
api.assignIngredientToBreakfastOption = (optionId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for assignIngredientToBreakfastOption');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.post(`/stock/breakfast-options/${optionId}/ingredients`, data);
};
api.updateIngredientForBreakfastOption = (optionId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for updateIngredientForBreakfastOption');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.put(`/stock/breakfast-options/${optionId}/ingredients/${ingredientId}`, data);
};
api.deleteIngredientFromBreakfastOption = (optionId, ingredientId, data) => {
  if (!data.user_id) {
    console.error('user_id is required for deleteIngredientFromBreakfastOption');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.delete(`/stock/breakfast-options/${optionId}/ingredients/${ingredientId}`, { data });
};
api.getStockDashboard = (params) => {
  if (!params.user_id) {
    console.error('user_id is required for getStockDashboard');
    return Promise.reject(new Error('user_id is required'));
  }
  return api.get('/stock/stock-dashboard', { params });
};

export { api };
