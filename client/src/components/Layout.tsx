import React, { useState, useEffect } from 'react';
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  Store,
  Package,
  Users,
  DollarSign,
  Settings,
  LogOut,
  PlusCircle,
  ShoppingBag,
  Clock,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Sparkles,
  Sun,
  Moon,
  Lock,
  Check
} from 'lucide-react';
import { getSavedUser, removeAuthToken, api } from '../api.ts';
import { SubscriptionInfo } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenNewOS?: () => void;
  onOpenQuickSale?: () => void;
  onOpenSaaSStandalone?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentTab,
  setCurrentTab,
  onOpenNewOS,
  onOpenQuickSale,
  onOpenSaaSStandalone
}) => {
  const user = getSavedUser();
  const [cashStatus, setCashStatus] = useState<any>(null);
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme_mode') as 'dark' | 'light') || 'dark';
  });

  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string>('');

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  function applyTheme(mode: 'dark' | 'light') {
    if (mode === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    localStorage.setItem('theme_mode', mode);
  }

  async function toggleThemeMode() {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
    applyTheme(nextMode);
    if (company) {
      const updated = { ...company, theme_mode: nextMode };
      setCompany(updated);
      try {
        await api.updateCompany(updated);
        window.dispatchEvent(new CustomEvent('company_updated', { detail: updated }));
      } catch (err) {
        console.error('Erro ao salvar tema no backend', err);
      }
    }
  }

  useEffect(() => {
    loadCashStatus();
    loadSubscription();
    loadCompany();

    const handleCompanyUpdate = (e: any) => {
      if (e.detail) {
        setCompany(e.detail);
        if (e.detail.primary_color) {
          document.documentElement.style.setProperty('--brand-primary', e.detail.primary_color);
        }
        if (e.detail.theme_mode && e.detail.theme_mode !== themeMode) {
          setThemeMode(e.detail.theme_mode);
          applyTheme(e.detail.theme_mode);
        }
      } else {
        loadCompany();
      }
    };
    const handleBlockedOverdue = (e: any) => {
      setBlockedMessage(e.detail?.error || 'Ação bloqueada: O sistema está em Modo Somente Leitura devido ao pagamento atrasado.');
      setBlockedModalOpen(true);
    };

    window.addEventListener('company_updated', handleCompanyUpdate);
    window.addEventListener('subscription_overdue_blocked', handleBlockedOverdue);
    return () => {
      window.removeEventListener('company_updated', handleCompanyUpdate);
      window.removeEventListener('subscription_overdue_blocked', handleBlockedOverdue);
    };
  }, [currentTab]);

  async function loadCompany() {
    try {
      const comp = await api.getCompany();
      setCompany(comp);
      if (comp?.primary_color) {
        document.documentElement.style.setProperty('--brand-primary', comp.primary_color);
      }
      if (comp?.theme_mode) {
        setThemeMode(comp.theme_mode);
        applyTheme(comp.theme_mode);
      }
    } catch (e) {
      console.error('Erro ao carregar dados da empresa', e);
    }
  }

  async function loadCashStatus() {
    try {
      const data = await api.getCashStatus();
      setCashStatus(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSubscription() {
    try {
      const sub = await api.getSubscriptionCurrent();
      setSubInfo(sub);
    } catch (e) {
      console.error('Erro ao obter assinatura', e);
    }
  }

  function handleLogout() {
    removeAuthToken();
    window.location.reload();
  }

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, iconColor: 'text-blue-500' },
    { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList, badge: 'O.S.', badgeType: 'os', iconColor: 'text-indigo-500' },
    { id: 'caixa', label: 'Caixa / PDV', icon: Store, iconColor: 'text-emerald-500' },
    { id: 'estoque', label: 'Estoque & Peças', icon: Package, iconColor: 'text-amber-500' },
    { id: 'clientes', label: 'Clientes', icon: Users, iconColor: 'text-cyan-500' },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, iconColor: 'text-emerald-500' },
    { id: 'fiscal', label: 'Nota Fiscal', icon: FileText, badge: 'Ouro', badgeType: 'gold', iconColor: 'text-amber-500' },
    {
      id: 'assinatura',
      label: 'Assinatura',
      icon: CreditCard,
      iconColor: 'text-violet-500',
      badge: subInfo?.subscription_status === 'trial' ? 'Teste' : (subInfo?.is_expired ? 'Vencido' : undefined),
      badgeType: subInfo?.is_expired ? 'danger' : 'trial'
    },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, iconColor: 'text-slate-500' },
    ...(user?.role === 'master' || user?.role === 'admin'
      ? [{ id: 'saas_admin', label: 'Painel SaaS', icon: ShieldAlert, badge: 'Admin', badgeType: 'admin', iconColor: 'text-rose-500' }]
      : [])
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 print:hidden">
        <div
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition"
          title="Voltar ao início"
        >
          {company?.logo ? (
            <img src={company.logo} alt="Logo" className="h-8 max-w-[120px] object-contain rounded" />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: company?.primary_color || '#2563eb' }}
            >
              <Wrench className="w-5 h-5" />
            </div>
          )}
          <span className="font-bold text-lg text-white tracking-wide truncate max-w-[200px]">
            {company?.trade_name || company?.name || 'Minha Loja'}
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        ${mobileMenuOpen ? 'block' : 'hidden'} md:block
        w-full md:w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 print:hidden z-20
      `}>
        <div>
          {/* Logo & Brand */}
          <div
            onClick={() => setCurrentTab('dashboard')}
            className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-pointer group hover:bg-slate-100 dark:hover:bg-slate-900/60 transition"
            title="Voltar à tela inicial (Dashboard)"
          >
            {company?.logo ? (
              <img
                src={company.logo}
                alt="Logo da Loja"
                className="max-h-11 max-w-[85px] object-contain rounded"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
                style={{
                  backgroundColor: company?.primary_color || '#2563eb',
                  boxShadow: `0 10px 15px -3px ${company?.primary_color ? company.primary_color + '40' : '#2563eb40'}`
                }}
              >
                <Wrench className="w-6 h-6" />
              </div>
            )}
            <div className="truncate">
              <h1 className="font-extrabold text-base tracking-wider text-slate-900 dark:text-white truncate">
                {company?.trade_name || company?.name || 'Minha Loja'}
              </h1>
            </div>
          </div>

          {/* User badge */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-300">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Administrador'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'Master'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair do sistema"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'saas_admin' && onOpenSaaSStandalone) {
                      onOpenSaaSStandalone();
                    } else {
                      setCurrentTab(item.id);
                    }
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group
                    ${isActive
                      ? 'text-white shadow-md font-semibold'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900/80'
                    }
                  `}
                  style={isActive ? { backgroundColor: company?.primary_color || '#2563eb' } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : item.iconColor}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${
                        isActive
                          ? 'bg-white/20 text-white border border-white/30 backdrop-blur-sm'
                          : item.badgeType === 'gold'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 shadow-sm font-black'
                          : item.badgeType === 'os'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 font-bold'
                          : item.badgeType === 'admin'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40 font-bold'
                          : item.badgeType === 'danger'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40 font-bold'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 font-bold'
                      }`}
                    >
                      {item.badgeType === 'gold' && <Sparkles className="w-2.5 h-2.5" />}
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Quick Status & Cash Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 dark:text-slate-400">Status do Caixa:</span>
              <span className={`font-semibold flex items-center gap-1 ${cashStatus?.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                <span className={`w-2 h-2 rounded-full ${cashStatus?.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {cashStatus?.isOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            {cashStatus?.isOpen && (
              <div className="text-xs text-slate-700 dark:text-slate-300 font-mono mt-1">
                Saldo: R$ {cashStatus?.totalBalance?.toFixed(2) || '0.00'}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center font-medium tracking-wide">
            TechOS v1.0.0
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 min-h-screen">
        {/* Subscription Expired / Read-Only Warning Banner */}
        {subInfo?.is_expired && (
          <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 text-white px-6 py-2.5 flex items-center justify-between text-xs font-medium shadow-md print:hidden">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
              <span>
                <strong>Modo Somente Leitura Ativado:</strong> O pagamento da assinatura do sistema está atrasado (expirou em {subInfo.access_expires_at ? new Date(subInfo.access_expires_at).toLocaleDateString('pt-BR') : ''}). Você pode consultar e visualizar todos os seus registros, mas novas criações, edições e cadastros estão bloqueados.
              </span>
            </div>
            <button
              onClick={() => setCurrentTab('assinatura')}
              className="px-3.5 py-1.5 bg-white text-rose-700 rounded-lg font-bold hover:bg-slate-100 transition shadow-sm text-xs shrink-0 flex items-center gap-1.5 ml-3"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Regularizar Pagamento</span>
            </button>
          </div>
        )}

        {/* Top Navbar */}
        <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-1 rounded bg-slate-800 text-slate-300">
              Matriz
            </span>
            <span className="text-sm font-medium text-slate-300 hidden sm:inline">
              Loja e Oficina Principal
            </span>

            {/* Subscription Pill (DSHOP PRO Style) */}
            {subInfo && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs">
                <span className={`w-2 h-2 rounded-full ${subInfo.is_expired ? 'bg-red-500' : (subInfo.subscription_status === 'trial' ? 'bg-amber-400' : 'bg-emerald-400')}`} />
                <span className="text-slate-300">
                  {subInfo.subscription_status === 'trial' ? 'Teste' : `Plano ${subInfo.plan_name || 'Pro'}`} ·{' '}
                  <strong className={subInfo.is_expired ? 'text-red-400' : (subInfo.days_left <= 5 ? 'text-amber-400' : 'text-emerald-400')}>
                    {subInfo.is_expired ? 'Expirado' : `${subInfo.days_left} dias restantes`}
                  </strong>
                  {subInfo.access_expires_at && (
                    <span className="text-slate-500 text-[11px] ml-1">
                      (até {new Date(subInfo.access_expires_at).toLocaleDateString('pt-BR')})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => setCurrentTab('assinatura')}
                  className="ml-2 px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 hover:bg-blue-600 hover:text-white transition font-semibold text-[11px]"
                >
                  Renovar
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Link para Página Pública de Apresentação / Vendas */}
            <button
              type="button"
              onClick={() => setCurrentTab('landing')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                currentTab === 'landing'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Acessar a página de vendas e apresentação do TechOS"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Ver Site / Planos</span>
            </button>

            {/* Quick Dark/Light Theme Toggle */}
            <button
              type="button"
              onClick={toggleThemeMode}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shadow-sm flex items-center justify-center"
              title={themeMode === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-400" />
              )}
            </button>

            {/* SaaS Master Portal Shortcut (Dono do Sistema) */}
            {(user?.role === 'master' || user?.role === 'admin') && onOpenSaaSStandalone && (
              <button
                onClick={onOpenSaaSStandalone}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/70 hover:bg-purple-900 border border-purple-800 text-purple-300 hover:text-white text-xs font-bold transition shadow-sm"
                title="Acessar painel do dono do sistema para gerenciar as lojas clientes"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span>Painel Dono SaaS</span>
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenQuickSale) onOpenQuickSale();
                else setCurrentTab('caixa');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Venda Rápida (PDV)</span>
            </button>

            <button
              onClick={() => {
                if (onOpenNewOS) onOpenNewOS();
                else setCurrentTab('os_new');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm transition hover:brightness-110"
              style={{ backgroundColor: company?.primary_color || '#2563eb' }}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nova O.S.</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Modal: Ação Bloqueada por Modo Somente Leitura */}
      {blockedModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-white text-base">Modo Somente Leitura Ativado</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {blockedMessage || 'O pagamento da assinatura do sistema está atrasado. O sistema permite consultas a todos os dados, mas impede novas criações e edições.'}
            </p>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5" /> Consultar clientes, O.S., estoque e financeiro: <strong>Liberado</strong>
              </div>
              <div className="flex items-center gap-1 text-red-400 font-semibold">
                <X className="w-3.5 h-3.5" /> Criar novas O.S., vender ou editar dados: <strong>Bloqueado</strong>
              </div>
            </div>
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setBlockedModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Continuar Consultando
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlockedModalOpen(false);
                  setCurrentTab('assinatura');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pagar e Liberar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
