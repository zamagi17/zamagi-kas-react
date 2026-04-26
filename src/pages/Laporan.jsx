import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Download, FileText, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';

ChartJS.register(ArcElement, Tooltip, Legend);

const baseUrl = (import.meta.env.VITE_API_URL || 'https://increasing-felicity-zamagi-apps-3fc54a80.koyeb.app').replace(/\/+$/, '');

export default function Laporan() {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const currentUser = localStorage.getItem('username');
    const previewRef = useRef(null);

    const [filterBulan, setFilterBulan] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const [summary, setSummary] = useState({
        saldoAwal: 0, totalMasuk: 0, totalKeluar: 0,
        rencanaMasuk: 0, rencanaKeluar: 0, totalNetWorth: 0
    });
    const [portofolio, setPortofolio] = useState({});
    const [dataChartPengeluaran, setDataChartPengeluaran] = useState({});
    const [historyData, setHistoryData] = useState([]);
    const [totalUtangAktif, setTotalUtangAktif] = useState(0);
    const [totalPiutangAktif, setTotalPiutangAktif] = useState(0);
    const [chartKey, setChartKey] = useState(0);

    const formatRp = (angka) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);

    const namaBulan = (bulanStr) => {
        const [year, month] = bulanStr.split('-');
        const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${nama[parseInt(month) - 1]} ${year}`;
    };

    useEffect(() => { if (!token) navigate('/'); }, [token, navigate]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${baseUrl}/api/transaksi/ringkasan?bulan=${filterBulan}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) { localStorage.clear(); navigate('/'); return; }

            const data = await res.json();

            setSummary(data.summary);
            setPortofolio(data.portofolio);
            setDataChartPengeluaran(data.chartPengeluaran);
            setHistoryData(data.historyData);

            try {
                const resUP = await fetch(`${baseUrl}/api/utang-piutang`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                if (resUP.ok) {
                    const dataUP = await resUP.json();
                    setTotalUtangAktif(dataUP.filter(d => d.jenis === 'Utang' && d.status === 'Belum Lunas').reduce((acc, d) => acc + (d.sisaTagihan || 0), 0));
                    setTotalPiutangAktif(dataUP.filter(d => d.jenis === 'Piutang' && d.status === 'Belum Lunas').reduce((acc, d) => acc + (d.sisaTagihan || 0), 0));
                }
            } catch (e) { console.error(e); }

        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [filterBulan, token]);

    const sisaKas = (summary.saldoAwal + summary.totalMasuk) - summary.totalKeluar;
    const estimasiAkhir = sisaKas + summary.rencanaMasuk - summary.rencanaKeluar;
    const netWorthBersih = summary.totalNetWorth + totalPiutangAktif - totalUtangAktif;

    const pengeluaranData = {
        labels: Object.keys(dataChartPengeluaran),
        datasets: [{
            data: Object.values(dataChartPengeluaran),
            backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e', '#e67e22', '#1abc9c'],
            borderWidth: 0
        }]
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`${baseUrl}/api/transaksi/download-laporan?bulan=${filterBulan}`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + token }
            });

            if (!response.ok) throw new Error("Gagal mengunduh laporan dari server.");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Laporan_${currentUser}_${filterBulan}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Terjadi kesalahan: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const getBadgeJenis = (jenis) => {
        if (jenis.includes('Rencana')) return { label: 'PROYEKSI', warna: 'bg-orange-100 text-orange-700' };
        if (jenis === 'Utang Masuk') return { label: 'UTANG', warna: 'bg-purple-100 text-purple-700' };
        if (jenis === 'Piutang Keluar') return { label: 'PIUTANG', warna: 'bg-purple-100 text-purple-700' };
        if (jenis === 'Bayar Utang') return { label: 'BAYAR UTANG', warna: 'bg-orange-100 text-orange-700' };
        if (jenis === 'Terima Piutang') return { label: 'TERIMA PIUTANG', warna: 'bg-orange-100 text-orange-700' };
        if (jenis === 'Pemasukan') return { label: 'MASUK', warna: 'bg-emerald-100 text-emerald-700' };
        if (jenis === 'Pengeluaran') return { label: 'KELUAR', warna: 'bg-red-100 text-red-700' };
        return { label: jenis, warna: 'bg-slate-100 text-slate-700' };
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

                {/* Toolbar */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <FileText size={22} className="text-blue-500" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Laporan Keuangan</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Preview & download laporan PDF</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="month" value={filterBulan}
                            onChange={(e) => setFilterBulan(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                        />
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating || isLoading}
                            className="flex items-center gap-2 px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition shadow-sm disabled:opacity-50"
                        >
                            {isGenerating
                                ? <><Loader size={16} className="animate-spin" /> Generating...</>
                                : <><Download size={16} /> Download PDF</>
                            }
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-20 text-center text-slate-400 dark:text-slate-500 animate-pulse">
                        <p>Memuat data...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* ===== AREA PREVIEW ===== */}
                        <div ref={previewRef} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden"
                            style={{ fontFamily: 'sans-serif' }}>

                            {/* Header Laporan */}
                            <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white px-8 py-6">
                                <h1 className="text-2xl font-black tracking-tight">ZonaKas</h1>
                                <p className="text-blue-200 text-sm mt-0.5">Laporan Keuangan Pribadi</p>
                                <div className="mt-4 flex flex-col md:flex-row justify-between text-sm">
                                    <p>Periode: <b>{namaBulan(filterBulan)}</b></p>
                                    <p>Akun: <b>{currentUser}</b></p>
                                    <p>Dicetak: <b>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b></p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">

                                {/* Ringkasan Pemasukan & Pengeluaran */}
                                <div>
                                    <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b">
                                        Ringkasan Pemasukan & Pengeluaran
                                    </h2>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Saldo Awal', value: summary.saldoAwal, warna: 'text-slate-700 dark:text-slate-300' },
                                            { label: 'Total Pemasukan', value: summary.totalMasuk, warna: 'text-emerald-600 dark:text-emerald-400' },
                                            { label: 'Total Pengeluaran', value: summary.totalKeluar, warna: 'text-red-600 dark:text-red-400' },
                                            { label: 'Sisa Saldo', value: sisaKas, warna: sisaKas >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400' },
                                        ].map(item => (
                                            <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{item.label}</p>
                                                <p className={`text-base font-black mt-1 ${item.warna}`}>{formatRp(item.value)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Proyeksi */}
                                    <div className="mt-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-100 dark:border-orange-800 flex flex-col md:flex-row justify-between gap-2 text-sm">
                                        <div><span className="text-slate-500 dark:text-slate-400">Rencana Masuk:</span> <b className="text-orange-600 dark:text-orange-400">{formatRp(summary.rencanaMasuk)}</b></div>
                                        <div><span className="text-slate-500 dark:text-slate-400">Rencana Keluar:</span> <b className="text-orange-600 dark:text-orange-400">{formatRp(summary.rencanaKeluar)}</b></div>
                                        <div><span className="text-slate-500 dark:text-slate-400">Estimasi Akhir Bulan:</span> <b className="text-orange-700 dark:text-orange-300">{formatRp(estimasiAkhir)}</b></div>
                                    </div>
                                </div>

                                {/* Net Worth & Portofolio */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b">
                                            Saldo per Dompet / Rekening
                                        </h2>
                                        <div className="space-y-1.5">
                                            {Object.entries(portofolio).filter(([, v]) => v !== 0).map(([aset, nilai]) => (
                                                <div key={aset} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-700">
                                                    <span className="text-slate-600 dark:text-slate-300">{aset}</span>
                                                    <span className={`font-bold ${nilai >= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-red-600 dark:text-red-400'}`}>{formatRp(nilai)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Net Worth Summary */}
                                        <div className="mt-3 text-sm">
                                            <div className="flex justify-between font-bold bg-blue-600 text-white px-3 py-2.5 rounded-lg">
                                                <span>Total Saldo Dompet</span>
                                                <span>{formatRp(summary.totalNetWorth)}</span>
                                            </div>

                                            {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                                <div className="mt-2 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                                    <div className="flex justify-between text-xs px-3 py-2 border-b border-slate-100 dark:border-slate-600">
                                                        <span className="text-slate-500 dark:text-slate-400">Kewajiban (Utang Aktif)</span>
                                                        <span className="text-red-500 dark:text-red-400 font-bold">- {formatRp(totalUtangAktif)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-xs px-3 py-2">
                                                        <span className="text-slate-500 dark:text-slate-400">Tagihan (Piutang Aktif)</span>
                                                        <span className="text-emerald-500 dark:text-emerald-400 font-bold">+ {formatRp(totalPiutangAktif)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                                <div className="flex justify-between font-bold bg-indigo-600 text-white px-3 py-2.5 rounded-lg">
                                                    <span>Kekayaan Bersih</span>
                                                    <span>{formatRp(netWorthBersih)}</span>
                                                </div>
                                            )}

                                            {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                                                    *Utang/piutang aktif berdasarkan status saat ini
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chart Pengeluaran */}
                                    <div>
                                        <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b">
                                            Sebaran Pengeluaran
                                        </h2>
                                        {Object.keys(dataChartPengeluaran).length > 0 ? (
                                            <div className="h-72">
                                                <Doughnut
                                                    key={chartKey}
                                                    data={pengeluaranData}
                                                    options={{
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: {
                                                                position: 'bottom',
                                                                labels: {
                                                                    font: { size: 10 },
                                                                    boxWidth: 10,
                                                                    padding: 8
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada data pengeluaran.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Tabel Transaksi */}
                                <div>
                                    <h2 className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b">
                                        Riwayat Transaksi — {namaBulan(filterBulan)} ({historyData.length} transaksi)
                                    </h2>
                                    {historyData.length === 0 ? (
                                        <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">Tidak ada transaksi bulan ini.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="mx-auto text-xs border-collapse" style={{ minWidth: '800px' }}>
                                                <thead>
                                                    <tr className="bg-slate-700 dark:bg-slate-800 text-white">
                                                        <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                                                        <th className="px-3 py-2 text-left font-semibold">Kategori</th>
                                                        <th className="px-3 py-2 text-left font-semibold">Keterangan</th>
                                                        <th className="px-3 py-2 text-left font-semibold">Dompet / Rekening</th>
                                                        <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                                                        <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyData.map((h, i) => {
                                                        const badge = getBadgeJenis(h.jenis);
                                                        return (
                                                            <tr key={h.id} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}>
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-800 dark:text-slate-200">{h.tglStr}</td>
                                                                <td className="px-3 py-2 text-slate-800 dark:text-slate-200">{h.kategori}</td>
                                                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 max-w-45 whitespace-normal wrap-break-word">{h.keterangan}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap text-slate-800 dark:text-slate-200">{h.sumberDana}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.warna}`}>
                                                                        {badge.label}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-3 py-2 text-right font-bold whitespace-nowrap
                                                                    ${h.jenis === 'Pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                                                                    ${h.jenis === 'Pengeluaran' ? 'text-red-600 dark:text-red-400' : ''}
                                                                    ${h.jenis.includes('Rencana') ? 'text-orange-600 dark:text-orange-400' : ''}
                                                                `}>
                                                                    {formatRp(h.nominal)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200">
                                                        <td colSpan="5" className="px-3 py-2 text-right">Total Pemasukan:</td>
                                                        <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{formatRp(summary.totalMasuk)}</td>
                                                    </tr>
                                                    <tr className="bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-200">
                                                        <td colSpan="5" className="px-3 py-2 text-right">Total Pengeluaran:</td>
                                                        <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{formatRp(summary.totalKeluar)}</td>
                                                    </tr>
                                                    <tr className="bg-slate-700 dark:bg-slate-800 text-white font-bold">
                                                        <td colSpan="5" className="px-3 py-2 text-right">Sisa Saldo:</td>
                                                        <td className="px-3 py-2 text-right">{formatRp(sisaKas)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4 border-t">
                                    Laporan ini digenerate otomatis oleh ZonaKas •{' '}
                                    {new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}