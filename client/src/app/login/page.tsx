"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";


export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("No internet connection. Please check your network.");
      }
      const success = await login(email, password);
      if (success) {
        const enableLocation =
          (process.env.NEXT_PUBLIC_ENABLE_LOCATION_VERIFICATION || "false") ===
          "true";
        router.push(enableLocation ? "/location-gate" : "/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell min-h-screen flex items-center justify-center px-4 py-10">
      <div className="login-layout animate-fade-in w-full max-w-5xl">
        <section className="login-welcome">
          <div className="login-welcome-content">
            <div className="mb-8 flex items-center gap-3">
              <div className="login-brand-mark flex h-11 w-11 items-center justify-center rounded-xl">
                <Mail className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-lg font-semibold tracking-wide text-white">
                EmailHub
              </span>
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-teal-200">
              Your workspace
            </p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
              Welcome back
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
              Bring your email campaigns, delivery tools, and insights together
              in one place.
            </p>
            <div className="login-welcome-rule mt-8" />
            <p className="mt-4 text-xs tracking-wide text-slate-400">
              Professional email management, made simple.
            </p>
          </div>
          <span className="login-orb login-orb-large" aria-hidden="true" />
          <span className="login-orb login-orb-small" aria-hidden="true" />
          <span className="login-orb login-orb-bottom" aria-hidden="true" />
        </section>

        <section className="login-form-panel">
          <div className="login-form-content">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Enter your account details to continue.
              </p>
            </div>

            {error && (
              <div className="mb-6 w-full rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-left">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-5">
              <div className="flex flex-col gap-2 text-left">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-300"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="form-input pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 text-left">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="form-input pl-10 pr-12"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-teal-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary mt-3 flex items-center justify-center gap-2 py-3 text-base font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-gray-500">
              Secure access to your EmailHub account
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
