import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Printer,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileText,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { api } from '../../api.ts';
import { ServiceOrder } from '../../types.ts';

interface OSHubProps {
  onOpenNewOS: () => void;
  onOpenOSDetail: (id: number) => void;
}

export const OSHub: React.FC<OSHubProps> = ({ onOpenNewOS, onOpenOSDetail }) => {
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [counts, setCounts] = useState<any>({ total: 0, evaluation: 0, authorized: 0, ready: 0, finished: 0, report: 0 });
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeGroup]);

  async function loadData() {
    setLoading(true);
    try {
      const [hubCounts, osData] = await Promise.all([
        api.getOSHubCounts(),
        api.getOSList({ group: activeGroup, q: search })
      ]);
      setCounts(hubCounts);
      setOrders(osData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadData();
  }

  const tabs = [
    { id: 'all', label: 'Todas as O.S.', count: counts.total, desc: 'Histórico completo' },
    { id: 'evaluation', label: 'Aguardando avaliação', count: counts.evaluation, desc: 'Entradas recentes' },
    { id: 'authorized', label: 'Autorizadas', count: counts.authorized, desc: 'Em reparo ou aguardando peça' },
    { id: 'ready', label: 'Prontas', count: counts.ready, desc: 'Prontas para entrega' },
    { id: 'finished', label: 'Finalizadas', count: counts.finished, desc: 'O.S. concluídas' },
    { id: 'report', label: 'Laudos técnicos', count: counts.report, desc: 'Documentação técnica' },
  ];

  function getStatusBadge(status: string) {
    switch (status) {
      case 'Pronta':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Autorizada':
      case 'Reparo em andamento':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Aguardando avaliação':
      case 'Aguardando orçamento':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Finalizada':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Cancelada':
      case 'Finalizada sem reparo':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Hub de Ordens de Serviço</h2>
          <p className="text-xs text-slate-400">
            Abertura, tramitação de bancada e fechamento com termo de garantia.
          </p>
        </div>

        <button
          onClick={onOpenNewOS}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Ordem de Serviço</span>
        </button>
      </div>

      {/* Queue Tabs with Counters (exact DSHOP PRO style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tabs.map((tab) => {
          const isSelected = activeGroup === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveGroup(tab.id)}
              className={`
                p-4 rounded-xl text-left border transition-all flex flex-col justify-between
                ${isSelected
                  ? 'bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:bg-slate-900 hover:border-slate-700'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black font-mono text-white">
                  {tab.count || 0}
                </span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
              </div>
              <div className="mt-2">
                <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                  {tab.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, CPF, aparelho, IMEI ou nº da O.S…"
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span>Carregando ordens de serviço...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <ClipboardList className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <p className="text-base font-semibold text-slate-400">Nenhuma O.S. encontrada nesta fila.</p>
            <p className="text-xs text-slate-500 mt-1">Crie uma nova ordem de serviço ou ajuste os filtros de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">O.S.</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Aparelho</th>
                  <th className="py-3 px-4">Defeito Relatado</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((os) => (
                  <tr
                    key={os.id}
                    onClick={() => onOpenOSDetail(os.id)}
                    className="hover:bg-slate-900/60 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-4 font-black text-blue-400 font-mono">
                      #{os.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{os.customer_name}</div>
                      <div className="text-xs text-slate-400">{os.customer_phone || os.customer_cpf || 'Sem telefone'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium">
                        {os.device_brand} {os.device_model}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {os.imei_serial ? `IMEI: ${os.imei_serial}` : (os.device_color || 'Sem cor')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400 text-xs">
                      {os.reported_defects || 'Sem defeito relatado'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(os.status)}`}>
                        {os.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      R$ {os.total_amount ? os.total_amount.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-slate-400 group-hover:text-blue-400 transition">
                        <span className="text-xs font-medium hidden sm:inline">Ver O.S.</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
