"use client";

import React, { useState } from "react";
import { Lock, User, ArrowRight, Sparkles, Shield, Terminal, AlertCircle, Share2 } from "lucide-react";
import { SystemFailureAnimation } from "./SystemFailureAnimation";

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
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-black text-[#e2e8f0] select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[350px] bg-slate-900/20 blur-[160px] rounded-full pointer-events-none" />

      {/* LEFT SIDE: Full-Screen Animated Story Hero */}
      <div className="w-full lg:flex-1 h-[50vh] lg:h-screen flex items-center justify-center p-4 lg:p-10 border-b lg:border-b-0 lg:border-r border-[#192233] bg-[#020408]/90 relative overflow-hidden">
        <div className="w-full h-full max-w-[950px] flex items-center justify-center">
          <SystemFailureAnimation />
        </div>
      </div>

      {/* RIGHT SIDE: Authentication Panel matching reference screenshot */}
      <div className="w-full lg:w-[500px] xl:w-[540px] shrink-0 min-h-[50vh] lg:h-screen flex items-center justify-center p-6 lg:p-8 xl:p-10 bg-black z-10 overflow-y-auto">
        {/* Boxed Rounded Container exactly as shown in screenshot */}
        <div className="w-full max-w-[440px] rounded-2xl bg-[#030508] border border-[#1b2230] p-7 sm:p-9 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col justify-between min-h-[560px]">
          {/* Header: Centered "Sign In" with bottom subtle divider */}
          <div>
            <div className="text-center pb-5 border-b border-[#1b2333]">
              <h1 className="text-2xl sm:text-[26px] font-bold font-mono tracking-tight text-white">
                Sign In
              </h1>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs font-mono animate-in fade-in">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Inputs Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-gray-300 flex items-center gap-2">
                  <User size={13} className="text-gray-400" />
                  <span>Username or Email</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="developer or abhishek@rebactor.internal"
                  className="w-full bg-[#05070c] border border-[#1e2638] focus:border-gray-400 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-gray-300 flex items-center gap-2">
                    <Lock size={13} className="text-gray-400" />
                    <span>Password</span>
                  </label>
                  <span className="text-[11px] font-mono text-gray-500">Demo: any key</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#05070c] border border-[#1e2638] focus:border-gray-400 rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder:text-gray-600 focus:outline-none transition-colors"
                />
              </div>

              {/* White Pill Action Button with Arrow Icon */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 bg-[#f8fafc] hover:bg-white text-black text-sm font-semibold font-mono py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 cursor-pointer shadow-md"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Enter DevOps Portal</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Divider: OR QUICK SIGN IN */}
            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-[#1b2333] w-full" />
              <span className="bg-[#030508] px-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Or quick sign in
              </span>
            </div>

            {/* Quick Demo Connect Options */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo("Lead")}
                disabled={loading}
                className="w-full bg-[#05070c] hover:bg-[#0c101a] border border-[#1e2638] hover:border-[#334155] text-gray-200 text-xs font-mono py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <Share2 size={13} className="text-gray-400 group-hover:text-white transition-colors" />
                  <span>Sign in as Lead (Abhishek Singh)</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400 px-2 py-0.5 rounded border border-[#222d42] bg-[#0b0f19]">
                  Instant
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("SRE")}
                disabled={loading}
                className="w-full bg-[#05070c] hover:bg-[#0c101a] border border-[#1e2638] hover:border-[#334155] text-gray-200 text-xs font-mono py-2.5 px-3.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2.5">
                  <svg className="w-3.5 h-3.5 fill-current text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Continue via GitHub Workspace</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400 px-2 py-0.5 rounded border border-[#222d42] bg-[#0b0f19]">
                  DevOps SSO
                </span>
              </button>
            </div>
          </div>

          {/* Bottom Security Footer: Lock Icon & End-to-End Encrypted */}
          <div className="pt-6 border-t border-[#1b2333] flex items-center justify-end gap-1.5 text-xs font-mono text-gray-400">
            <Lock size={12} className="text-gray-400" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
