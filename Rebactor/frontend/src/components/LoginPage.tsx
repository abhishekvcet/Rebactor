"use client";

import React, { useState } from "react";
import { Lock, User, ArrowRight, Sparkles, Shield, Terminal, AlertCircle } from "lucide-react";
import { CicdStoryAnimation } from "./CicdStoryAnimation";

interface LoginPageProps {
  onLoginSuccess: (user: { name: string; email: string; avatar?: string; role: string }) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      if (!username.trim()) {
        setError("Please enter a username or email address.");
        setLoading(false);
        return;
      }
      const cleanUser = username.trim();
      const displayName = cleanUser.includes("@") ? cleanUser.split("@")[0] : cleanUser;
      const initials = displayName.slice(0, 2).toUpperCase();

      const authenticatedUser = {
        name: displayName,
        email: cleanUser.includes("@") ? cleanUser : `${cleanUser}@rebactor.internal`,
        role: "DevOps Lead",
        avatar: initials,
      };

      localStorage.setItem("rebactor_auth_user", JSON.stringify(authenticatedUser));
      onLoginSuccess(authenticatedUser);
      setLoading(false);
    }, 600);
  };

  const handleQuickDemo = (role: "Lead" | "SRE" | "Guest") => {
    setLoading(true);
    setTimeout(() => {
      const demoUsers = {
        Lead: { name: "Abhishek Singh", email: "abhishek@rebactor.internal", role: "DevOps Lead", avatar: "AS" },
        SRE: { name: "SRE OnCall", email: "sre-lead@rebactor.internal", role: "SRE Platform", avatar: "SR" },
        Guest: { name: "Engineer", email: "developer@rebactor.internal", role: "Observer", avatar: "DEV" },
      };
      const user = demoUsers[role];
      localStorage.setItem("rebactor_auth_user", JSON.stringify(user));
      onLoginSuccess(user);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-black text-[#e2e8f0] px-6 lg:px-16 py-10 select-none relative overflow-hidden">
      {/* Background ambient lighting in pure monochrome subtle grey */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-slate-800/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Split Grid: Left side Login Card | Right side 3D CI/CD Story */}
      <div className="w-full max-w-6xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* LEFT COLUMN: Login Card & Brand */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-black border border-[#222838] flex items-center justify-center p-2 shadow-2xl relative">
              <img
                src="/rebactor-logo.png"
                alt="Rebactor Logo"
                className="w-full h-full object-contain"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white font-mono">REBACTOR</h1>
                <span className="text-[10px] font-mono font-bold bg-[#a855f7]/15 text-[#c084fc] px-2 py-0.5 rounded-full border border-[#a855f7]/30">
                  AI SRE
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Autonomous CI/CD Diagnostics & RAG SRE Portal
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-[#0b0e14] border border-[#1b2230] rounded-2xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-5">
            <div className="flex items-center justify-between border-b border-[#161d2b] pb-3">
              <span className="text-xs font-mono font-semibold text-gray-300 flex items-center gap-2">
                <Shield size={14} className="text-[#a855f7]" />
                Sign in to DevOps Console
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                v2.2-pro
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono animate-in fade-in">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                  <User size={12} className="text-gray-500" />
                  Username or Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="developer or abhishek@rebactor.internal"
                  className="w-full bg-[#05070a] border border-[#1d2638] focus:border-[#a855f7] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                    <Lock size={12} className="text-gray-500" />
                    Password
                  </label>
                  <span className="text-[10px] font-mono text-gray-500">Demo: any key</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#05070a] border border-[#1d2638] focus:border-[#a855f7] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-[#7c3aed] to-[#9333ea] hover:from-[#6d28d9] hover:to-[#7e22ce] text-white text-xs font-mono font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter DevOps Portal</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#161d2b] w-full" />
              <span className="bg-[#0b0e14] px-2 text-[10px] font-mono text-gray-500 uppercase">Or quick sign in</span>
            </div>

            {/* Quick Demo Connect */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("Lead")}
                disabled={loading}
                className="w-full bg-[#06080e] hover:bg-[#121824] border border-[#1e2738] hover:border-[#384868] text-gray-200 text-xs font-mono py-2 px-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={13} className="text-cyan-400 group-hover:rotate-12 transition-transform" />
                  <span>Sign in as Lead (Abhishek Singh)</span>
                </span>
                <span className="text-[10px] text-gray-500 group-hover:text-cyan-400">Instant</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("SRE")}
                disabled={loading}
                className="w-full bg-[#06080e] hover:bg-[#121824] border border-[#1e2738] hover:border-[#384868] text-gray-300 text-xs font-mono py-2 px-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 fill-current text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Continue via GitHub Workspace</span>
                </span>
                <span className="text-[10px] text-gray-500">DevOps SSO</span>
              </button>
            </div>
          </div>

          {/* Security badge footer */}
          <div className="flex items-center justify-start gap-4 text-[11px] font-mono text-gray-500 px-1">
            <span className="flex items-center gap-1.5">
              <Terminal size={12} className="text-emerald-400" />
              Zero Token Mode Ready
            </span>
            <span>•</span>
            <span className="text-gray-500">End-to-End Encrypted</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D Mathematical CI/CD Story Animation (Grey Stroke Only) */}
        <div className="lg:col-span-7 flex items-center justify-center w-full min-h-[460px]">
          <CicdStoryAnimation />
        </div>
      </div>
    </div>
  );
}
