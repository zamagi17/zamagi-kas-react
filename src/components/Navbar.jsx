import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, HandCoins, FileText, LogOut } from 'lucide-react';

const menus = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
    { path: '/utang-piutang', label: 'Utang Piutang', icon: HandCoins },
    { path: '/laporan', label: 'Laporan', icon: FileText },
];

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = localStorage.getItem('username');

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <>
            {/* TOP BAR — Desktop */}
            <nav className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-6 py-3 shadow-sm sticky top-0 z-50">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <span className="text-blue-500 font-black text-xl tracking-tight">
                        Zamagi Kas
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                        — {currentUser}
                    </span>
                </div>

                {/* Menu */}
                <div className="flex items-center gap-1">
                    {menus.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition
                                ${location.pathname === path
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 font-semibold text-sm rounded-lg hover:bg-red-100 transition"
                >
                    <LogOut size={16} /> Logout
                </button>
            </nav>

            {/* BOTTOM BAR — Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50">
                <div className="flex">
                    {menus.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-semibold transition
                                ${location.pathname === path
                                    ? 'text-blue-600 bg-blue-50'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Icon size={20} />
                            {label}
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
}