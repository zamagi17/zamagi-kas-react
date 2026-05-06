import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LayoutDashboard, ArrowLeftRight, HandCoins, FileText, Settings,
    Target, Landmark, CalendarClock, MoreHorizontal, ShieldCheck, X,
    Bell, AlertTriangle, CheckCircle2
} from 'lucide-react';

const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');

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
    const token = localStorage.getItem('token');
    const [showMore, setShowMore] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const headers = useMemo(() => ({
        'Authorization': 'Bearer ' + token,
    }), [token]);

    const isMoreActive = mobileMoreMenus.some(menu => menu.path === location.pathname);
    const unreadCount = notifications.length;

    const goTo = (path) => {
        navigate(path);
        setShowMore(false);
        setShowNotifications(false);
    };

    const fetchNotifications = useCallback(async (signal) => {
        if (!token) {
            setNotifications([]);
            return;
        }

        const res = await fetch(`${baseUrl}/api/notifications`, { headers, signal });
        if (res.ok) {
            setNotifications(await res.json());
        }
    }, [headers, token]);

    useEffect(() => {
        const controller = new AbortController();
        const timerId = setTimeout(() => {
            fetchNotifications(controller.signal).catch((err) => {
                if (err.name !== 'AbortError') setNotifications([]);
            });
        }, 0);

        return () => {
            clearTimeout(timerId);
            controller.abort();
        };
    }, [fetchNotifications, location.pathname]);

    const markAsRead = async (id) => {
        try {
            await fetch(`${baseUrl}/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers,
            });
            setNotifications(prev => prev.filter(item => item.id !== id));
        } catch {
            // Non-blocking: navigation should still feel instant.
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${baseUrl}/api/notifications/read-all`, {
                method: 'PATCH',
                headers,
            });
            setNotifications([]);
        } catch {
            setNotifications([]);
        }
    };

    const openNotification = async (notification) => {
        await markAsRead(notification.id);
        goTo(notification.targetUrl || '/dashboard');
    };

    const renderNotificationBell = (compact = false) => (
        <button
            onClick={() => setShowNotifications(true)}
            className={`${compact ? 'w-10 h-10' : 'w-full px-3 py-2.5'} relative flex items-center ${compact ? 'justify-center' : 'gap-3'} rounded-lg text-sm font-semibold transition text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-200`}
            title="Notifikasi"
        >
            <Bell size={18} className="shrink-0" />
            {!compact && <span>Notifikasi</span>}
            {unreadCount > 0 && (
                <span className={`${compact ? 'absolute -top-1 -right-1' : 'ml-auto'} min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center`}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );

    const getNotificationTone = (severity) => {
        if (severity === 'danger') {
            return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
        }
        if (severity === 'warning') {
            return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
        }
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    };

    return (
        <>
            <aside className="desktop-sidebar-nav hidden md:flex fixed inset-y-0 left-0 z-50 w-64 flex-col bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700 shadow-sm">
                <div className="px-5 py-5 border-b border-slate-200 dark:border-gray-800">
                    <div className="flex items-center justify-between gap-3">
                        <span className="block text-blue-500 font-black text-2xl tracking-tight">
                            ZonaKas
                        </span>
                        {renderNotificationBell(true)}
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    {menus.map((menu) => {
                        const MenuIcon = menu.icon;
                        return (
                        <button
                            key={menu.path}
                            onClick={() => goTo(menu.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition
                                ${location.pathname === menu.path
                                    ? 'bg-blue-50 dark:bg-blue-900/70 text-blue-600 dark:text-blue-300'
                                    : 'text-slate-500 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <MenuIcon size={18} className="shrink-0" />
                            {menu.label}
                        </button>
                    )})}
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
                    {mobilePrimaryMenus.map((menu) => {
                        const MenuIcon = menu.icon;
                        return (
                        <button
                            key={menu.path}
                            onClick={() => goTo(menu.path)}
                            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition
                                ${location.pathname === menu.path
                                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900'
                                    : 'text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <MenuIcon size={18} />
                            {menu.label}
                        </button>
                    )})}
                    <button
                        onClick={() => setShowMore(true)}
                        className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-semibold transition
                            ${isMoreActive || showMore
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900'
                                : 'text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-300'
                            }`}
                    >
                        <span className="relative">
                            <MoreHorizontal size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </span>
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

                        <button
                            onClick={() => { setShowMore(false); setShowNotifications(true); }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-left mb-2"
                        >
                            <Bell size={18} />
                            <span className="text-sm font-bold flex-1">Notifikasi</span>
                            {unreadCount > 0 && (
                                <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            {mobileMoreMenus.map((menu) => {
                                const MenuIcon = menu.icon;
                                return (
                                <button
                                    key={menu.path}
                                    onClick={() => goTo(menu.path)}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition
                                        ${location.pathname === menu.path
                                            ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    <MenuIcon size={18} className="shrink-0" />
                                    <span className="text-sm font-bold leading-tight">{menu.label}</span>
                                </button>
                            )})}
                        </div>
                    </div>
                </div>
            )}

            {showNotifications && (
                <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm" onClick={() => setShowNotifications(false)}>
                    <div
                        className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase">In-App</p>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Notifikasi</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {notifications.length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                                    >
                                        Tandai dibaca
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300"
                                    title="Tutup"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {notifications.length === 0 ? (
                                <div className="h-full min-h-72 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
                                    <CheckCircle2 size={42} className="mb-3 text-emerald-500" />
                                    <p className="font-bold text-slate-600 dark:text-slate-300">Semua aman</p>
                                    <p className="text-sm mt-1">Belum ada notifikasi baru.</p>
                                </div>
                            ) : notifications.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => openNotification(item)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition ${getNotificationTone(item.severity)}`}
                                >
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black">{item.title}</span>
                                        <span className="block text-xs mt-1 opacity-90">{item.message}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
