import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  Package,
  CreditCard,
  DollarSign,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings,
  Lock,
  Zap,
  Save,
  ChevronRight
} from 'lucide-react';
import { api } from '../../api.ts';
import { Plan, SubscriptionPayment } from '../../types.ts';

export interface AdminSaaSProps {
  onBackToStore?: () => void;
  isStandalone?: boolean;
}

export const AdminSaaS: React.FC<AdminSaaSProps> = ({ onBackToStore, isStandalone }) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans' | 'payments' | 'gateways'>('tenants');
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [gateways, setGateways] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Search
  const [searchTenant, setSearchTenant] = useState('');

  // Modals
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [showEditTenantModal, setShowEditTenantModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // New Tenant Form
  const [tName, setTName] = useState('');
  const [tTradeName, setTTradeName] = useState('');
  const [tCnpj, setTCnpj] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tAdminName, setTAdminName] = useState('');
  const [tAdminEmail, setTAdminEmail] = useState('');
  const [tAdminPass, setTAdminPass] = useState('123456');
  const [tPlanId, setTPlanId] = useState(2);
  const [tTrialDays, setTTrialDays] = useState(7);

  // Plan Edit
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanToEdit, setSelectedPlanToEdit] = useState<Plan | null>(null);
  const [planName, setPlanName] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [planPriceM, setPlanPriceM] = useState('');
  const [planFeatures, setPlanFeatures] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      const statsData = await api.getSaaSStats();
      setStats(statsData);

      if (activeTab === 'tenants') {
        const t = await api.getSaaSTenants({ q: searchTenant });
        setTenants(t);
        const p = await api.getSaaSPlans();
        setPlans(p);
      } else if (activeTab === 'plans') {
        const p = await api.getSaaSPlans();
        setPlans(p);
      } else if (activeTab === 'payments') {
        const pays = await api.getSaaSPayments();
        setPayments(pays);
      } else if (activeTab === 'gateways') {
        const g = await api.getSaaSGateways();
        setGateways(g);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!tName || !tAdminEmail || !tAdminPass) return;
    try {
      await api.createSaaSTenant({
        name: tName,
        trade_name: tTradeName || tName,
        cnpj: tCnpj,
        phone: tPhone,
        admin_name: tAdminName || 'Administrador',
        admin_email: tAdminEmail,
        admin_password: tAdminPass,
        plan_id: tPlanId,
        trial_days: tTrialDays
      });
      setShowNewTenantModal(false);
      resetTenantForm();
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar loja');
    }
  }

  function resetTenantForm() {
    setTName('');
    setTTradeName('');
    setTCnpj('');
    setTPhone('');
    setTAdminName('');
    setTAdminEmail('');
    setTAdminPass('123456');
    setTPlanId(2);
    setTTrialDays(7);
  }

  async function handleExtendAccess(tenantId: number, days: number) {
    try {
      await api.updateSaaSTenant(tenantId, { add_days: days, subscription_status: 'active' });
      alert(`Acesso estendido em +${days} dias com sucesso!`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao estender acesso');
    }
  }

  async function handleToggleStatus(tenant: any) {
    const newStatus = tenant.subscription_status === 'suspended' ? 'active' : 'suspended';
    try {
      await api.updateSaaSTenant(tenant.id, { subscription_status: newStatus });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao alterar status');
    }
  }

  async function handleApprovePayment(paymentId: number) {
    try {
      await api.approveSaaSPayment(paymentId);
      alert('Pagamento aprovado e acesso da loja renovado com sucesso!');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao aprovar pagamento');
    }
  }

  async function handleSaveGateways(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateSaaSGateways(gateways);
      alert('Configurações de APIs de pagamento salvas com sucesso!');
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar gateways');
    }
  }

  function openEditPlan(p: Plan) {
    setSelectedPlanToEdit(p);
    setPlanName(p.name);
    setPlanDesc(p.description || '');
    setPlanPriceM(String(p.price_monthly));
    setPlanFeatures(Array.isArray(p.features) ? p.features.join('\n') : '');
    setShowPlanModal(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!planPriceM || !selectedPlanToEdit) return;
    try {
      const featuresArr = planFeatures.split('\n').map(f => f.trim()).filter(f => f.length > 0);
      await api.updateSaaSPlan(selectedPlanToEdit.id, {
        name: planName,
        description: planDesc,
        price_monthly: Number(planPriceM),
        price_yearly: Number(planPriceM),
        features: featuresArr
      });
      setShowPlanModal(false);
      setSelectedPlanToEdit(null);
      alert(`Plano ${planName} atualizado com sucesso!`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao atualizar plano');
    }
  }

  return (
    <div className={`space-y-6 ${isStandalone ? 'min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8' : 'max-w-7xl mx-auto'}`}>
      {/* Standalone Master Header */}
      {isStandalone && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-wide">Assistencia shop — Central Master SaaS</h1>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase">
                  Página do Dono do Sistema
                </span>
              </div>
              <p className="text-xs text-slate-400">Gerenciamento exclusivo das lojas parceiras, planos mensais Prata e Ouro e integrações financeiras.</p>
            </div>
          </div>

          {onBackToStore && (
            <button
              onClick={onBackToStore}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-sm"
            >
              <span>← Voltar ao Painel da Loja</span>
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
              Super Admin SaaS
            </span>
            <h2 className="text-2xl font-bold text-white tracking-wide">Painel da Plataforma</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Administração global de lojas parceiras, planos, controle de vencimentos e integração de APIs de pagamento.
          </p>
        </div>

        {activeTab === 'tenants' && (
          <button
            onClick={() => setShowNewTenantModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Nova Loja</span>
          </button>
        )}
      </div>

      {/* SaaS Global KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* MRR */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>MRR Recorrente</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-emerald-400">
              R$ {stats?.mrr?.toFixed(2) || '0.00'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Receita mensal ativa</p>
        </div>

        {/* Total Tenants */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total de Lojas</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-white">
              {stats?.total_tenants || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Cadastradas na base</p>
        </div>

        {/* Active Paying */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Lojas Ativas</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-white">
              {stats?.active_tenants || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Com assinatura em dia</p>
        </div>

        {/* Trial */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Em Período de Teste</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-amber-400">
              {stats?.trial_tenants || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Acessando teste grátis</p>
        </div>

        {/* Overdue */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Vencidas / Bloqueadas</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black font-mono text-red-400">
              {stats?.overdue_tenants || 0}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Sem pagamento ativo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('tenants')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'tenants'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Lojas Clientes (Tenants)</span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Planos & Preços</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'payments'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Faturas & Pagamentos</span>
        </button>

        <button
          onClick={() => setActiveTab('gateways')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'gateways'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Gateways de Pagamento (APIs)</span>
        </button>
      </div>

      {/* Tenants Tab */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                placeholder="Buscar por nome da loja, código, CNPJ ou e-mail…"
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                    <th className="py-3 px-4">Loja / Código</th>
                    <th className="py-3 px-4">Contato / CNPJ</th>
                    <th className="py-3 px-4">Plano</th>
                    <th className="py-3 px-4">Validade do Acesso</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {tenants.map(t => {
                    const isOverdue = t.access_expires_at && new Date(t.access_expires_at) < new Date();
                    return (
                      <tr key={t.id} className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{t.name}</div>
                          <div className="text-[11px] text-blue-400 font-mono">Código: {t.company_code || 'ctnh9fbj'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200">{t.email}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{t.cnpj || t.phone || '-'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">
                          {t.plan_title || t.plan_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={isOverdue ? 'text-red-400 font-bold' : 'text-slate-200'}>
                            {t.access_expires_at ? new Date(t.access_expires_at).toLocaleDateString('pt-BR') : 'Sem data'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            t.subscription_status === 'active' && !isOverdue
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.subscription_status === 'trial' && !isOverdue
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {isOverdue ? 'Vencido' : t.subscription_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleExtendAccess(t.id, 30)}
                              title="Adicionar 30 dias de acesso"
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-[11px] font-semibold transition"
                            >
                              +30 Dias
                            </button>
                            <button
                              onClick={() => handleExtendAccess(t.id, 90)}
                              title="Adicionar 90 dias de acesso"
                              className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-[11px] font-semibold transition"
                            >
                              +90 Dias
                            </button>
                            <button
                              onClick={() => handleToggleStatus(t)}
                              title="Suspender ou Reativar Loja"
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                                t.subscription_status === 'suspended'
                                  ? 'bg-emerald-600/20 text-emerald-400'
                                  : 'bg-red-600/20 text-red-400'
                              }`}
                            >
                              {t.subscription_status === 'suspended' ? 'Ativar' : 'Suspender'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Plans Tab - Exclusively 2 Monthly Plans: Prata e Ouro */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                <span>Gestão Oficial de Planos Mensais SaaS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                A plataforma opera com 2 planos mensais: <strong>Prata (R$ 49,90)</strong> e <strong>Ouro (R$ 79,90)</strong>. A emissão de notas fiscais (NF-e com Certificado Digital A1 + NFS-e MEI) é uma funcionalidade exclusiva do Plano Ouro.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/40 border border-blue-800/50 rounded-xl text-blue-300 text-xs font-semibold shrink-0">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Cobrança 100% Mensal</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map(p => {
              const isOuro = p.name === 'Ouro';
              return (
                <div
                  key={p.id}
                  className={`bg-slate-950 p-6 rounded-2xl border flex flex-col justify-between transition-all relative ${
                    isOuro
                      ? 'border-amber-500/60 shadow-xl shadow-amber-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isOuro ? (
                    <span className="absolute -top-3 right-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-slate-950" />
                      Exclusivo: Emissão Fiscal Liberada
                    </span>
                  ) : (
                    <span className="absolute -top-3 right-6 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border border-slate-700">
                      Gestão Padrão Sem Emissão Fiscal
                    </span>
                  )}

                  <div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-black text-xl ${isOuro ? 'text-amber-400' : 'text-white'}`}>
                          Plano {p.name}
                        </h4>
                        {isOuro && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            NF-e + NFS-e MEI
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-blue-400 font-semibold bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-900/40">
                        {p.subscribers_count || 0} lojas assinantes
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 min-h-[32px]">{p.description}</p>

                    <div className="mt-4 mb-4">
                      <span className="text-3xl font-black font-mono text-white">
                        R$ {p.price_monthly.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold"> /mês</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs">
                      {p.features?.map((f: string, i: number) => {
                        const isFiscalFeat = f.includes('Nota Fiscal');
                        return (
                          <div key={i} className="flex items-center gap-2">
                            {isFiscalFeat && !isOuro ? (
                              <span className="w-3.5 h-3.5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0">✕</span>
                            ) : (
                              <span className={`font-bold ${isFiscalFeat ? 'text-amber-400' : 'text-emerald-400'}`}>✓</span>
                            )}
                            <span className={isFiscalFeat ? (isOuro ? 'font-bold text-amber-300' : 'text-slate-500 line-through') : 'text-slate-300'}>
                              {f}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <button
                      onClick={() => openEditPlan(p)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isOuro
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Editar Valores & Recursos</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Fatura</th>
                  <th className="py-3 px-4">Loja</th>
                  <th className="py-3 px-4">Plano / Ciclo</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {payments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">#{pay.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{pay.company_name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{pay.plan_name} ({pay.billing_cycle})</td>
                    <td className="py-3.5 px-4 text-slate-400">{pay.payment_method}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      R$ {pay.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        pay.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {pay.status === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {pay.status !== 'paid' && (
                        <button
                          onClick={() => handleApprovePayment(pay.id)}
                          className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-xs font-semibold transition"
                        >
                          Aprovar Manual
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gateways Tab */}
      {activeTab === 'gateways' && (
        <form onSubmit={handleSaveGateways} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Integração com APIs de Pagamento</h3>
            <p className="text-xs text-slate-400">
              Configure as credenciais do Mercado Pago, Asaas ou Chave PIX direta para validação de renovações automáticas.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Gateway Ativo para Cobrança dos Planos
              </label>
              <select
                value={gateways.active_gateway || 'manual_pix'}
                onChange={(e) => setGateways({ ...gateways, active_gateway: e.target.value })}
                className="w-full sm:w-80 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="manual_pix">Chave PIX Direta (Copia e Cola Instantâneo)</option>
                <option value="mercadopago">Mercado Pago (PIX + Cartão de Crédito Automático)</option>
                <option value="infinitepay">InfinitePay (PIX + Link de Pagamento)</option>
                <option value="asaas">Asaas (PIX + Boleto + Cartão)</option>
              </select>
            </div>

            {/* PIX Direct Section */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Configuração PIX Direto (Sem Intermediários)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo de Chave</label>
                  <select
                    value={gateways.pix_key_type || 'CNPJ'}
                    onChange={(e) => setGateways({ ...gateways, pix_key_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Chave PIX</label>
                  <input
                    type="text"
                    value={gateways.pix_key || ''}
                    onChange={(e) => setGateways({ ...gateways, pix_key: e.target.value })}
                    placeholder="Sua chave PIX"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nome do Favorecido</label>
                  <input
                    type="text"
                    value={gateways.pix_receiver_name || ''}
                    onChange={(e) => setGateways({ ...gateways, pix_receiver_name: e.target.value })}
                    placeholder="Nome da sua empresa"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Mercado Pago Section */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                API Mercado Pago
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Access Token (Produção)</label>
                  <input
                    type="password"
                    value={gateways.mercadopago_token || ''}
                    onChange={(e) => setGateways({ ...gateways, mercadopago_token: e.target.value })}
                    placeholder="APP_USR-..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Public Key</label>
                  <input
                    type="text"
                    value={gateways.mercadopago_public_key || ''}
                    onChange={(e) => setGateways({ ...gateways, mercadopago_public_key: e.target.value })}
                    placeholder="APP_USR-..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* InfinitePay Section */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                API InfinitePay (CloudWalk)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">API Key / Token</label>
                  <input
                    type="password"
                    value={gateways.infinitepay_api_key || ''}
                    onChange={(e) => setGateways({ ...gateways, infinitepay_api_key: e.target.value })}
                    placeholder="inf_sec_..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Handle / Merchant ID</label>
                  <input
                    type="text"
                    value={gateways.infinitepay_handle || ''}
                    onChange={(e) => setGateways({ ...gateways, infinitepay_handle: e.target.value })}
                    placeholder="$minhaempresa"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ambiente</label>
                  <select
                    value={gateways.infinitepay_environment || 'production'}
                    onChange={(e) => setGateways({ ...gateways, infinitepay_environment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="production">Produção</option>
                    <option value="sandbox">Sandbox (Testes)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Asaas Section */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                API Asaas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">API Key</label>
                  <input
                    type="password"
                    value={gateways.asaas_api_key || ''}
                    onChange={(e) => setGateways({ ...gateways, asaas_api_key: e.target.value })}
                    placeholder="$aact_YTU5YTE0M2M6..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ambiente</label>
                  <select
                    value={gateways.asaas_environment || 'sandbox'}
                    onChange={(e) => setGateways({ ...gateways, asaas_environment: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="sandbox">Sandbox (Testes)</option>
                    <option value="production">Produção</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Webhook Endpoint Info */}
            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300">Endpoints de Webhook para Liberação Automática do Acesso:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 select-all">
                  <span className="text-blue-400 font-bold block text-[10px]">Mercado Pago Webhook:</span>
                  https://seuservidor.com.br/api/saas/webhook/mercadopago
                </div>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 select-all">
                  <span className="text-emerald-400 font-bold block text-[10px]">InfinitePay Webhook:</span>
                  https://seuservidor.com.br/api/saas/webhook/infinitepay
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Assim que o cliente paga no Mercado Pago ou InfinitePay, a notificação IPN/Webhook restaura o status da loja para &quot;Ativo&quot; e renova os acessos instantaneamente.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações de Gateway</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal: New Store / Tenant */}
      {showNewTenantModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateTenant} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white text-base">Cadastrar Nova Loja Cliente</h3>
            <p className="text-xs text-slate-400">Cria a empresa parceira com administrador próprio e liberação de período de teste.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome da Loja *</label>
                <input
                  type="text"
                  required
                  value={tName}
                  onChange={(e) => setTName(e.target.value)}
                  placeholder="Ex: Assistência do João Celulares"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CNPJ ou CPF</label>
                  <input
                    type="text"
                    value={tCnpj}
                    onChange={(e) => setTCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={tPhone}
                    onChange={(e) => setTPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="block text-xs font-bold text-slate-300 mb-2">Dados de Acesso do Responsável da Loja</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nome do Responsável</label>
                    <input
                      type="text"
                      value={tAdminName}
                      onChange={(e) => setTAdminName(e.target.value)}
                      placeholder="Nome do dono da loja"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">E-mail de Login *</label>
                    <input
                      type="email"
                      required
                      value={tAdminEmail}
                      onChange={(e) => setTAdminEmail(e.target.value)}
                      placeholder="dono@lojacliente.com"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Senha Inicial *</label>
                    <input
                      type="password"
                      required
                      value={tAdminPass}
                      onChange={(e) => setTAdminPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Plano Inicial</label>
                  <select
                    value={tPlanId}
                    onChange={(e) => setTPlanId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} - R$ {p.price_monthly.toFixed(2)}/mês {p.name === 'Ouro' ? '(com Nota Fiscal)' : '(sem Nota Fiscal)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Dias de Teste Grátis</label>
                  <input
                    type="number"
                    value={tTrialDays}
                    onChange={(e) => setTTrialDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewTenantModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Cadastrar Loja
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Plan */}
      {showPlanModal && selectedPlanToEdit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSavePlan} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Editar Plano {selectedPlanToEdit.name}
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                selectedPlanToEdit.name === 'Ouro'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {selectedPlanToEdit.name === 'Ouro' ? 'Com Emissão Fiscal' : 'Sem Emissão Fiscal'}
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome do Plano</label>
              <input
                type="text"
                disabled
                value={planName}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Descrição</label>
              <input
                type="text"
                value={planDesc}
                onChange={(e) => setPlanDesc(e.target.value)}
                placeholder="Descrição curta do plano"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Preço Mensal (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={planPriceM}
                onChange={(e) => setPlanPriceM(e.target.value)}
                placeholder="49.90"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">Cobrança estritamente mensal.</p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Recursos Incluídos (1 por linha)</label>
              <textarea
                rows={5}
                value={planFeatures}
                onChange={(e) => setPlanFeatures(e.target.value)}
                placeholder="Recursos do plano..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowPlanModal(false);
                  setSelectedPlanToEdit(null);
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
