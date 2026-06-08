import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5000/api' });
api.interceptors.request.use(c => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use(r => r, e => { if (e.response?.status === 401) { localStorage.removeItem('token'); window.location.href = '/login'; } return Promise.reject(e); });
export const authApi = { login: (d: object) => api.post('/auth/login', d), register: (d: object) => api.post('/auth/register', d), me: () => api.get('/auth/me') };
export const reqApi = { list: (p?: object) => api.get('/requests', { params: p }), get: (id: string) => api.get(`/requests/${id}`), updateStatus: (id: string, status: string) => api.patch(`/requests/${id}/status`, { status }) };
export const bidApi = { submit: (requestId: string, d: object) => api.post(`/requests/${requestId}/bids`, d), myBids: () => api.get('/courier/bids'), withdraw: (requestId: string) => api.delete(`/requests/${requestId}/bids`) };
export const courierApi = {
  stats:    ()                              => api.get('/courier/stats'),
  location: (lat: number, lng: number)     => api.post('/courier/location', { lat, lng }),
  offline:  ()                              => api.post('/courier/offline'),
};
export const uploadApi = {
  proof: (requestId: string, file: File) => {
    const fd = new FormData(); fd.append('photo', file);
    return api.post(`/upload/proof/${requestId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
export const reviewApi = {
  submit: (d: object) => api.post('/reviews', d),
};
export default api;
