import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Download, FileText, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
            const res = await fetch(`${baseUrl}/api/transaksi`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) { localStorage.clear(); navigate('/'); return; }

            const data = await res.json();
            let [fYear, fMonth] = filterBulan.split('-');
            let sAwal = 0, tMasuk = 0, tKeluar = 0, rMasuk = 0, rKeluar = 0, netWorth = 0;
            let portoAllTime = {};
            let chartPengeluaran = {};
            let historyTemp = [];

            data.forEach(row => {
                let rowDate = new Date(row.tanggal);
                let rYear = rowDate.getFullYear().toString();
                let rMonth = (rowDate.getMonth() + 1).toString().padStart(2, '0');
                let nom = row.nominal || 0;
                let sumber = row.sumberDana || 'Lain-lain';

                // Portofolio & Net Worth — hanya hitung sampai akhir bulan yang dipilih
                const sudahLewat = rYear < fYear || (rYear === fYear && rMonth <= fMonth);

                if (sudahLewat) {
                    if (row.jenis === 'Pemasukan') {
                        if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                        portoAllTime[sumber] += nom;
                        netWorth += nom;
                    } else if (row.jenis === 'Pengeluaran') {
                        if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                        portoAllTime[sumber] -= nom;
                        netWorth -= nom;
                    } else if (row.jenis === 'Utang Masuk') {
                        if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                        portoAllTime[sumber] += nom;
                    } else if (row.jenis === 'Piutang Keluar') {
                        if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                        portoAllTime[sumber] -= nom;
                    } else if (row.jenis === 'Bayar Utang') {
                        if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                        portoAllTime[sumber] -= nom;
                    } else if (row.jenis === 'Terima Piutang') {
                        if (!portoAllTime[sumber]) portoAllTime[sumber] = 0;
                        portoAllTime[sumber] += nom;
                    }
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
                            chartPengeluaran[row.kategori] = (chartPengeluaran[row.kategori] || 0) + nom;
                    }
                    else if (row.jenis === 'Rencana Pemasukan') rMasuk += nom;
                    else if (row.jenis === 'Rencana Pengeluaran') rKeluar += nom;

                    historyTemp.push({
                        id: row.id,
                        tglStr: rowDate.toLocaleDateString('id-ID'),
                        tanggalAsli: row.tanggal,
                        kategori: row.kategori,
                        keterangan: row.keterangan,
                        sumberDana: sumber,
                        jenis: row.jenis,
                        nominal: nom
                    });
                }
            });

            setSummary({ saldoAwal: sAwal, totalMasuk: tMasuk, totalKeluar: tKeluar, rencanaMasuk: rMasuk, rencanaKeluar: rKeluar, totalNetWorth: netWorth });
            setPortofolio(portoAllTime);
            setDataChartPengeluaran(chartPengeluaran);
            setHistoryData(historyTemp.sort((a, b) => {
                const timeA = new Date(a.tanggalAsli).getTime();
                const timeB = new Date(b.tanggalAsli).getTime();
                if (timeB !== timeA) return timeB - timeA;
                return b.id - a.id;
            }));

            // Fetch utang piutang
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

    // Generate PDF
    const handleDownloadPDF = async () => {
        if (!previewRef.current) return;
        setIsGenerating(true);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = { top: 8, bottom: 10, left: 0, right: 0 };
            const contentHeight = pageHeight - margin.top - margin.bottom;

            // Screenshot seluruh preview
            const fullCanvas = await html2canvas(previewRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        const computed = window.getComputedStyle(el);
                        if (computed.backgroundColor?.includes('oklch')) el.style.backgroundColor = '#ffffff';
                        if (computed.color?.includes('oklch')) el.style.color = '#1e293b';
                        if (computed.borderColor?.includes('oklch')) el.style.borderColor = '#e2e8f0';
                        if (computed.backgroundImage?.includes('oklch')) {
                            el.style.backgroundImage = 'none';
                            el.style.backgroundColor = '#ffffff';
                        }
                        if (computed.boxShadow?.includes('oklch')) el.style.boxShadow = 'none';
                    });
                    const styleTag = clonedDoc.createElement('style');
                    styleTag.innerHTML = `
                    .bg-blue-600, .from-blue-600 { background-color: #2563eb !important; }
                    .bg-indigo-600 { background-color: #4f46e5 !important; }
                    .bg-slate-700 { background-color: #334155 !important; }
                    .bg-slate-50 { background-color: #f8fafc !important; }
                    .bg-slate-100 { background-color: #f1f5f9 !important; }
                    .bg-orange-50 { background-color: #fff7ed !important; }
                    .bg-white { background-color: #ffffff !important; }
                    .text-emerald-600 { color: #059669 !important; }
                    .text-red-600 { color: #dc2626 !important; }
                    .text-blue-600 { color: #2563eb !important; }
                    .text-orange-600 { color: #ea580c !important; }
                    .text-purple-700 { color: #7c3aed !important; }
                    .text-slate-500 { color: #64748b !important; }
                    .text-slate-600 { color: #475569 !important; }
                    .text-slate-700 { color: #334155 !important; }
                    .text-slate-800 { color: #1e293b !important; }
                    .text-white { color: #ffffff !important; }
                    .text-red-500 { color: #ef4444 !important; }
                    .text-emerald-500 { color: #10b981 !important; }
                    .border-slate-100 { border-color: #f1f5f9 !important; }
                    .border-slate-200 { border-color: #e2e8f0 !important; }
                `;
                    clonedDoc.head.appendChild(styleTag);
                }
            });

            // Ukuran dalam pixel per halaman PDF
            const pxPerMm = fullCanvas.width / pageWidth;
            const pageHeightPx = Math.floor(contentHeight * pxPerMm);
            const marginTopPx = Math.floor(margin.top * pxPerMm);
            const marginBottomPx = Math.floor(margin.bottom * pxPerMm);

            // Deteksi posisi baris tabel agar tidak terpotong
            const tableRows = previewRef.current.querySelectorAll('tbody tr, tfoot tr');
            const previewRect = previewRef.current.getBoundingClientRect();
            const scale = fullCanvas.width / previewRect.width;

            // Kumpulkan posisi Y setiap baris dalam pixel canvas
            const rowBreakPoints = new Set();
            tableRows.forEach(row => {
                const rowRect = row.getBoundingClientRect();
                const rowTopPx = Math.floor((rowRect.top - previewRect.top) * scale);
                rowBreakPoints.add(rowTopPx);
            });

            // Bagi canvas menjadi halaman, hindari memotong di tengah baris
            const pages = [];
            let startY = 0;

            while (startY < fullCanvas.height) {
                let endY = startY + pageHeightPx;

                if (endY < fullCanvas.height) {
                    // Cari baris terdekat sebelum endY agar tidak terpotong
                    let bestBreak = endY;
                    for (const breakPt of rowBreakPoints) {
                        if (breakPt > startY && breakPt <= endY) {
                            bestBreak = breakPt;
                        }
                    }
                    endY = bestBreak;
                } else {
                    endY = fullCanvas.height;
                }

                pages.push({ startY, endY });
                startY = endY;
            }

            const totalPages = pages.length;

            // Render setiap halaman
            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();

                const { startY, endY } = pages[i];
                const sliceHeight = endY - startY;

                // Canvas seukuran konten asli (tidak dipaksa seukuran halaman penuh)
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = fullCanvas.width;
                pageCanvas.height = sliceHeight; // ← pakai tinggi asli, bukan tinggi halaman penuh

                const ctx = pageCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

                ctx.drawImage(
                    fullCanvas,
                    0, startY,
                    fullCanvas.width, sliceHeight,
                    0, 0,
                    fullCanvas.width, sliceHeight
                );

                const imgData = pageCanvas.toDataURL('image/png');

                // Hitung tinggi gambar dalam mm sesuai proporsi asli
                const imgHeightMm = (sliceHeight / pxPerMm);

                // Gambar konten mulai dari margin.top, tinggi sesuai konten (tidak di-stretch)
                pdf.addImage(imgData, 'PNG', 0, margin.top, pageWidth, imgHeightMm);

                // Garis footer
                pdf.setDrawColor(220, 220, 220);
                pdf.line(10, pageHeight - margin.bottom + 1, pageWidth - 10, pageHeight - margin.bottom + 1);

                // Nomor halaman
                pdf.setFontSize(9);
                pdf.setTextColor(160, 160, 160);
                pdf.text(
                    `Halaman ${i + 1} dari ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 3,
                    { align: 'center' }
                );
            }

            pdf.save(`Laporan_${currentUser}_${filterBulan}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Gagal generate PDF: " + err.message);
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
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-24 md:pb-6">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

                {/* Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <FileText size={22} className="text-blue-500" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Laporan Keuangan</h2>
                            <p className="text-xs text-slate-500">Preview & download laporan PDF</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="month" value={filterBulan}
                            onChange={(e) => setFilterBulan(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 outline-none text-sm"
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
                    <div className="bg-white rounded-xl border border-slate-200 p-20 text-center text-slate-400 animate-pulse">
                        <p>Memuat data...</p>
                    </div>
                ) : (
                    /* ===== AREA PREVIEW (yang akan di-screenshot) ===== */
                    <div ref={previewRef} className="bg-white rounded-xl shadow-sm overflow-hidden"
                        style={{ fontFamily: 'sans-serif' }}>

                        {/* Header Laporan */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6">
                            <h1 className="text-2xl font-black tracking-tight">ZAMAGI KAS</h1>
                            <p className="text-blue-200 text-sm mt-0.5">Laporan Keuangan Pribadi</p>
                            <div className="mt-4 flex flex-col md:flex-row justify-between text-sm">
                                <p>Periode: <b>{namaBulan(filterBulan)}</b></p>
                                <p>Akun: <b>{currentUser}</b></p>
                                <p>Dicetak: <b>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</b></p>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">

                            {/* Ringkasan Arus Kas */}
                            <div>
                                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b">
                                    Ringkasan Arus Kas
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Saldo Awal', value: summary.saldoAwal, warna: 'text-slate-700' },
                                        { label: 'Total Masuk', value: summary.totalMasuk, warna: 'text-emerald-600' },
                                        { label: 'Total Keluar', value: summary.totalKeluar, warna: 'text-red-600' },
                                        { label: 'Sisa Kas', value: sisaKas, warna: sisaKas >= 0 ? 'text-blue-600' : 'text-red-600' },
                                    ].map(item => (
                                        <div key={item.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <p className="text-xs text-slate-500 font-semibold">{item.label}</p>
                                            <p className={`text-base font-black mt-1 ${item.warna}`}>{formatRp(item.value)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Proyeksi */}
                                <div className="mt-3 bg-orange-50 rounded-lg p-3 border border-orange-100 flex flex-col md:flex-row justify-between gap-2 text-sm">
                                    <div><span className="text-slate-500">Rencana Masuk:</span> <b className="text-orange-600">{formatRp(summary.rencanaMasuk)}</b></div>
                                    <div><span className="text-slate-500">Rencana Keluar:</span> <b className="text-orange-600">{formatRp(summary.rencanaKeluar)}</b></div>
                                    <div><span className="text-slate-500">Estimasi Akhir Bulan:</span> <b className="text-orange-700">{formatRp(estimasiAkhir)}</b></div>
                                </div>
                            </div>

                            {/* Net Worth & Portofolio */}
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b">
                                        Saldo Per Aset
                                    </h2>
                                    <div className="space-y-1.5">
                                        {Object.entries(portofolio).filter(([, v]) => v !== 0).map(([aset, nilai]) => (
                                            <div key={aset} className="flex justify-between text-sm py-1 border-b border-slate-100">
                                                <span className="text-slate-600">{aset}</span>
                                                <span className={`font-bold ${nilai >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatRp(nilai)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Net Worth Summary */}
                                    <div className="mt-3 text-sm">
                                        <div className="flex justify-between font-bold bg-blue-600 text-white px-3 py-2.5 rounded-lg">
                                            <span>Total Net Worth</span>
                                            <span>{formatRp(summary.totalNetWorth)}</span>
                                        </div>

                                        {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                            <div className="mt-2 mb-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                                                <div className="flex justify-between text-xs px-3 py-2 border-b border-slate-100">
                                                    <span className="text-slate-500">Kewajiban (Utang Aktif)</span>
                                                    <span className="text-red-500 font-bold">- {formatRp(totalUtangAktif)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs px-3 py-2">
                                                    <span className="text-slate-500">Tagihan (Piutang Aktif)</span>
                                                    <span className="text-emerald-500 font-bold">+ {formatRp(totalPiutangAktif)}</span>
                                                </div>
                                            </div>
                                        )}

                                        {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                            <div className="flex justify-between font-bold bg-indigo-600 text-white px-3 py-2.5 rounded-lg">
                                                <span>Net Worth Bersih</span>
                                                <span>{formatRp(netWorthBersih)}</span>
                                            </div>
                                        )}

                                        {/* Tambahkan ini */}
                                        {(totalUtangAktif > 0 || totalPiutangAktif > 0) && (
                                            <p className="text-xs text-slate-400 mt-1 italic">
                                                *Utang/piutang aktif berdasarkan status saat ini
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Chart Pengeluaran */}
                                <div>
                                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b">
                                        Sebaran Pengeluaran
                                    </h2>
                                    {Object.keys(dataChartPengeluaran).length > 0 ? (
                                        <div className="h-72">
                                            <Doughnut
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
                                        <p className="text-slate-400 text-sm">Belum ada data pengeluaran.</p>
                                    )}
                                </div>
                            </div>

                            {/* Tabel Transaksi */}
                            <div>
                                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3 pb-1 border-b">
                                    Riwayat Transaksi — {namaBulan(filterBulan)} ({historyData.length} transaksi)
                                </h2>
                                {historyData.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-6">Tidak ada transaksi bulan ini.</p>
                                ) : (
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-700 text-white">
                                                <th className="px-3 py-2 text-left font-semibold">Tanggal</th>
                                                <th className="px-3 py-2 text-left font-semibold">Kategori</th>
                                                <th className="px-3 py-2 text-left font-semibold">Keterangan</th>
                                                <th className="px-3 py-2 text-left font-semibold">Aset</th>
                                                <th className="px-3 py-2 text-left font-semibold">Jenis</th>
                                                <th className="px-3 py-2 text-right font-semibold">Nominal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyData.map((h, i) => {
                                                const badge = getBadgeJenis(h.jenis);
                                                return (
                                                    <tr key={h.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                        <td className="px-3 py-2 whitespace-nowrap">{h.tglStr}</td>
                                                        <td className="px-3 py-2">{h.kategori}</td>
                                                        <td className="px-3 py-2 text-slate-500 max-w-[180px] truncate">{h.keterangan}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap">{h.sumberDana}</td>
                                                        <td className="px-3 py-2">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.warna}`}>
                                                                {badge.label}
                                                            </span>
                                                        </td>
                                                        <td className={`px-3 py-2 text-right font-bold whitespace-nowrap
                                                            ${h.jenis === 'Pemasukan' ? 'text-emerald-600' : ''}
                                                            ${h.jenis === 'Pengeluaran' ? 'text-red-600' : ''}
                                                            ${h.jenis.includes('Rencana') ? 'text-orange-600' : ''}
                                                        `}>
                                                            {formatRp(h.nominal)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 font-bold text-slate-700">
                                                <td colSpan="5" className="px-3 py-2 text-right">Total Masuk Riil:</td>
                                                <td className="px-3 py-2 text-right text-emerald-600">{formatRp(summary.totalMasuk)}</td>
                                            </tr>
                                            <tr className="bg-slate-100 font-bold text-slate-700">
                                                <td colSpan="5" className="px-3 py-2 text-right">Total Keluar Riil:</td>
                                                <td className="px-3 py-2 text-right text-red-600">{formatRp(summary.totalKeluar)}</td>
                                            </tr>
                                            <tr className="bg-slate-700 text-white font-bold">
                                                <td colSpan="5" className="px-3 py-2 text-right">Sisa Kas:</td>
                                                <td className="px-3 py-2 text-right">{formatRp(sisaKas)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="text-center text-xs text-slate-400 pt-4 border-t">
                                Laporan ini digenerate otomatis oleh Zamagi Kas •{' '}
                                {new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}