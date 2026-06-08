import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PendingPage from './pages/PendingPage';
import DriversPage from './pages/DriversPage';
import CompaniesPage from './pages/CompaniesPage';
import GroupsPage from './pages/GroupsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<PendingPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
