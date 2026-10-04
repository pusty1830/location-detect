import React, { useState } from 'react';
import { ShieldCheck, Info, X, Lock, CheckCircle2 } from 'lucide-react';

export const ConsentBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-100">100% Authorized & Transparent Tracking:</span>
            <span className="text-slate-400 ml-1">
              Location is only visible when the phone or device owner explicitly grants GPS consent.
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition-colors text-xs whitespace-nowrap self-start sm:self-auto cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" />
          <span>How Consent Works</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4 text-slate-200 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Privacy & Consent Protection</h3>
                <p className="text-xs text-slate-400">Zero unauthorized tracking policy</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>The Phone Number Myth vs Reality</span>
                </div>
                <p className="text-xs text-slate-300">
                  A mobile phone number alone does <strong>not</strong> provide live GPS satellite access to any third-party app.
                  Only cellular carriers and law enforcement with judicial warrants have cell-tower triangulation capability.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>How BeaconPath Works</span>
                </div>
                <p className="text-xs text-slate-300">
                  BeaconPath creates a secure, encrypted tracking request link for the verified phone number. The device owner opens the link and must tap <strong>&quot;Allow Location Access&quot;</strong> in their mobile browser.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Instant Revocation</span>
                </div>
                <p className="text-xs text-slate-300">
                  The person sharing their location can stop broadcasting or delete the live session at any time with a single tap.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
