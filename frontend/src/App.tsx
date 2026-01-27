import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { authService } from './services/authService';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import BuildList from './components/Build/BuildList';
import BuildDetail from './components/Build/BuildDetail';
import AdminPanel from './components/Admin/AdminPanel';
import './App.css';

function App() {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        {isAuthenticated && (
          <nav style={{
            background: '#333',
            color: 'white',
            padding: '15px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <Link to="/builds" style={{ color: 'white', textDecoration: 'none', fontSize: '1.2em', fontWeight: 'bold' }}>
                PC Part Picker
              </Link>
              <Link to="/builds" style={{ color: 'white', textDecoration: 'none' }}>
                My Builds
              </Link>
              {user?.isAdmin && (
                <Link to="/admin" style={{ color: 'white', textDecoration: 'none' }}>
                  Admin Panel
                </Link>
              )}
            </div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span>Welcome, {user?.username}!</span>
              <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
                Logout
              </button>
            </div>
          </nav>
        )}

        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/builds" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/builds" />} />
          <Route
            path="/builds"
            element={isAuthenticated ? <BuildList /> : <Navigate to="/login" />}
          />
          <Route
            path="/builds/:id"
            element={isAuthenticated ? <BuildDetail /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={isAuthenticated && user?.isAdmin ? <AdminPanel /> : <Navigate to="/builds" />}
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/builds" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

