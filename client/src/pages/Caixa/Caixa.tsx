import React, { useState, useEffect } from 'react';
import {
  Store,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Unlock,
  ShoppingBag,
  Smartphone,
  History,
  AlertCircle,
  Plus
} from 'lucide-react';
import { api } from '../../api.ts';

interface CaixaProps {
  onOpenPDV: () => void;
  onOpenSeminovos: () => void;
}

export const Caixa: React.FC<CaixaProps> = ({ onOpenPDV, onOpenSeminovos }) => {
  const [cashStatus, setCashStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<'supply' | 'bleed'>('supply');

  // Form states
  const [openBalance, setOpenBalance] = useState('100.00');
  const [closeBalance, setCloseBalance] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');

  useEffect(() => {
    loadCash();
  }, []);

  async function loadCash() {
    setLoading(true);
    try {
      const data = await api.getCashStatus();
      setCashStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenCash(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.openCash({ opening_balance: Number(openBalance) || 0 });
      setShowOpenModal(false);
      loadCash();
    } catch (e: any) {
      alert(e.message || 'Erro ao abrir caixa');
    }
  }

  async function handleCloseCash(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.closeCash({ closing_balance: Number(closeBalance) || 0 });
      setShowCloseModal(false);
      loadCash();
    } catch (e: any) {
      alert(e.message || 'Erro ao fechar caixa');
    }
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!txAmount || !txDesc) return;
    try {
      await api.addCashTransaction({
        type: txType,
        amount: Number(txAmount),
        description: txDesc
      });
      setShowTxModal(false);
      setTxAmount('');
      setTxDesc('');
      loadCash();
    } catch (e: any) {
      alert(e.message || 'Erro ao registrar movimentação');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando dados do caixa...</span>
        </div>
      </div>
    );
  }

  const isOpen = cashStatus?.isOpen;
  const session = cashStatus?.session;
  const transactions = cashStatus?.transactions || [];
  const summaryByMethod = cashStatus?.summaryByMethod || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner / Session State */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
            isOpen ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-amber-600 shadow-amber-500/20'
          }`}>
            {isOpen ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                Sessão Matriz
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {isOpen ? 'Caixa Aberto' : 'Caixa Fechado'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Frente de Caixa & Operações
            </h2>
            {isOpen && (
              <p className="text-xs text-slate-400">
                Aberto por {session?.user_name} em {new Date(session?.opened_at).toLocaleString('pt-BR')} • Fundo Inicial: R$ {session?.opening_balance.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {!isOpen ? (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setTxType('supply');
                  setShowTxModal(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                <span>Suprimento</span>
              </button>

              <button
                onClick={() => {
                  setTxType('bleed');
                  setShowTxModal(true);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
              >
                <ArrowUpCircle className="w-4 h-4 text-red-400" />
                <span>Sangria</span>
              </button>

              <button
                onClick={() => setShowCloseModal(true)}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* PDV / Nova Venda */}
        <button
          onClick={onOpenPDV}
          disabled={!isOpen}
          className="bg-slate-950 p-6 rounded-2xl border border-slate-800 hover:border-blue-500/60 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition">
              Nova Venda (PDV)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Venda rápida de balcão com leitor de código de barras, descontos e formas de pagamento.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-400 mt-4 block">
            {isOpen ? 'Iniciar Venda →' : 'Requer caixa aberto'}
          </span>
        </button>

        {/* Seminovos */}
        <button
          onClick={onOpenSeminovos}
          disabled={!isOpen}
          className="bg-slate-950 p-6 rounded-2xl border border-slate-800 hover:border-purple-500/60 transition text-left group disabled:opacity-50 disabled:cursor-not-allowed flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition">
              Compra & Venda de Seminovos
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Avaliação e compra de aparelhos usados de clientes com saída do caixa e termo de garantia.
            </p>
          </div>
          <span className="text-xs font-bold text-purple-400 mt-4 block">
            {isOpen ? 'Gerenciar Seminovos →' : 'Requer caixa aberto'}
          </span>
        </button>

        {/* Current Balance in Register */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Saldo em Caixa</h3>
            <p className="text-xs text-slate-400 mt-1">
              Total acumulado em dinheiro e pagamentos nesta sessão.
            </p>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black font-mono text-emerald-400">
              R$ {cashStatus?.totalBalance?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown by Payment Method & Session Movements */}
      {isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Method Summary */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              Arrecadação por Forma
            </h3>
            {summaryByMethod.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhuma transação nesta sessão ainda.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {summaryByMethod.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300 font-semibold">{m.payment_method}</span>
                    <span className="font-mono font-bold text-white">R$ {m.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Movimentações da Sessão
              </h3>
              <span className="text-xs text-slate-400">{transactions.length} registro(s)</span>
            </div>

            {transactions.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-2">Tipo</th>
                      <th className="py-2 px-2">Descrição</th>
                      <th className="py-2 px-2">Forma</th>
                      <th className="py-2 px-2 text-right">Valor</th>
                      <th className="py-2 px-2 text-right">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.map((tx: any) => {
                      const isPositive = ['sale', 'os_payment', 'os_advance', 'supply'].includes(tx.type);
                      return (
                        <tr key={tx.id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-200">{tx.description}</td>
                          <td className="py-2.5 px-2 text-slate-400">{tx.payment_method}</td>
                          <td className={`py-2.5 px-2 text-right font-mono font-bold ${
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {isPositive ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-500 font-mono">
                            {new Date(tx.created_at).toLocaleTimeString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Open Cash */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleOpenCash} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Abertura de Caixa</h3>
            <p className="text-xs text-slate-400">Informe o valor do suprimento inicial (fundo de troco).</p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Suprimento Inicial (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                value={openBalance}
                onChange={(e) => setOpenBalance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Confirmar Abertura
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Close Cash */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCloseCash} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Fechamento de Caixa</h3>
            <p className="text-xs text-slate-400">Conferência final de valores em dinheiro na gaveta.</p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Valor Apurado em Gaveta (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={closeBalance}
                onChange={(e) => setCloseBalance(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
              >
                Fechar Sessão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Sangria / Suprimento */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddTransaction} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">
              {txType === 'supply' ? 'Novo Suprimento (Entrada)' : 'Nova Sangria (Retirada)'}
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Justificativa / Descrição *</label>
              <input
                type="text"
                required
                placeholder={txType === 'supply' ? 'Ex: Reforço de troco' : 'Ex: Pagamento motoboy / Retirada do dono'}
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl ${
                  txType === 'supply' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
