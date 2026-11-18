import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Plus,
  CheckCircle,
  Clock,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { api } from '../../api.ts';

export const Financeiro: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'rates' | 'commissions'>('expenses');
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cardRates, setCardRates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('Aluguel e Contas');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadFinancialData();
  }, [activeTab]);

  async function loadFinancialData() {
    setLoading(true);
    try {
      const sum = await api.getFinancialSummary();
      setSummary(sum);

      if (activeTab === 'expenses') {
        const exps = await api.getExpenses();
        setExpenses(exps);
      } else if (activeTab === 'rates') {
        const rates = await api.getCardRates();
        setCardRates(rates);
      } else if (activeTab === 'commissions') {
        const comms = await api.getCommissions();
        setCommissions(comms);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!desc || !amount || !dueDate) return;
    try {
      await api.createExpense({
        description: desc,
        category: cat,
        due_date: dueDate,
        amount: Number(amount)
      });
      setShowAddExpenseModal(false);
      setDesc('');
      setAmount('');
      loadFinancialData();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar despesa');
    }
  }

  async function handlePayExpense(id: number) {
    try {
      await api.payExpense(id, 'Dinheiro');
      loadFinancialData();
    } catch (e: any) {
      alert(e.message || 'Erro ao quitar despesa');
    }
  }

  async function handleSaveRates() {
    try {
      await api.saveCardRates(cardRates);
      alert('Taxas de cartão salvas com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar taxas');
    }
  }

  function updateRatePercent(index: number, newRate: number) {
    setCardRates(prev => {
      const updated = [...prev];
      updated[index].rate_percent = newRate;
      return updated;
    });
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Gestão Financeira</h2>
          <p className="text-xs text-slate-400">
            Fluxo de caixa, controle de custos da loja, taxas de cartão e comissões.
          </p>
        </div>

        {activeTab === 'expenses' && (
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Despesa</span>
          </button>
        )}
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenues */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Faturamento Bruto</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-white">
              R$ {summary?.total_revenue?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            O.S.: R$ {summary?.os_revenue?.toFixed(2)} • Vendas: R$ {summary?.sales_revenue?.toFixed(2)}
          </div>
        </div>

        {/* Expenses Paid */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Despesas Pagas</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-red-400">
              R$ {summary?.expenses_paid?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Custos operacionais liquidados
          </div>
        </div>

        {/* Expenses Pending */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Contas a Pagar</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-amber-400">
              R$ {summary?.expenses_pending?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Despesas em aberto com fornecedores
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Resultado Líquido</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-blue-400">
              R$ {summary?.net_profit?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Entradas totais menos saídas pagas
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'expenses'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Despesas & Custos</span>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'rates'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Taxas de Cartão</span>
        </button>

        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'commissions'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Comissões dos Técnicos</span>
        </button>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Nenhuma despesa registrada.
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-semibold text-white">{e.description}</td>
                      <td className="py-3 px-4 text-slate-400">{e.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {new Date(e.due_date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        R$ {e.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                          e.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {e.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {e.status !== 'paid' && (
                          <button
                            onClick={() => handlePayExpense(e.id)}
                            className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold transition"
                          >
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card Rates Tab */}
      {activeTab === 'rates' && (
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-base">Taxas de Cartão por Parcelas</h3>
              <p className="text-xs text-slate-400">Configure as taxas cobradas pela sua maquininha para débito e crédito.</p>
            </div>
            <button
              onClick={handleSaveRates}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition"
            >
              Salvar Alterações
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {cardRates.map((r, idx) => (
              <div key={r.id || idx} className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    {r.card_type === 'debit' ? 'Débito' : `Crédito ${r.installments}x`}
                  </span>
                  <p className="text-[11px] text-slate-500">Taxa descontada</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={r.rate_percent}
                    onChange={(e) => updateRatePercent(idx, Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-right font-mono text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technician Commissions Tab */}
      {activeTab === 'commissions' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Técnico</th>
                  <th className="py-3 px-4 text-center">Taxa de Comissão</th>
                  <th className="py-3 px-4 text-right">Total em Serviços</th>
                  <th className="py-3 px-4 text-right">Comissão Apurada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4 font-semibold text-white">{c.name}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {c.commission_rate}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      R$ {c.services_total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {c.commission_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Expense */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateExpense} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Nova Despesa da Loja</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descrição *</label>
              <input
                type="text"
                required
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Ex: Conta de Luz, Aluguel, Compra de Peças"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                <select
                  value={cat}
                  onChange={(e) => setCat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="Aluguel e Contas">Aluguel e Contas</option>
                  <option value="Fornecedores de Peças">Fornecedores de Peças</option>
                  <option value="Salários e Pró-labore">Salários e Pró-labore</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Outros Custos">Outros Custos</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Data de Vencimento *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Despesa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
