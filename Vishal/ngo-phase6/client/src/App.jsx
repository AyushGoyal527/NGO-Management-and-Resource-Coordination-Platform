import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { FullPageSpinner } from './components/ui';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Programs from './pages/public/Programs';
import Events from './pages/public/Events';
import Volunteer from './pages/public/Volunteer';
import Donate from './pages/public/Donate';
import Contact from './pages/public/Contact';
import Unauthorized from './pages/public/Unauthorized';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Users from './pages/admin/Users';
import Permissions from './pages/admin/Permissions';
import { AnnouncementsPage, BeneficiariesPage, EventsPage, ProgramsPage, ResourcesPage, StudentsPage, VolunteersPage } from './pages/shared/ModulePages';
import TasksPage from './pages/shared/TasksPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ReportsPage from './pages/shared/ReportsPage';
import WebsiteCms from './pages/admin/WebsiteCms';
import ActivityLogPage from './pages/admin/ActivityLogPage';
import FoodPage from './pages/shared/FoodPage';
// Dashboards pull in the charting library, so they load on demand.
const DonationsPage = lazy(() => import('./pages/shared/DonationsPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const VolunteerDashboard = lazy(() => import('./pages/volunteer/VolunteerDashboard'));

const area = (role) => (
  <ProtectedRoute roles={[role]}><DashboardLayout /></ProtectedRoute>
);

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/events" element={<Events />} />
        <Route path="/volunteer" element={<Volunteer />} />
        <Route path="/donate" element={<Donate />} />
        <Route path="/contact" element={<Contact />} />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/admin" element={area('admin')}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<ProtectedRoute permission="users.view"><Users /></ProtectedRoute>} />
        <Route path="permissions" element={<ProtectedRoute permission="users.edit"><Permissions /></ProtectedRoute>} />
        <Route path="activity" element={<ActivityLogPage />} />
        <Route path="website" element={<ProtectedRoute permission="settings.view"><WebsiteCms /></ProtectedRoute>} />
        <Route path="volunteers" element={<ProtectedRoute permission="volunteers.view"><VolunteersPage /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute permission="students.view"><StudentsPage /></ProtectedRoute>} />
        <Route path="beneficiaries" element={<ProtectedRoute permission="beneficiaries.view"><BeneficiariesPage /></ProtectedRoute>} />
        <Route path="donations" element={<ProtectedRoute permission="donations.view"><DonationsPage /></ProtectedRoute>} />
        <Route path="food" element={<ProtectedRoute permission="food.view"><FoodPage /></ProtectedRoute>} />
        <Route path="resources" element={<ProtectedRoute permission="resources.view"><ResourcesPage /></ProtectedRoute>} />
        <Route path="tasks" element={<ProtectedRoute permission="tasks.view"><TasksPage /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute permission="events.view"><EventsPage /></ProtectedRoute>} />
        <Route path="programs" element={<ProtectedRoute permission="programs.view"><ProgramsPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute permission="reports.view"><ReportsPage /></ProtectedRoute>} />
        <Route path="announcements" element={<ProtectedRoute permission="announcements.view"><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/manager" element={area('manager')}>
        <Route index element={<ManagerDashboard />} />
        <Route path="volunteers" element={<ProtectedRoute permission="volunteers.view"><VolunteersPage /></ProtectedRoute>} />
        <Route path="students" element={<ProtectedRoute permission="students.view"><StudentsPage /></ProtectedRoute>} />
        <Route path="beneficiaries" element={<ProtectedRoute permission="beneficiaries.view"><BeneficiariesPage /></ProtectedRoute>} />
        <Route path="donations" element={<ProtectedRoute permission="donations.view"><DonationsPage /></ProtectedRoute>} />
        <Route path="food" element={<ProtectedRoute permission="food.view"><FoodPage /></ProtectedRoute>} />
        <Route path="resources" element={<ProtectedRoute permission="resources.view"><ResourcesPage /></ProtectedRoute>} />
        <Route path="tasks" element={<ProtectedRoute permission="tasks.view"><TasksPage /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute permission="events.view"><EventsPage /></ProtectedRoute>} />
        <Route path="programs" element={<ProtectedRoute permission="programs.view"><ProgramsPage /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute permission="reports.view"><ReportsPage /></ProtectedRoute>} />
        <Route path="announcements" element={<ProtectedRoute permission="announcements.view"><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="/volunteer" element={area('volunteer')}>
        <Route index element={<VolunteerDashboard />} />
        <Route path="tasks" element={<ProtectedRoute permission="tasks.view"><TasksPage /></ProtectedRoute>} />
        <Route path="events" element={<ProtectedRoute permission="events.view"><EventsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<Unauthorized notFound />} />
    </Routes>
    </Suspense>
  );
}
