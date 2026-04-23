import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, HandCoins, FileText, Settings, Target, PiggyBank } from 'lucide-react';

const menus = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
    { path: '/utang-piutang', label: 'Utang Piutang', icon: HandCoins },
    { path: '/budget', label: 'Budget', icon: Target },
    { path: '/tabungan', label: 'Tabungan', icon: PiggyBank },
    { path: '/laporan', label: 'Laporan', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = localStorage.getItem('username');

    return (
        <>
            {/* TOP BAR — Desktop */}
            <nav className="hidden md:flex items-center justify-center relative bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 px-6 py-3 shadow-sm sticky top-0 z-50">
                {/* Logo */}
                <div className="absolute left-6 flex items-center gap-2">
                    <span className="text-blue-500 font-black text-xl tracking-tight">
                        ZonaKas
                    </span>
                    <span className="text-xs text-slate-400 dark:text-gray-500 font-medium">
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
                                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* BOTTOM BAR — Mobile */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 shadow-lg z-50">
                <div className="flex">
                    {menus.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => navigate(path)}
                            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition
                                ${location.pathname === path
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900'
                                    : 'text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <Icon size={18} />
                            {label}
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
}
