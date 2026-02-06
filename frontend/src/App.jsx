import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ListDetailPage from './pages/ListDetailPage';
import ListEditorPage from './pages/ListEditorPage';
import CreateListPage from './pages/CreateListPage';
import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/list/new" element={<CreateListPage />} />
          <Route path="/list/:id" element={<ListDetailPage />} />
          <Route path="/list/:id/edit" element={<ListEditorPage />} />
          <Route path="/user/:username" element={<ProfilePage />} />
          <Route path="/search" element={<SearchPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
