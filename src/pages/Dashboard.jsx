import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Wallet, PieChart } from 'lucide-react';
import Navbar from '../components/Navbar';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
    const navigate = useNavigate();
    const currentUser = localStorage.getItem('username');
    const token = localStorage.getItem('token');

    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8081').replace(/\/+$/, '');
    const API_URL = `${baseUrl}/api/transaksi`;

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

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    const fetchDashboardData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }

            const data = await res.json();
            let [fYear, fMonth] = filterBulan.split('-');
            let sAwal = 0, tMasuk = 0, tKeluar = 0, rMasuk = 0, rKeluar = 0,
                netWorth = 0, hMasuk = 0, hKeluar = 0;
            let portoAllTime = {};
            let chartPengeluaranBulanan = {};

            const nowWIB = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
            const todayDateStr = `${nowWIB.getFullYear()}-${String(nowWIB.getMonth() + 1).padStart(2, '0')}-${String(nowWIB.getDate()).padStart(2, '0')}`;

            data.forEach(row => {
                let rowDate = new Date(row.tanggal);
                let rYear = rowDate.getFullYear().toString();
                let rMonth = (rowDate.getMonth() + 1).toString().padStart(2, '0');
                let nom = row.nominal || 0;
                let sumber = row.sumberDana || 'Lain-lain';

                if (row.jenis === 'Pemasukan') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] += nom;
                    netWorth += nom;
                } else if (row.jenis === 'Pengeluaran') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] -= nom;
                    netWorth -= nom;
                }
                else if (row.jenis === 'Utang Masuk') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] += nom;
                }
                else if (row.jenis === 'Piutang Keluar') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] -= nom;
                }
                else if (row.jenis === 'Bayar Utang') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] -= nom;
                }
                else if (row.jenis === 'Terima Piutang') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] += nom;
                }

                const isTransferOrMutasi = row.kategori === "Transfer Aset (Auto)" &&
                    (row.keterangan && (row.keterangan.includes("Mutasi Masuk") || row.keterangan.includes("Mutasi Keluar")));

                if (rYear < fYear || (rYear === fYear && rMonth < fMonth)) {
                    if (row.jenis === 'Pemasukan') sAwal += nom;
                    else if (row.jenis === 'Pengeluaran') sAwal -= nom;
                } else if (rYear === fYear && rMonth === fMonth) {
                    if (row.jenis === 'Pemasukan' && !isTransferOrMutasi) tMasuk += nom;
                    else if (row.jenis === 'Pengeluaran') {
                        if (!isTransferOrMutasi) tKeluar += nom;
                        if (row.kategori !== "Transfer Aset (Auto)")
                            chartPengeluaranBulanan[row.kategori] = (chartPengeluaranBulanan[row.kategori] || 0) + nom;
                    }
                    else if (row.jenis === 'Rencana Pemasukan') rMasuk += nom;
                    else if (row.jenis === 'Rencana Pengeluaran') rKeluar += nom;

                    if (row.tanggal === todayDateStr && row.kategori !== "Transfer Aset (Auto)") {
                        if (row.jenis === 'Pemasukan') hMasuk += nom;
                        else if (row.jenis === 'Pengeluaran') hKeluar += nom;
                    }
                }
            });

            setSummary({
                saldoAwal: sAwal, totalMasuk: tMasuk, totalKeluar: tKeluar,
                rencanaMasuk: rMasuk, rencanaKeluar: rKeluar, totalNetWorth: netWorth,
                hariIniMasuk: hMasuk, hariIniKeluar: hKeluar
            });
            setPortofolio(portoAllTime);
            setDataChartPengeluaran(chartPengeluaranBulanan);

            try {
                const resUP = await fetch(`${baseUrl}/api/utang-piutang`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (resUP.status === 401) {
                    localStorage.clear();
                    navigate('/');
                    return;
                }

                if (!resUP.ok) {
                    setTotalUtangAktif(0);
                    setTotalPiutangAktif(0);
                } else {
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
                console.error('Error fetching utang-piutang:', nestedErr);
                setTotalUtangAktif(0);
                setTotalPiutangAktif(0);
            }

        } catch (err) {
            console.error("Error:", err);
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
            backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e67e22', '#9b59b6'],
            borderWidth: 0, hoverOffset: 4
        }]
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6 overflow-x-hidden">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 w-full">

                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl shadow-lg dark:shadow-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-900 p-6 md:p-8 text-white border border-blue-400/30 dark:border-blue-700/30 w-full min-w-0">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(255,255,255) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="w-full">
                            <p className="text-blue-100 text-sm font-medium mb-1">Selamat datang kembali</p>
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-2 break-words">Ringkasan Keuangan Anda</h2>
                            <p className="text-blue-50 text-sm">Pantau performa finansial Anda secara real-time</p>
                        </div>
                        <input
                            type="month" value={filterBulan}
                            onChange={(e) => setFilterBulan(e.target.value)}
                            className="w-full md:w-auto px-4 py-3 rounded-xl border border-blue-300/30 dark:border-blue-600/30 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-400 outline-none bg-white/10 dark:bg-white/5 text-white placeholder-blue-100 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-white/10 transition"
                        />
                    </div>
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

                        {/* Arus Kas */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 w-full min-w-0">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50">
                                <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg text-white">
                                    <PieChart size={20} />
                                </div>
                                <span className="text-lg">Arus Kas & Budget</span>
                            </h3>
                            <div className="space-y-4 w-full">
                                {/* Saldo Awal */}
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-600/30">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Saldo Awal</span>
                                        <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatRp(summary.saldoAwal)}</span>
                                    </div>
                                </div>

                                {/* Masuk & Keluar */}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 p-4 rounded-xl border border-emerald-200/50 dark:border-emerald-700/30 w-full overflow-hidden">
                                        <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-1 truncate">Total Masuk</p>
                                        <p className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">+ {formatRp(summary.totalMasuk)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20 p-4 rounded-xl border border-red-200/50 dark:border-red-700/30 w-full overflow-hidden">
                                        <p className="text-red-700 dark:text-red-300 text-xs font-medium mb-1 truncate">Total Keluar</p>
                                        <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 truncate">- {formatRp(summary.totalKeluar)}</p>
                                    </div>
                                </div>

                                {/* Main CTA: Sisa Kas */}
                                <div className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-600 dark:via-teal-600 dark:to-cyan-600 text-white shadow-lg w-full">
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)' }}></div>
                                    <div className="relative flex justify-between items-center w-full">
                                        <div className="min-w-0">
                                            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wide mb-1">💰 Sisa Kas</p>
                                            <p className="text-2xl md:text-3xl font-black tracking-tight truncate">{formatRp(sisaKas)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Proyeksi Kas */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">📊 Proyeksi Kas</p>
                                    <div className="grid grid-cols-2 gap-3 mb-3 w-full">
                                        <div className="text-sm overflow-hidden">
                                            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mb-1 truncate">Rencana Masuk</p>
                                            <p className="text-base md:text-lg font-bold text-orange-600 dark:text-orange-400 truncate">+ {formatRp(summary.rencanaMasuk)}</p>
                                        </div>
                                        <div className="text-sm overflow-hidden">
                                            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium mb-1 truncate">Rencana Keluar</p>
                                            <p className="text-base md:text-lg font-bold text-orange-600 dark:text-orange-400 truncate">- {formatRp(summary.rencanaKeluar)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 p-3 rounded-lg border border-orange-200 dark:border-orange-700/30">
                                        <div className="flex justify-between items-center">
                                            <span className="text-orange-900 dark:text-orange-200 font-semibold text-sm">Estimasi Akhir</span>
                                            <span className="text-lg font-bold text-orange-700 dark:text-orange-300">{formatRp(estimasiAkhir)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ringkasan Hari Ini */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-2">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">📅 Hari Ini</p>
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700/30 overflow-hidden">
                                            <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-1 truncate">Masuk</p>
                                            <p className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">+ {formatRp(summary.hariIniMasuk)}</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700/30 overflow-hidden">
                                            <p className="text-red-700 dark:text-red-300 text-xs font-medium mb-1 truncate">Keluar</p>
                                            <p className="text-base md:text-lg font-bold text-red-600 dark:text-red-400 truncate">- {formatRp(summary.hariIniKeluar)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grafik Pengeluaran */}
                        {/* PERBAIKAN CARD: Menambahkan w-full, min-w-0 */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col items-center">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg text-white">
                                    <PieChart size={20} />
                                </div>
                                <span className="text-lg">Sebaran Pengeluaran Riil</span>
                            </h3>
                            {/* PERBAIKAN CHART: Menambahkan relative pada div canvas */}
                            <div className="relative w-full h-64 flex justify-center items-center">
                                {Object.keys(dataChartPengeluaran).length > 0
                                    ? <Doughnut data={pengeluaranData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: 500 } } } } }} />
                                    : <div className="text-center py-10"><p className="text-5xl mb-2">📊</p><p className="text-slate-400 dark:text-slate-500">Belum ada data pengeluaran</p></div>}
                            </div>
                        </div>

                        {/* Net Worth */}
                        {/* PERBAIKAN CARD: w-full, min-w-0 */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg text-white">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-lg">Net Worth & Aset</span>
                            </h3>
                            <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2 flex-1 w-full">
                                {Object.entries(portofolio).map(([aset, nilai]) => (
                                    nilai !== 0 && (
                                        <div key={aset} className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-700/50 rounded-lg border border-slate-200/50 dark:border-slate-600/30">
                                            <span className="text-slate-700 dark:text-slate-300 truncate font-medium mr-2">{aset}</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatRp(nilai)}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                            <div className="flex justify-between items-center p-5 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-700 dark:via-purple-700 dark:to-indigo-700 mt-4 rounded-xl text-white shadow-lg w-full">
                                <div className="min-w-0">
                                    <p className="text-violet-100 text-xs font-semibold uppercase tracking-wide mb-1">💎 Total Net Worth</p>
                                    <p className="text-2xl font-black tracking-tight truncate">{formatRp(summary.totalNetWorth)}</p>
                                </div>
                            </div>

                            {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3 w-full">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">⚖️ Analisis Utang & Piutang</p>
                                    <div className="grid grid-cols-2 gap-2 w-full">
                                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700/30 overflow-hidden">
                                            <p className="text-red-700 dark:text-red-300 text-xs font-medium mb-1 truncate">Utang Aktif</p>
                                            <p className="text-base md:text-lg font-bold text-red-600 dark:text-red-400 truncate">- {formatRp(totalUtangAktif)}</p>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700/30 overflow-hidden">
                                            <p className="text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-1 truncate">Piutang Aktif</p>
                                            <p className="text-base md:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">+ {formatRp(totalPiutangAktif)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-700/30">
                                        <div className="flex justify-between items-center">
                                            <span className="text-indigo-900 dark:text-indigo-200 font-semibold text-sm">Net Bersih</span>
                                            <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatRp(summary.totalNetWorth + totalPiutangAktif - totalUtangAktif)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Grafik Aset */}
                        {/* PERBAIKAN CARD: w-full, min-w-0 */}
                        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-lg dark:shadow-xl border border-slate-200/50 dark:border-slate-700/50 w-full min-w-0 flex flex-col items-center">
                            <h3 className="flex items-center gap-3 font-bold text-slate-800 dark:text-slate-50 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700/50 w-full">
                                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg text-white">
                                    <Wallet size={20} />
                                </div>
                                <span className="text-lg">Alokasi Aset Anda</span>
                            </h3>
                            {/* PERBAIKAN CHART: Menambahkan relative pada div canvas */}
                            <div className="relative w-full h-64 flex justify-center items-center">
                                {asetLabels.length > 0
                                    ? <Pie data={asetData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12, weight: 500 } } } } }} />
                                    : <div className="text-center py-10"><p className="text-5xl mb-2">💼</p><p className="text-slate-400 dark:text-slate-500">Belum ada aset</p></div>}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}