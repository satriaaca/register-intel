import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { signInWithGoogleSSO } from "../lib/firebase.js";

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
        <main className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                    Kejaksaan Negeri Tabanan
                </p>

                <h1 className="mt-3 text-2xl font-bold text-slate-900">
                    Register Intelijen
                </h1>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                    Masuk menggunakan akun Google yang telah terdaftar dan berwenang
                    mengakses sistem.
                </p>

                {error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoggingIn ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memproses login...
                        </>
                    ) : (
                        <>
                            <LogIn className="h-4 w-4" />
                            Masuk dengan Google
                        </>
                    )}
                </button>

                <p className="mt-4 text-center text-xs text-slate-500">
                    Akses hanya untuk akun yang terdaftar pada whitelist.
                </p>
            </section>
        </main>
    );
}