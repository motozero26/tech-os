import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ClipboardList,
  CheckCircle,
  Users,
  Barcode,
  ArrowUpRight,
  Clock,
  ChevronRight,
  TrendingUp,
  Settings,
  Store,
  Package,
  FileText
} from 'lucide-react';
import { api, getSavedUser } from '../api.ts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onOpenOSDetail: (id: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenOSDetail }) => {
  const user = getSavedUser();
  const [stats, setStats] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [statsData, deadlinesData, chartsData] = await Promise.all([
        api.getSummaryStats(),
        api.getUpcomingDeadlines(),
        api.getCharts('monthly')
      ]);
      setStats(statsData);
      setDeadlines(deadlinesData);
      setCharts(chartsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    // Redirect to OS search or products search
    onNavigate('os');
  }

  const shortcuts = [
    { title: 'Ordens de serviço', desc: 'Abrir, tramitar e fechar O.S.', tab: 'os', icon: ClipboardList, color: 'text-blue-400' },
    { title: 'Caixa / PDV', desc: 'Vendas, sessão e histórico', tab: 'caixa', icon: Store, color: 'text-emerald-400' },
    { title: 'Estoque & Peças', desc: 'Produtos, marcas e inventário', tab: 'estoque', icon: Package, color: 'text-amber-400' },
    { title: 'Clientes', desc: 'Aparelhos, histórico e contato', tab: 'clientes', icon: Users, color: 'text-purple-400' },
    { title: 'Financeiro', desc: 'Receitas, despesas e comissões', tab: 'financeiro', icon: DollarSign, color: 'text-green-400' },
    { title: 'Configurações', desc: 'Empresa, equipe e auditoria', tab: 'configuracoes', icon: Settings, color: 'text-slate-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando painel de controle...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            Resumo da Operação
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Olá, {user?.name || 'Administrador'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Acompanhe em tempo real o fluxo de ordens de serviço, vendas e caixa da Matriz.
          </p>
        </div>

        {/* Barcode Quick Search */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl max-w-md w-full">
          <div className="p-2 text-blue-400">
            <Barcode className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Leitura de código de barras ou O.S…"
            className="bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none flex-1"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Vendas do Dia</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              R$ {stats?.sales_today_total?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{stats?.sales_today_count || 0}</span> vendas concluídas hoje
          </div>
        </div>

        {/* Open OS */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">O.S. em Andamento</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {stats?.open_os || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Aparelhos em avaliação ou bancada
          </div>
        </div>

        {/* Ready OS */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Prontas para Entrega</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {stats?.ready_os || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Aguardando retirada do cliente
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total de Clientes</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white">
              {stats?.total_customers || 0}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Cadastrados na base da loja
          </div>
        </div>
      </div>

      {/* Shortcuts Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
          Atalhos Rápidos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {shortcuts.map((sc, i) => {
            const Icon = sc.icon;
            return (
              <button
                key={i}
                onClick={() => onNavigate(sc.tab)}
                className="bg-slate-950/60 hover:bg-slate-800/70 p-5 rounded-2xl border border-slate-800 flex items-start gap-4 transition text-left group"
              >
                <div className={`p-3 rounded-xl bg-slate-900 border border-slate-700/60 ${sc.color} group-hover:scale-105 transition`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-100 text-sm group-hover:text-blue-400 transition flex items-center justify-between">
                    <span>{sc.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition" />
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{sc.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Deadlines & Operational Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deadlines Alert (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-950/80 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">O.S. Próximas do Prazo</h3>
            </div>
            <button
              onClick={() => onNavigate('os')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Ver todas as O.S. →
            </button>
          </div>

          {deadlines.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              Nenhuma ordem de serviço com prazo pendente para os próximos dias.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="py-2.5 px-3">O.S.</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Aparelho</th>
                    <th className="py-2.5 px-3">Prazo</th>
                    <th className="py-2.5 px-3">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {deadlines.map((os) => (
                    <tr
                      key={os.id}
                      onClick={() => onOpenOSDetail(os.id)}
                      className="hover:bg-slate-900/60 cursor-pointer transition"
                    >
                      <td className="py-3 px-3 font-bold text-blue-400 font-mono">#{os.code}</td>
                      <td className="py-3 px-3 text-slate-200">{os.customer_name}</td>
                      <td className="py-3 px-3 text-slate-300">{os.device_brand} {os.device_model}</td>
                      <td className="py-3 px-3 text-amber-400 text-xs font-mono">
                        {os.deadline_date ? new Date(os.deadline_date).toLocaleDateString('pt-BR') : 'Sem data'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {os.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Help & System Tips */}
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Fluxo de Balcão</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              O sistema integra a entrada de aparelhos com checklist de 29 itens para garantir segurança jurídica e conformidade com o Código de Defesa do Consumidor.
            </p>

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>Impressão Térmica:</span>
                <span className="font-semibold text-blue-400">80mm e 58mm</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>Garantia Padrão:</span>
                <span className="font-semibold text-emerald-400">90 Dias (CDC)</span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                <span>Seminovos:</span>
                <span className="font-semibold text-purple-400">Compra e Venda</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => onNavigate('os_new')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition text-center"
            >
              Abrir Nova Ordem de Serviço
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
