import React, { useState } from 'react';
import { Wrench, Lock, Mail, ArrowRight, AlertCircle, ArrowLeft, Zap, Sparkles } from 'lucide-react';
import { api, setAuthToken, setSavedUser } from '../api.ts';

interface LoginProps {
  onLoginSuccess: () => void;
  onBackToLanding?: () => void;
  selectedPlan?: string | null;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBackToLanding, selectedPlan }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.login({ email, password });
      setAuthToken(data.token);
      setSavedUser(data.user);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative">
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Site / Conhecer o TechOS</span>
        </button>
      )}

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {selectedPlan && (
          <div className="mb-6 p-3 rounded-xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/30 flex items-center gap-2.5 text-xs text-blue-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              Plano Selecionado: <strong className="text-white">{selectedPlan}</strong> — Efetue login para acessar seu painel.
            </div>
          </div>
        )}

        <div
          onClick={onBackToLanding}
          className={`flex flex-col items-center text-center mb-8 ${onBackToLanding ? 'cursor-pointer group' : ''}`}
          title={onBackToLanding ? 'Voltar para a página inicial' : undefined}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4 group-hover:scale-105 transition-transform">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide group-hover:text-blue-400 transition-colors">TechOS</h1>
          <p className="text-sm text-slate-400 mt-1">SaaS de Gestão para Assistência Técnica & Varejo</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              E-mail de acesso
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition"
          >
            <span>{loading ? 'Acessando...' : 'Entrar no Sistema'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
