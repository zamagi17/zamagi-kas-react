import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const HEALTH_URL = 'https://increasing-felicity-zamagi-apps-3fc54a80.koyeb.app/api/health';

function App() {

  useEffect(() => {
    // Ping pertama langsung saat app dibuka
    fetch(HEALTH_URL).catch(() => {});

    // Ping berikutnya tiap 50 menit agar server Koyeb tidak tidur
    const keepAlive = setInterval(() => {
      fetch(HEALTH_URL).catch(() => {});
    }, 50 * 60 * 1000);

    return () => clearInterval(keepAlive);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;