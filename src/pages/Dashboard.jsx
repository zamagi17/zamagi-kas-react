import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Wallet, PieChart, Settings, LayoutDashboard, Eye, EyeOff, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
    const navigate = useNavigate();
    const currentUser = localStorage.getItem('username');
    const token = localStorage.getItem('token');

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');

    const [filterBulan, setFilterBulan] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaldoHidden, setIsSaldoHidden] = useState(false);

    const [summary, setSummary] = useState({
        saldoAwal: 0, totalMasuk: 0, totalKeluar: 0,
        rencanaMasuk: 0, rencanaKeluar: 0, totalNetWorth: 0,
        hariIniMasuk: 0, hariIniKeluar: 0
    });
    const [portofolio, setPortofolio] = useState({});
    const [dataChartPengeluaran, setDataChartPengeluaran] = useState({});
    const [totalUtangAktif, setTotalUtangAktif] = useState(0);
    const [totalPiutangAktif, setTotalPiutangAktif] = useState(0);

    const [dompetHarian, setDompetHarian] = useState([]);

    // Helper: Format Rupiah dengan fitur Sensor (Hidden)
    const formatRp = (angka) => {
        if (isSaldoHidden) return 'Rp •••••••••';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency', currency: 'IDR', minimumFractionDigits: 0
        }).format(angka || 0);
    };

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    useEffect(() => {
        if (!token) return;
        fetch(`${baseUrl}/api/user/preferences`, {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.dompetHarian) setDompetHarian(data.dompetHarian);
            })
            .catch(() => { });
    }, [token]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${baseUrl}/api/transaksi/ringkasan?bulan=${filterBulan}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }

            const data = await res.json();
            setSummary(data.summary);
            setPortofolio(data.portofolio);
            setDataChartPengeluaran(data.chartPengeluaran);

            try {
                const resUP = await fetch(`${baseUrl}/api/utang-piutang`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (resUP.ok) {
                    const dataUP = await resUP.json();
                    const utangAktif = dataUP
                        .filter(d => d.jenis === 'Utang' && d.status === 'Belum Lunas')
                        .reduce((acc, d) => acc + (d.sisaTagihan || 0), 0);
                    const piutangAktif = dataUP
                        .filter(d => d.jenis === 'Piutang' && d.status === 'Belum Lunas')
                        .reduce((acc, d) => acc + (d.sisaTagihan || 0), 0);
                    setTotalUtangAktif(utangAktif);
                    setTotalPiutangAktif(piutangAktif);
                }
            } catch (nestedErr) {
                setTotalUtangAktif(0);
                setTotalPiutangAktif(0);
            }

        } catch (err) {
            console.error("Error fetching dashboard:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, [filterBulan, token]);

    const sisaKas = (summary.saldoAwal + summary.totalMasuk) - summary.totalKeluar;
    const estimasiAkhir = sisaKas + summary.rencanaMasuk - summary.rencanaKeluar;

    // Sembunyikan label Chart jika mode sensor aktif
    const customTooltips = isSaldoHidden ? {
        callbacks: { label: function() { return 'Rp •••••••••'; } }
    } : {};

    const pengeluaranData = {
        labels: Object.keys(dataChartPengeluaran),
        datasets: [{
            data: Object.values(dataChartPengeluaran),
            backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e', '#e67e22', '#1abc9c'],
            borderWidth: 0, hoverOffset: 4
        }]
    };

    const asetLabels = [], asetValues = [];
    for (const [k, v] of Object.entries(portofolio)) {
        if (v > 0) { asetLabels.push(k); asetValues.push(v); }
    }
    const asetData = {
        labels: asetLabels,
        datasets: [{
            data: asetValues,
            backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#e74c3c', '#9b59b6'],
            borderWidth: 0, hoverOffset: 4
        }]
    };

    const dompetHarianData = dompetHarian.map(nama => ({
        nama,
        saldo: portofolio[nama] || 0
    }));
    const totalDompetHarian = dompetHarianData.reduce((acc, d) => acc + d.saldo, 0);

    const WARNA_DOMPET = [
        { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700/50', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-400' },
        { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-700/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400' },
        { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-700/50', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-400' },
        { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
        { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-700/50', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-400' },
        { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-700/50', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-400' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg text-white shadow-sm">
                            <LayoutDashboard size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-50">Dashboard</h2>
                            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Selamat datang, {currentUser} 👋</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                            type="month"
                            value={filterBulan}
                            onChange={e => setFilterBulan(e.target.value)}
                            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <div className="h-[200px] md:col-span-2 bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                        <div className="h-[400px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                        <div className="h-[400px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

                        {/* === WIDGET DOMPET HARIAN === */}
                        {dompetHarian.length > 0 ? (
                            <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full flex flex-col">
                                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                    <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50">
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg text-white">
                                            <Wallet size={18} />
                                        </div>
                                        <span>Dompet Harian</span>
                                    </h3>
                                    <button
                                        onClick={() => navigate('/settings')}
                                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <Settings size={13} /> Atur
                                    </button>
                                </div>

                                {/* Highlight Utama + Tombol Mata */}
                                <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 dark:from-blue-600 dark:via-blue-700 dark:to-cyan-600 rounded-xl p-5 mb-5 text-white shadow-inner flex justify-between items-center">
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}></div>
                                    <div className="relative z-10 min-w-0">
                                        <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide mb-1">
                                            {dompetHarianData.length === 1 ? `💳 Dompet Utama (${dompetHarianData[0].nama})` : '💼 Total Dompet Harian'}
                                        </p>
                                        <p className="text-3xl md:text-4xl font-black tracking-tight truncate">{formatRp(totalDompetHarian)}</p>
                                        {dompetHarianData.length > 1 && (
                                            <p className="text-blue-200 text-xs mt-1 font-medium">{dompetHarian.length} dompet aktif tergabung</p>
                                        )}
                                    </div>
                                    {/* Tombol Mata (Hidden Saldo) */}
                                    <button 
                                        onClick={() => setIsSaldoHidden(!isSaldoHidden)} 
                                        className="relative z-10 shrink-0 ml-3 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-all active:scale-95 border border-white/10"
                                        title={isSaldoHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                                    >
                                        {isSaldoHidden ? <EyeOff size={24} /> : <Eye size={24} />}
                                    </button>
                                </div>

                                {/* Rincian per dompet */}
                                {dompetHarianData.length > 1 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-auto">
                                        {dompetHarianData.map((d, i) => {
                                            const warna = WARNA_DOMPET[i % WARNA_DOMPET.length];
                                            const persen = totalDompetHarian > 0 ? Math.round((d.saldo / totalDompetHarian) * 100) : 0;
                                            return (
                                                <div key={d.nama} className={`${warna.bg} ${warna.border} border rounded-xl p-3.5 transition hover:shadow-sm`}>
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${warna.dot}`}></div>
                                                        <p className={`text-xs font-bold truncate ${warna.text}`}>{d.nama}</p>
                                                    </div>
                                                    <p className={`text-base font-black truncate ${d.saldo >= 0 ? warna.text : 'text-red-500 dark:text-red-400'}`}>
                                                        {formatRp(d.saldo)}
                                                    </p>
                                                    {totalDompetHarian > 0 && !isSaldoHidden && (
                                                        <div className="mt-2">
                                                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full ${warna.dot}`} style={{ width: `${Math.max(persen, 2)}%`, transition: 'width 0.6s ease' }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl shrink-0">
                                        <Wallet size={24} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-800 dark:text-blue-200">Dompet Harian belum diatur</p>
                                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Pilih aset yang sering kamu gunakan di menu Setting.</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/settings')} className="shrink-0 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition">
                                    Atur Sekarang
                                </button>
                            </div>
                        )}

                        {/* === WIDGET HARI INI (Full Width) === */}
                        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full flex flex-col">
                            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50">
                                    <div className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg text-white">
                                        <Calendar size={18} />
                                    </div>
                                    <span>Transaksi Hari Ini</span>
                                </h3>
                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                    {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-xl border border-emerald-200 dark:border-emerald-700/30 flex items-center justify-between transition hover:shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl">↓</div>
                                        <div>
                                            <span className="text-emerald-700 dark:text-emerald-300 font-bold block text-sm">Uang Masuk</span>
                                            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest font-semibold">Hari ini</span>
                                        </div>
                                    </div>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl md:text-2xl truncate max-w-[50%] text-right">+ {formatRp(summary.hariIniMasuk)}</span>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-200 dark:border-red-700/30 flex items-center justify-between transition hover:shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xl">↑</div>
                                        <div>
                                            <span className="text-red-700 dark:text-red-300 font-bold block text-sm">Uang Keluar</span>
                                            <span className="text-[10px] text-red-600/70 dark:text-red-400/70 uppercase tracking-widest font-semibold">Hari ini</span>
                                        </div>
                                    </div>
                                    <span className="font-black text-red-600 dark:text-red-400 text-xl md:text-2xl truncate max-w-[50%] text-right">- {formatRp(summary.hariIniKeluar)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Kalkulasi Bulan Ini */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white">
                                    <PieChart size={20} />
                                </div>
                                <span className="text-lg">Kalkulasi Bulan Ini</span>
                            </h3>
                            <div className="space-y-4 w-full">
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-600/30 flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Saldo Awal Bulan</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatRp(summary.saldoAwal)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700/30">
                                        <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-1">Total Masuk</p>
                                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">+ {formatRp(summary.totalMasuk)}</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700/30">
                                        <p className="text-red-700 dark:text-red-300 text-xs font-medium mb-1">Total Keluar</p>
                                        <p className="text-base font-bold text-red-600 dark:text-red-400 truncate">- {formatRp(summary.totalKeluar)}</p>
                                    </div>
                                </div>
                                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600 rounded-xl p-4 text-white shadow-lg">
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)' }}></div>
                                    <div className="relative flex justify-between items-center w-full">
                                        <div className="min-w-0">
                                            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wide mb-1">💰 Sisa Saldo Bulan Ini</p>
                                            <p className="text-2xl font-black tracking-tight truncate">{formatRp(sisaKas)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">📊 Rencana & Proyeksi</p>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="text-sm overflow-hidden">
                                            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mb-1 truncate">Rencana Masuk</p>
                                            <p className="text-base font-bold text-orange-600 dark:text-orange-400 truncate">+ {formatRp(summary.rencanaMasuk)}</p>
                                        </div>
                                        <div className="text-sm overflow-hidden">
                                            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mb-1 truncate">Rencana Keluar</p>
                                            <p className="text-base font-bold text-orange-600 dark:text-orange-400 truncate">- {formatRp(summary.rencanaKeluar)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-700/30 flex justify-between items-center">
                                        <p className="text-orange-600 dark:text-orange-400 text-xs font-medium">Estimasi Akhir Bulan</p>
                                        <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{formatRp(estimasiAkhir)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ringkasan Saldo & Utang */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg text-white">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-lg">Ringkasan Saldo & Utang</span>
                            </h3>
                            <div className="space-y-2 text-sm max-h-[22rem] overflow-y-auto pr-2 flex-1 w-full">
                                {Object.entries(portofolio).map(([aset, nilai]) => (
                                    nilai !== 0 && (
                                        <div key={aset} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                                            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                {dompetHarian.includes(aset) && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                                                )}
                                                {aset}
                                            </span>
                                            <span className={`font-bold ${nilai >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {formatRp(nilai)}
                                            </span>
                                        </div>
                                    )
                                ))}
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                    <span className="text-emerald-900 dark:text-emerald-200 font-semibold text-sm">Total Semua Dompet</span>
                                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatRp(summary.totalNetWorth)}</span>
                                </div>

                                {totalPiutangAktif > 0 && (
                                    <div className="flex justify-between items-center px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                        <span className="text-blue-800 dark:text-blue-300 font-medium text-sm flex items-center gap-1.5">
                                            <span>🟢</span> Piutang (Uang Masuk Nanti)
                                        </span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">+ {formatRp(totalPiutangAktif)}</span>
                                    </div>
                                )}

                                {totalUtangAktif > 0 && (
                                    <div className="flex justify-between items-center px-3 py-2 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-800/30">
                                        <span className="text-rose-800 dark:text-rose-300 font-medium text-sm flex items-center gap-1.5">
                                            <span>🔴</span> Utang (Harus Dibayar)
                                        </span>
                                        <span className="font-bold text-rose-600 dark:text-rose-400">- {formatRp(totalUtangAktif)}</span>
                                    </div>
                                )}

                                {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                    <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700/50 mt-1 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="text-indigo-900 dark:text-indigo-200 font-bold text-sm">Kekayaan Bersih</span>
                                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400">Saldo + Piutang - Utang</span>
                                        </div>
                                        <span className="text-xl font-black text-indigo-700 dark:text-indigo-300">
                                            {formatRp(summary.totalNetWorth + totalPiutangAktif - totalUtangAktif)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Grafik Pengeluaran */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col items-center">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg text-white">
                                    <PieChart size={20} />
                                </div>
                                <span className="text-lg">Sebaran Pengeluaran</span>
                            </h3>
                            <div className="relative w-full h-64 flex justify-center items-center">
                                {Object.keys(dataChartPengeluaran).length > 0
                                    ? <Doughnut data={pengeluaranData} options={{ maintainAspectRatio: false, plugins: { tooltip: customTooltips, legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: 500 } } } } }} />
                                    : <div className="text-center py-10"><p className="text-5xl mb-2">📊</p><p className="text-slate-400 dark:text-slate-500">Belum ada data pengeluaran</p></div>}
                            </div>
                        </div>

                        {/* Grafik Aset */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col items-center">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg text-white">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-lg">Sebaran Saldo Dompet</span>
                            </h3>
                            <div className="relative w-full h-64 flex justify-center items-center">
                                {asetLabels.length > 0
                                    ? <Pie data={asetData} options={{ maintainAspectRatio: false, plugins: { tooltip: customTooltips, legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: 500 } } } } }} />
                                    : <div className="text-center py-10"><p className="text-5xl mb-2">💼</p><p className="text-slate-400 dark:text-slate-500">Belum ada saldo dompet</p></div>}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}