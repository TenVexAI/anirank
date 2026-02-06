import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import ListDetailPage from './pages/ListDetailPage';
import ListEditorPage from './pages/ListEditorPage';
import CreateListPage from './pages/CreateListPage';
import ProfilePage from './pages/ProfilePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import SearchPage from './pages/SearchPage';
import ProfileSetupPage from './pages/ProfileSetupPage';

function NotFoundPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 text-center">
      <h1 className="text-6xl mb-4 text-[var(--color-accent-red)]">404</h1>
      <p className="text-lg text-[var(--color-text-secondary)] mb-6">Page not found.</p>
      <Link to="/" className="text-[var(--color-accent-cyan)] hover:underline">Go Home</Link>
    </div>
  );
}

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/setup" element={<ProtectedRoute allowIncomplete><ProfileSetupPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/list/new" element={<ProtectedRoute><CreateListPage /></ProtectedRoute>} />
          <Route path="/list/:id" element={<ListDetailPage />} />
          <Route path="/list/:id/edit" element={<ProtectedRoute><ListEditorPage /></ProtectedRoute>} />
          <Route path="/user/:username" element={<ProfilePage />} />
          <Route path="/settings" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
