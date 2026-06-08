import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

// Attach access token to every request
api.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// Auto-refresh on 401
let refreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(r => r, async (err) => {
  const orig = err.config;
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true;
    if (refreshing) {
      return new Promise(resolve => { queue.push(() => resolve(api(orig))); });
    }
    refreshing = true;
    try {
      const rt = localStorage.getItem('refreshToken');
      if (!rt) throw new Error('no refresh token');
      const { data } = await axios.post(`${BASE}/auth/refresh`, { refreshToken: rt });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      queue.forEach(fn => fn());
      queue = [];
      return api(orig);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    } finally { refreshing = false; }
  }
  return Promise.reject(err);
});

export const authApi = {
  login:          (d: object) => api.post('/auth/login', d),
  register:       (d: object) => api.post('/auth/register', d),
  me:             ()          => api.get('/auth/me'),
  logout:         ()          => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  updateProfile:  (d: object) => api.patch('/auth/me', d),
};

export const reqApi = {
  list:       (p?: object)              => api.get('/requests', { params: p }),
  create:     (d: object)               => api.post('/requests', d),
  get:        (id: string)              => api.get(`/requests/${id}`),
  track:      (code: string)            => api.get(`/requests/track/${code}`),
  updateStatus:(id: string, status: string) => api.patch(`/requests/${id}/status`, { status }),
  acceptBid:  (bidId: string)           => api.post(`/requests/bids/${bidId}/accept`),
  cancel:     (id: string)              => api.post(`/requests/${id}/cancel`),
};

export const reviewApi = {
  submit:    (d: object)       => api.post('/reviews', d),
  forUser:   (userId: string)  => api.get(`/reviews/user/${userId}`),
  canReview: (requestId: string) => api.get(`/reviews/can/${requestId}`),
};

export const courierApi = {
  profile: (courierId: string) => api.get(`/courier/profile/${courierId}`),
};

export const pushApi = {
  vapidKey:    ()                    => api.get('/push/vapid-key'),
  subscribe:   (sub: object)         => api.post('/push/subscribe', sub),
  unsubscribe: ()                    => api.post('/push/unsubscribe'),
};

export const paymentApi = {
  checkout: (requestId: string) => api.post(`/payments/checkout/${requestId}`),
  status:   (requestId: string) => api.get(`/payments/status/${requestId}`),
};

export const aiApi = {
  analyze:      (imageUrls: string[]) => api.post('/ai/analyze', { imageUrls }),
  suggestPrice: (params: object)      => api.post('/ai/suggest-price', params),
};

export const bidApi = {
  lowerBid: (requestId: string, newPrice: number) =>
    api.patch(`/requests/${requestId}/bids/lower`, { newPrice }),
};

export default api;
