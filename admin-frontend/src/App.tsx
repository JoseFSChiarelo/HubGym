import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { PersonalRoute } from './modules/auth/PersonalRoute';
import { AthleteRoute } from './modules/auth/AthleteRoute';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { PersonalsListPage } from './pages/PersonalsList';
import { SettingsPage } from './pages/Settings';
import { AppLayout } from './components/AppLayout';
import { PersonalDashboard } from './pages/PersonalDashboard';
import { PersonalProfilePage } from './pages/PersonalProfile';
import { PersonalLayout } from './components/PersonalLayout';
import { PersonalClientsPage } from './pages/PersonalClients';
import { PersonalTrainingsPage } from './pages/PersonalTrainings';
import { PersonalLibraryPage } from './pages/PersonalLibrary';
import { PersonalChatPage } from './pages/PersonalChat';
import { AdminSubscriptionsPage } from './pages/AdminSubscriptions';
import { AdminLibraryPage } from './pages/AdminLibrary';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { AthleteTrainingsPage } from './pages/AthleteTrainings';
import { AthleteTrainingSessionPage } from './pages/AthleteTrainingSession';
import { AthleteEvolutionPage } from './pages/AthleteEvolution';
import { AthleteChatPage } from './pages/AthleteChat';
import { AthleteProfilePage } from './pages/AthleteProfile';
import { useAuth } from './modules/auth/AuthContext';

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user?.role === 'PERSONAL') return <Navigate to="/personal" replace />;
  if (user?.role === 'ATHLETE') return <Navigate to="/athlete" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="/admin/library" element={<AdminLibraryPage />} />
          <Route path="/admin/personals" element={<PersonalsListPage />} />
          <Route path="/admin/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route element={<PersonalRoute />}>
        <Route element={<PersonalLayout />}>
          <Route path="/personal" element={<PersonalDashboard />} />
          <Route path="/personal/profile" element={<PersonalProfilePage />} />
          <Route path="/personal/clients" element={<PersonalClientsPage />} />
          <Route path="/personal/trainings" element={<PersonalTrainingsPage />} />
          <Route path="/personal/library" element={<PersonalLibraryPage />} />
          <Route path="/personal/chat" element={<PersonalChatPage />} />
        </Route>
      </Route>
      <Route element={<AthleteRoute />}>
        <Route path="/athlete" element={<AthleteDashboard />} />
        <Route path="/athlete/trainings" element={<AthleteTrainingsPage />} />
        <Route path="/athlete/trainings/:id" element={<AthleteTrainingSessionPage />} />
        <Route path="/athlete/evolution" element={<AthleteEvolutionPage />} />
        <Route path="/athlete/chat" element={<AthleteChatPage />} />
        <Route path="/athlete/profile" element={<AthleteProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
