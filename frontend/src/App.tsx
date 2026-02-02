import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BuilderPage from './pages/BuilderPage';
import SharePage from './pages/SharePage';
import PartsAdminPage from './pages/PartsAdminPage';
import PartFormPage from './pages/PartFormPage';
import SelectPartPage from './pages/SelectPartPage';
import PartDetailsPage from './pages/PartDetailsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <nav className="bg-white border-b">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#37b48f]/15 border border-[#37b48f]/40 text-[#37b48f]">
                <span className="text-sm">🖥</span>
              </span>
              PC Builder
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/admin/parts" className="text-sm text-gray-600 hover:text-gray-900">
                Parts Admin
              </Link>
              <button className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-black">
                Sign In
              </button>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<BuilderPage />} />
          <Route path="/select/:category" element={<SelectPartPage />} />
          <Route path="/parts/:category/:id" element={<PartDetailsPage />} />
          <Route path="/share/:shareCode" element={<SharePage />} />
          <Route path="/admin" element={<Navigate to="/admin/parts" replace />} />
          <Route path="/admin/parts" element={<PartsAdminPage />} />
          <Route path="/admin/parts/new" element={<PartFormPage />} />
          <Route path="/admin/parts/:category/:id/edit" element={<PartFormPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
