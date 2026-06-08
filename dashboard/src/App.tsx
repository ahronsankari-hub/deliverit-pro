import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import SenderDashboard from './pages/SenderDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import { PaymentSuccess, PaymentCancel } from './pages/PaymentResult';

const Guard = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#FF6B35', fontSize:18 }}>⏳ טוען...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"           element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/"                element={<Guard><SenderDashboard /></Guard>} />
      <Route path="/admin"           element={<Guard adminOnly><AdminDashboard /></Guard>} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel"  element={<PaymentCancel />} />
      <Route path="*"      element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
