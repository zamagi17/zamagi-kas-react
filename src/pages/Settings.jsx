import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Moon, Sun, LogOut, User, Shield, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import useDarkMode from '../hooks/useDarkMode';

export default function Settings() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('username');
    const { isDark, toggle } = useDarkMode();

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

                {/* Header */}
                <div>
                    <h2 className="text-xl font-bold">Pengaturan</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Kelola preferensi aplikasi kamu</p>
                </div>

                {/* Profil */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Profil</p>
                    </div>
                    <div className="flex items-center gap-4 px-4 py-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User size={22} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{currentUser}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Pengguna aktif</p>
                        </div>
                    </div>
                </div>

                {/* Tampilan */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tampilan</p>
                    </div>
                    <div className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-3">
                            {isDark
                                ? <Moon size={20} className="text-blue-400" />
                                : <Sun size={20} className="text-amber-500" />
                            }
                            <div>
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Mode Gelap</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    {isDark ? 'Aktif — tampilan gelap' : 'Nonaktif — tampilan terang'}
                                </p>
                            </div>
                        </div>
                        {/* Toggle Switch */}
                        <button
                            onClick={toggle}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none
                                ${isDark ? 'bg-blue-500' : 'bg-slate-300'}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300
                                ${isDark ? 'translate-x-6' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Keamanan */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Keamanan</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4">
                        <Shield size={20} className="text-emerald-500" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">JWT Authentication</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Sesi aman dengan token 24 jam</p>
                        </div>
                    </div>
                </div>

                {/* Tentang */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tentang</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-slate-700">
                        <Info size={20} className="text-slate-400" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Zamagi Kas</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Aplikasi pencatatan keuangan pribadi</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-4">
                        <Info size={20} className="text-slate-400" />
                        <div>
                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">Versi</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">1.0.0</p>
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/20 text-red-500 font-bold rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                >
                    <LogOut size={18} /> Logout
                </button>

            </div>
        </div>
    );
}