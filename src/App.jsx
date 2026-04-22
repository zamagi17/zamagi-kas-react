import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transaksi from './pages/Transaksi';
import UtangPiutang from './pages/UtangPiutang';
import Laporan from './pages/Laporan';
import Budget from './pages/Budget';
import Settings from './pages/Settings';
import useDarkMode from './hooks/useDarkMode';
import useAuth from './hooks/useAuth';

const HEALTH_URL = `${import.meta.env.VITE_API_URL}/api/health`;

function AppInner() {
    useDarkMode();
    useAuth();

    useEffect(() => {
        fetch(HEALTH_URL).catch(() => {});
        const keepAlive = setInterval(() => {
            fetch(HEALTH_URL).catch(() => {});
        }, 50 * 60 * 1000);
        return () => clearInterval(keepAlive);
    }, []);

    return (
        <Routes>
            <Route path="/"              element={<Login />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/transaksi"     element={<Transaksi />} />
            <Route path="/utang-piutang" element={<UtangPiutang />} />
            <Route path="/budget"        element={<Budget />} />
            <Route path="/laporan"       element={<Laporan />} />
            <Route path="/settings"      element={<Settings />} />
        </Routes>
    );
}

export default function App() {
    return (
        <Router>
            <AppInner />
        </Router>
    );
}
