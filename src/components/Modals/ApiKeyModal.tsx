import React, { useState } from 'react';
import { X, Key, Save, AlertTriangle, ExternalLink, HelpCircle, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { getStoredGeminiKey, setStoredGeminiKey } from '../../services/geminiService';

interface ApiKeyModalProps {
  onClose: () => void;
  onSaved?: () => void;
}

export function ApiKeyModal({ onClose, onSaved }: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState(getStoredGeminiKey());
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredGeminiKey(keyInput);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      if (onSaved) onSaved();
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setKeyInput('');
    setStoredGeminiKey('');
    if (onSaved) onSaved();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-none mb-1">Gemini API Key</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client-Side AI Activation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider block">
              Your API Key
            </label>
            <input 
              type="password"
              placeholder="AIzaSy..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 font-mono outline-none transition-all placeholder:text-slate-300"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
          </div>

          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 flex gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-900">Security & Privacy Assurance</p>
              <p className="leading-relaxed text-amber-700/90">
                Your key is stored <strong>locally in your browser</strong> (<code className="font-mono bg-amber-100/50 px-1 rounded">localStorage</code>) and is sent directly to Google Gemini APIs. It is never transmitted to any third-party server.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex gap-3 text-slate-700">
            <HelpCircle className="w-5 h-5 shrink-0 text-slate-500 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-800">How to obtain a free key?</p>
              <p className="leading-relaxed text-slate-500">
                You can generate a free developer key instantly via Google AI Studio.
              </p>
              <a 
                href="https://aistudio.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition-colors mt-1"
              >
                Go to Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {keyInput && (
              <button 
                type="button"
                onClick={handleClear}
                className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors text-xs font-black uppercase tracking-wider"
              >
                Clear
              </button>
            )}
            <button 
              type="submit"
              disabled={isSaved}
              className="flex-1 bg-slate-900 hover:bg-black text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider disabled:bg-emerald-600"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 animate-scale-up" />
                  Key Saved Successfully
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Key to Browser
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
