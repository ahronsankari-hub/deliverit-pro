import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CourierLogin from './pages/CourierLogin';
import CourierDashboard from './pages/CourierDashboard';

const isLoggedIn = () => !!localStorage.getItem('token');

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<CourierLogin />} />
        <Route path="/" element={isLoggedIn() ? <CourierDashboard /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
