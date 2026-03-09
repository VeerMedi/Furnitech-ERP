import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Organizations from './pages/Organizations';
import Features from './pages/Features';
import Payments from './pages/Payments';
import AIAlerts from './pages/AIAlerts';
import Layout from './components/Layout';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="payments" element={<Payments />} />
          <Route path="features" element={<Features />} />
          <Route path="ai-alerts" element={<AIAlerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
