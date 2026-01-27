import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderPage from './pages/BuilderPage';
import SharePage from './pages/SharePage';
import AdminPage from './pages/AdminPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex gap-6">
            <Link to="/" className="hover:text-blue-400">Builder</Link>
            <Link to="/admin" className="hover:text-blue-400">Admin</Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<BuilderPage />} />
          <Route path="/share/:shareCode" element={<SharePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
