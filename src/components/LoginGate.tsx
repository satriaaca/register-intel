import { useState } from "react";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { signInWithGoogleSSO } from "../lib/firebase.js";
import { ArchivingAnimation } from "./ArchivingAnimation.js";

export default function LoginGate() {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        try {
            setIsLoggingIn(true);
            setError("");

            await signInWithGoogleSSO();
            // App.tsx akan menerima status user melalui subscribeToAuthState().
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Login Google gagal. Silakan coba kembali.";

            setError(message);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4 sm:p-6">
            <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/60 bg-white/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                {/* Header instansi */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                            Kejaksaan Negeri Tabanan
                        </p>
                        <h1 className="mt-0.5 text-xl font-extrabold text-slate-900">
                            Sistem Register Intelijen
                        </h1>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700">
                        <ShieldCheck className="h-6 w-6" />
                    </div>
                </div>

                {/* Person Archiving Book Animation */}
                <div className="my-5">
                    <ArchivingAnimation />
                </div>

                {/* Deskripsi */}
                <p className="text-center text-xs leading-relaxed text-slate-600 sm:text-sm">
                    Akses terautentikasi untuk pengarsipan, pencatatan buku register, dan tata kelola administrasi intelijen Kejaksaan.
                </p>

                {error && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Tombol Login */}
                <button
                    id="btn-google-login"
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoggingIn ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Memproses verifikasi Google...</span>
                        </>
                    ) : (
                        <>
                            <LogIn className="h-4 w-4" />
                            <span>Masuk dengan Google SSO</span>
                        </>
                    )}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    <span>Hanya email terdaftar pada Whitelist Resmi Kejaksaan</span>
                </div>
            </section>
        </main>
    );
}
