import { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Navbar from './components/Navbar';
import Profile from './pages/Profile';
import CheckCheater from './components/CheckCheater';
import ShareCard from './components/ShareCard';
import AuthPage from './pages/AuthPage';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <DataProvider>
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
        {currentPage === 'dashboard' && <Profile />}
        {currentPage === 'cheater' && (
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <CheckCheater />
          </main>
        )}
        {currentPage === 'share' && (
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <ShareCard />
          </main>
        )}
      </div>
    </DataProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
