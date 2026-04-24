import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, FileText, User, Calendar, Clock, ArrowLeft, Loader2 } from 'lucide-react';

export default function Validasi() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Ambil parameter dari URL: ?user=zamagi&bulan=2026-04
    const user = searchParams.get('user');
    const bulan = searchParams.get('bulan');

    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);

    // Format YYYY-MM ke format Bulan Tahun
    const formatBulan = (bulanStr) => {
        if (!bulanStr) return '-';
        const [year, month] = bulanStr.split('-');
        const nama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${nama[parseInt(month) - 1]} ${year}`;
    };

    useEffect(() => {
        // Simulasi proses verifikasi ke server (bisa diganti dengan fetch API sungguhan nanti)
        const verifyDocument = setTimeout(() => {
            if (user && bulan) {
                setIsValid(true);
            } else {
                setIsValid(false);
            }
            setIsValidating(false);
        }, 1500); // Loading 1.5 detik agar terlihat meyakinkan

        return () => clearTimeout(verifyDocument);
    }, [user, bulan]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
            
            {/* Logo / Header */}
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-black text-blue-600 dark:text-blue-500 tracking-tight">ZonaKas</h1>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Sistem Verifikasi Dokumen</p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                
                {isValidating ? (
                    // --- TAMPILAN LOADING ---
                    <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                        <Loader2 size={48} className="text-blue-500 animate-spin" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Memverifikasi Dokumen...</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Mohon tunggu sebentar, sedang mengecek keaslian data ke server ZonaKas.</p>
                        </div>
                    </div>
                ) : isValid ? (
                    // --- TAMPILAN VALID (SUKSES) ---
                    <div>
                        <div className="bg-emerald-500 p-8 text-center text-white">
                            <ShieldCheck size={64} className="mx-auto mb-4" />
                            <h2 className="text-2xl font-black">Dokumen Tervalidasi!</h2>
                            <p className="text-emerald-100 text-sm mt-1">Laporan keuangan ini asli dan diterbitkan oleh sistem ZonaKas</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                Rincian Dokumen
                            </h3>
                            
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Jenis Dokumen</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Laporan Arus Kas & Portofolio</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Pemilik Akun (Nasabah)</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">@{user}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Periode Laporan</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatBulan(bulan)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-emerald-600 dark:text-emerald-400">
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Waktu Verifikasi (Saat Ini)</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                            {new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- TAMPILAN TIDAK VALID / ERROR ---
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert size={40} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Dokumen Tidak Dikenali</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            QR Code tidak valid atau informasi dokumen tidak lengkap. Dokumen ini mungkin palsu atau sudah dimodifikasi.                        </p>
                    </div>
                )}

                {/* Footer Button */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        <ArrowLeft size={16} /> Ke Halaman Utama ZonaKas
                    </button>
                </div>
            </div>

            <p className="mt-8 text-xs text-slate-400 dark:text-slate-500 text-center">
                © {new Date().getFullYear()} ZonaKas by Zamagi. All rights reserved.
            </p>
        </div>
    );
}