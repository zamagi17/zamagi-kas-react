import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import UtangPiutang from './pages/UtangPiutang';
import Laporan from './pages/Laporan';

const HEALTH_URL = `${import.meta.env.VITE_API_URL}/api/health`;

function App() {
    useEffect(() => {
        fetch(HEALTH_URL).catch(() => {});
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
                <Route path="/transaksi" element={<Transaksi />} />
                <Route path="/utang-piutang" element={<UtangPiutang />} />
                <Route path="/laporan" element={<Laporan />} />
            </Routes>
        </Router>
    );
}

export default App;