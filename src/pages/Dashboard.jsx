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

                // Kalkulasi Portofolio & Net Worth
                // Pemasukan/Pengeluaran biasa → masuk portofolio & net worth
                if (row.jenis === 'Pemasukan') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] += nom;
                    netWorth += nom;
                } else if (row.jenis === 'Pengeluaran') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] -= nom;
                    netWorth -= nom;
                }
                // Utang masuk → saldo aset bertambah, tapi net worth TIDAK bertambah (ini kewajiban)
                else if (row.jenis === 'Utang Masuk') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] += nom; // Saldo aset bertambah
                    // netWorth tidak berubah karena ini kewajiban
                }

                // Piutang keluar → saldo aset berkurang, tapi net worth TIDAK berkurang (ini aset piutang)
                else if (row.jenis === 'Piutang Keluar') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] -= nom; // Saldo aset berkurang
                    // netWorth tidak berubah karena uang masih "milik kita" dalam bentuk piutang
                }

                // Bayar utang → saldo aset berkurang, net worth TIDAK berubah (kewajiban berkurang)
                else if (row.jenis === 'Bayar Utang') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] -= nom; // Saldo aset berkurang
                    // netWorth tidak berubah karena kewajiban juga berkurang
                }

                // Terima piutang → saldo aset bertambah, net worth TIDAK berubah (aset piutang berkurang)
                else if (row.jenis === 'Terima Piutang') {
                    if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                    portoAllTime[sumber] += nom; // Saldo aset bertambah
                    // netWorth tidak berubah karena piutang (aset lain) berkurang
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

            // fetch utang/piutang data (kewajiban/receivable aktif)
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

    // Chart config
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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-center md:text-left">
                        <h2 className="text-xl font-bold text-slate-800">Ringkasan Keuangan</h2>
                        <p className="text-sm text-slate-500">Halo, <b>{currentUser}</b></p>
                    </div>
                    <input
                        type="month" value={filterBulan}
                        onChange={(e) => setFilterBulan(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 outline-none"
                    />
                </div>

                {isLoading ? (
                    <div className="animate-pulse grid md:grid-cols-2 gap-6">
                        <div className="h-[400px] bg-slate-200 rounded-xl"></div>
                        <div className="h-[400px] bg-slate-200 rounded-xl"></div>
                        <div className="h-[300px] bg-slate-200 rounded-xl"></div>
                        <div className="h-[300px] bg-slate-200 rounded-xl"></div>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">

                        {/* Arus Kas */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="flex items-center justify-center gap-2 font-bold text-slate-700 uppercase mb-4 pb-2 border-b">
                                <PieChart size={18} className="text-emerald-500" /> Arus Kas & Estimasi Budget
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Saldo Awal Bulan</span><span className="font-bold">{formatRp(summary.saldoAwal)}</span></div>
                                <div className="flex justify-between"><span>Total Masuk (Riil)</span><span className="font-bold text-emerald-600">+ {formatRp(summary.totalMasuk)}</span></div>
                                <div className="flex justify-between"><span>Total Keluar (Riil)</span><span className="font-bold text-red-600">- {formatRp(summary.totalKeluar)}</span></div>
                                <div className="flex justify-between items-center p-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg text-white shadow-md mt-3 transform transition-transform hover:scale-[1.02]">
                                    <span className="font-bold text-sm tracking-wide">SISA KAS SAAT INI</span>
                                    <span className="font-bold text-lg">{formatRp(sisaKas)}</span>
                                </div>
                                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide mt-4 mb-2 bg-slate-50 py-1 rounded">Proyeksi Kas</div>
                                <div className="flex justify-between text-orange-600 text-xs"><span>Rencana Masuk</span><span>+ {formatRp(summary.rencanaMasuk)}</span></div>
                                <div className="flex justify-between text-orange-600 text-xs"><span>Rencana Keluar</span><span>- {formatRp(summary.rencanaKeluar)}</span></div>
                                <div className="flex justify-between p-2 bg-orange-50 rounded text-orange-800 font-bold mt-1"><span>ESTIMASI KAS AKHIR</span><span>{formatRp(estimasiAkhir)}</span></div>
                                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide mt-4 mb-2 bg-slate-50 py-1 rounded">Ringkasan Hari Ini</div>
                                <div className="flex justify-between text-xs"><span>Masuk Hari Ini</span><span className="font-bold text-emerald-600">+ {formatRp(summary.hariIniMasuk)}</span></div>
                                <div className="flex justify-between text-xs"><span>Keluar Hari Ini</span><span className="font-bold text-red-600">- {formatRp(summary.hariIniKeluar)}</span></div>
                            </div>
                        </div>

                        {/* Grafik Pengeluaran */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                            <h3 className="font-bold text-slate-700 uppercase mb-4 pb-2 border-b w-full text-center">Sebaran Pengeluaran Riil</h3>
                            <div className="w-full h-56 flex justify-center">
                                {Object.keys(dataChartPengeluaran).length > 0
                                    ? <Doughnut data={pengeluaranData} options={{ maintainAspectRatio: false }} />
                                    : <p className="text-slate-400 mt-10">Belum ada data.</p>}
                            </div>
                        </div>

                        {/* Net Worth */}
                        <div className="bg-slate-50 p-5 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="flex items-center justify-center gap-2 font-bold text-blue-700 uppercase mb-4 pb-2 border-b border-blue-100">
                                <Wallet size={18} /> Net Worth & Saldo Aset
                            </h3>
                            <div className="space-y-2 text-sm max-h-48 overflow-y-auto pr-2">
                                {Object.entries(portofolio).map(([aset, nilai]) => (
                                    nilai !== 0 && (
                                        <div key={aset} className="flex justify-between border-b border-slate-200/50 pb-1">
                                            <span className="text-slate-600 truncate">{aset}</span>
                                            <span className="font-bold">{formatRp(nilai)}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                            <div className="flex justify-between items-center p-3.5 bg-gradient-to-r from-blue-600 to-indigo-500 mt-4 rounded-lg text-white shadow-md transform transition-transform hover:scale-[1.02]">
                                <span className="font-bold text-sm tracking-wide">TOTAL NET WORTH</span>
                                <span className="font-bold text-lg">{formatRp(summary.totalNetWorth)}</span>
                            </div>
                        </div>

                        {/* Tambahkan ini di dalam kotak Net Worth, setelah total net worth */}
                        {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                            <div className="mt-3 pt-3 border-t border-blue-100 space-y-1 text-xs">
                                <div className="flex justify-between text-slate-500">
                                    <span>Kewajiban (Utang Aktif)</span>
                                    <span className="font-bold text-red-500">- {formatRp(totalUtangAktif)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Tagihan (Piutang Aktif)</span>
                                    <span className="font-bold text-emerald-500">+ {formatRp(totalPiutangAktif)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-700 pt-1 border-t border-blue-100">
                                    <span>Net Worth Bersih</span>
                                    <span>{formatRp(summary.totalNetWorth + totalPiutangAktif - totalUtangAktif)}</span>
                                </div>
                            </div>
                        )}

                        {/* Grafik Aset */}
                        <div className="bg-slate-50 p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                            <h3 className="font-bold text-blue-700 uppercase mb-4 pb-2 border-b border-blue-100 w-full text-center">Asset Allocation</h3>
                            <div className="w-full h-56 flex justify-center">
                                {asetLabels.length > 0
                                    ? <Pie data={asetData} options={{ maintainAspectRatio: false }} />
                                    : <p className="text-slate-400 mt-10">Belum ada aset.</p>}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}