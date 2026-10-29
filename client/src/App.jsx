import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/public/Home';
import Unauthorized from './pages/public/Unauthorized';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import Permissions from './pages/admin/Permissions';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';

const area = (role) => (
  <ProtectedRoute roles={[role]}><DashboardLayout /></ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/admin" element={area('admin')}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<ProtectedRoute permission="users.view"><Users /></ProtectedRoute>} />
        <Route path="permissions" element={<ProtectedRoute permission="users.edit"><Permissions /></ProtectedRoute>} />
      </Route>
      <Route path="/manager" element={area('manager')}><Route index element={<ManagerDashboard />} /></Route>
      <Route path="/volunteer" element={area('volunteer')}><Route index element={<VolunteerDashboard />} /></Route>

      <Route path="*" element={<Unauthorized notFound />} />
    </Routes>
  );
}
