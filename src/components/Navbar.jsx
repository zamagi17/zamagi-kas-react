import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
    LayoutDashboard, ArrowLeftRight, HandCoins, FileText, Settings,
    Target, Landmark, CalendarClock, MoreHorizontal, ShieldCheck, X
} from 'lucide-react';

const menus = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
    { path: '/utang-piutang', label: 'Utang Piutang', icon: HandCoins },
    { path: '/budget', label: 'Budget', icon: Target },
    { path: '/tabungan', label: 'Tabungan', icon: Landmark },
    { path: '/schedule', label: 'Schedule', icon: CalendarClock },
    { path: '/laporan', label: 'Laporan', icon: FileText },
    { path: '/settings', label: 'Settings', icon: Settings },
];

const mobilePrimaryMenus = menus.filter(menu =>
    ['/dashboard', '/transaksi', '/budget', '/schedule'].includes(menu.path)
);

const mobileMoreMenus = menus.filter(menu =>
    !mobilePrimaryMenus.some(primary => primary.path === menu.path)
);

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = localStorage.getItem('username');
    const [showMore, setShowMore] = useState(false);

    const goTo = (path) => {
        navigate(path);
        setShowMore(false);
    };

    const isMoreActive = mobileMoreMenus.some(menu => menu.path === location.pathname);

    return (
        <>
            <aside className="desktop-sidebar-nav hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="px-5 py-5 border-b border-slate-200 dark:border-gray-800">
                    <span className="block text-blue-500 font-black text-2xl tracking-tight">
                        ZonaKas
                    </span>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {menus.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => goTo(path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition
                                ${location.pathname === path
                                    ? 'bg-blue-50 dark:bg-blue-900/70 text-blue-600 dark:text-blue-300'
                                    : 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <Icon size={18} className="shrink-0" />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="px-4 py-4 border-t border-slate-200 dark:border-gray-800">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 px-3 py-3">
                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Login sebagai</p>
                        <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{currentUser}</p>
                    </div>
                </div>
            </aside>

            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-700 shadow-lg z-50">
                <div className="flex">
                    {mobilePrimaryMenus.map(({ path, label, icon: Icon }) => (
                        <button
                            key={path}
                            onClick={() => goTo(path)}
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
                    <button
                        onClick={() => setShowMore(true)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition
                            ${isMoreActive || showMore
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900'
                                : 'text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <MoreHorizontal size={18} />
                        Lainnya
                    </button>
                </div>
            </nav>

            {showMore && (
                <div className="md:hidden fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowMore(false)}>
                    <div
                        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-2xl p-4 pb-6"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">Menu</p>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Lainnya</h3>
                            </div>
                            <button
                                onClick={() => setShowMore(false)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300"
                                title="Tutup"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {mobileMoreMenus.map(({ path, label, icon: Icon }) => (
                                <button
                                    key={path}
                                    onClick={() => goTo(path)}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition
                                        ${location.pathname === path
                                            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <Icon size={18} className="shrink-0" />
                                    <span className="text-sm font-bold leading-tight">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
