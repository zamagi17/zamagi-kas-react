import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Wallet, PieChart, Settings } from 'lucide-react';
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
    const [summary, setSummary] = useState({
        saldoAwal: 0, totalMasuk: 0, totalKeluar: 0,
        rencanaMasuk: 0, rencanaKeluar: 0, totalNetWorth: 0,
        hariIniMasuk: 0, hariIniKeluar: 0
    });
    const [portofolio, setPortofolio] = useState({});
    const [dataChartPengeluaran, setDataChartPengeluaran] = useState({});
    const [totalUtangAktif, setTotalUtangAktif] = useState(0);
    const [totalPiutangAktif, setTotalPiutangAktif] = useState(0);

    // === STATE DOMPET HARIAN ===
    const [dompetHarian, setDompetHarian] = useState([]);

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    // Fetch preferensi dompet harian
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
            // Panggil endpoint agregasi yang sama dengan halaman Laporan
            const res = await fetch(`${baseUrl}/api/transaksi/ringkasan?bulan=${filterBulan}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (res.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }

            const data = await res.json();

            // Set semua state langsung dari data yang sudah dikalkulasi Backend
            setSummary(data.summary);
            setPortofolio(data.portofolio);
            setDataChartPengeluaran(data.chartPengeluaran);

            // Fetch utang piutang (tetap dipertahankan karena pakai endpoint terpisah)
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

    const pengeluaranData = {
        labels: Object.keys(dataChartPengeluaran),
        datasets: [{
            data: Object.values(dataChartPengeluaran),
            backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e'],
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

    // === Hitung saldo & total dompet harian ===
    const dompetHarianData = dompetHarian.map(nama => ({
        nama,
        saldo: portofolio[nama] || 0
    }));
    const totalDompetHarian = dompetHarianData.reduce((acc, d) => acc + d.saldo, 0);

    // Warna badge per dompet
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
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-50">Dashboard</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Selamat datang, {currentUser} 👋</p>
                    </div>
                    <input
                        type="month"
                        value={filterBulan}
                        onChange={e => setFilterBulan(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {isLoading ? (
                    <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <div className="h-[400px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                        <div className="h-[400px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                        <div className="h-[300px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                        <div className="h-[300px] bg-slate-200 dark:bg-slate-700 rounded-xl w-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">

                        {/* === WIDGET DOMPET HARIAN === */}
                        {dompetHarian.length > 0 ? (
                            <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full">
                                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                    <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50">
                                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg text-white">
                                            <Wallet size={20} />
                                        </div>
                                        <span className="text-lg">Dompet Harian</span>
                                    </h3>
                                    <button
                                        onClick={() => navigate('/settings')}
                                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                    >
                                        <Settings size={13} />
                                        Atur
                                    </button>
                                </div>

                                {/* Total gabungan — highlight utama */}
                                <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 dark:from-blue-600 dark:via-blue-700 dark:to-cyan-600 rounded-xl p-4 md:p-6 mb-4 text-white shadow-inner">
                                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }}></div>
                                    <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide mb-1">
                                        {dompetHarianData.length === 1
                                            ? `💳 Dompet Utama (${dompetHarianData[0].nama})`
                                            : '💼 Total Dompet Harian'}
                                    </p>
                                    <p className="text-3xl md:text-4xl font-black tracking-tight">{formatRp(totalDompetHarian)}</p>
                                    {dompetHarianData.length > 1 && (
                                        <p className="text-blue-200 text-xs mt-1 font-medium">{dompetHarian.length} dompet aktif tergabung</p>
                                    )}
                                </div>

                                {/* Rincian per dompet (HANYA MUNCUL JIKA LEBIH DARI 1 DOMPET) */}
                                {dompetHarianData.length > 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {dompetHarianData.map((d, i) => {
                                            const warna = WARNA_DOMPET[i % WARNA_DOMPET.length];
                                            const persen = totalDompetHarian > 0
                                                ? Math.round((d.saldo / totalDompetHarian) * 100)
                                                : 0;
                                            return (
                                                <div key={d.nama} className={`${warna.bg} ${warna.border} border rounded-xl p-3.5 transition hover:shadow-sm`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${warna.dot}`}></div>
                                                        <p className={`text-xs font-bold truncate ${warna.text}`}>{d.nama}</p>
                                                    </div>
                                                    <p className={`text-base font-black ${d.saldo >= 0 ? warna.text : 'text-red-500 dark:text-red-400'}`}>
                                                        {formatRp(d.saldo)}
                                                    </p>
                                                    {totalDompetHarian > 0 && (
                                                        <div className="mt-2">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs text-slate-400 dark:text-slate-500">{persen}% dari total</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${warna.dot}`}
                                                                    style={{ width: `${Math.max(persen, 2)}%`, transition: 'width 0.6s ease' }}
                                                                ></div>
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
                            /* Jika belum setup dompet harian */
                            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                        <Wallet size={20} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Dompet Harian belum diatur</p>
                                        <p className="text-xs text-blue-500 dark:text-blue-400">Pilih dompet/rekening yang sering kamu gunakan untuk transaksi harian</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition"
                                >
                                    <Settings size={13} /> Atur Sekarang
                                </button>
                            </div>
                        )}

                        {/* Arus Kas -> Pemasukan & Pengeluaran */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 w-full min-w-0">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white">
                                    <PieChart size={20} />
                                </div>
                                <span className="text-lg">Pemasukan & Pengeluaran</span>
                            </h3>
                            <div className="space-y-4 w-full">
                                {/* Saldo Awal */}
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-600/30">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">Saldo Awal Bulan</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-100">{formatRp(summary.saldoAwal)}</span>
                                    </div>
                                </div>
                                {/* Masuk & Keluar */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700/30">
                                        <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-1">Masuk</p>
                                        <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">+ {formatRp(summary.totalMasuk)}</p>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700/30">
                                        <p className="text-red-700 dark:text-red-300 text-xs font-medium mb-1">Keluar</p>
                                        <p className="text-base font-bold text-red-600 dark:text-red-400">- {formatRp(summary.totalKeluar)}</p>
                                    </div>
                                </div>
                                {/* Sisa Kas -> Sisa Saldo */}
                                <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600 rounded-xl p-4 text-white shadow-lg">
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)' }}></div>
                                    <div className="relative flex justify-between items-center w-full">
                                        <div className="min-w-0">
                                            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wide mb-1">💰 Sisa Saldo / Uang</p>
                                            <p className="text-2xl md:text-3xl font-black tracking-tight truncate">{formatRp(sisaKas)}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Proyeksi */}
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
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-700/30">
                                        <p className="text-orange-600 dark:text-orange-400 text-xs font-medium mb-1">Estimasi Akhir Bulan</p>
                                        <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatRp(estimasiAkhir)}</p>
                                    </div>
                                </div>
                                {/* Hari ini */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">🗓️ Hari Ini</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700/30 overflow-hidden">
                                            <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-1 truncate">Masuk</p>
                                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">+ {formatRp(summary.hariIniMasuk)}</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700/30 overflow-hidden">
                                            <p className="text-red-700 dark:text-red-300 text-xs font-medium mb-1 truncate">Keluar</p>
                                            <p className="text-base font-bold text-red-600 dark:text-red-400 truncate">- {formatRp(summary.hariIniKeluar)}</p>
                                        </div>
                                    </div>
                                </div>
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
                                    ? <Doughnut data={pengeluaranData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: 500 } } } } }} />
                                    : <div className="text-center py-10"><p className="text-5xl mb-2">📊</p><p className="text-slate-400 dark:text-slate-500">Belum ada data pengeluaran</p></div>}
                            </div>
                        </div>

                        {/* Net Worth & Aset -> Ringkasan Saldo & Utang */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg text-white">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-lg">Ringkasan Saldo & Utang</span>
                            </h3>
                            <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2 flex-1 w-full">
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
                            {/* Summary net worth */}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                                {/* 1. Total Aset */}
                                <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                    <span className="text-emerald-900 dark:text-emerald-200 font-semibold text-sm">Total Saldo Dompet</span>
                                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatRp(summary.totalNetWorth)}</span>
                                </div>

                                {/* 2. Piutang Aktif (Uang kita di luar) */}
                                {totalPiutangAktif > 0 && (
                                    <div className="flex justify-between items-center px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                        <span className="text-blue-800 dark:text-blue-300 font-medium text-sm flex items-center gap-1.5">
                                            <span>🟢</span> Piutang (Uang Masuk Nanti)
                                        </span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">+ {formatRp(totalPiutangAktif)}</span>
                                    </div>
                                )}

                                {/* 3. Utang Aktif (Uang yang harus dibayar) */}
                                {totalUtangAktif > 0 && (
                                    <div className="flex justify-between items-center px-3 py-2 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-800/30">
                                        <span className="text-rose-800 dark:text-rose-300 font-medium text-sm flex items-center gap-1.5">
                                            <span>🔴</span> Utang (Harus Dibayar)
                                        </span>
                                        <span className="font-bold text-rose-600 dark:text-rose-400">- {formatRp(totalUtangAktif)}</span>
                                    </div>
                                )}

                                {/* 4. Net Bersih (Hanya muncul jika punya utang/piutang) */}
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

                        {/* Grafik Aset -> Sebaran Saldo Dompet */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col items-center">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg text-white">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-lg">Sebaran Saldo Dompet</span>
                            </h3>
                            <div className="relative w-full h-64 flex justify-center items-center">
                                {asetLabels.length > 0
                                    ? <Pie data={asetData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: 500 } } } } }} />
                                    : <div className="text-center py-10"><p className="text-5xl mb-2">💼</p><p className="text-slate-400 dark:text-slate-500">Belum ada saldo dompet</p></div>}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}