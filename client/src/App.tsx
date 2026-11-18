import React, { useState, useEffect } from 'react';
import { getAuthToken } from './api.ts';
import { Layout } from './components/Layout.tsx';
import { Login } from './pages/Login.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { OSHub } from './pages/OS/OSHub.tsx';
import { NewOS } from './pages/OS/NewOS.tsx';
import { OSDetail } from './pages/OS/OSDetail.tsx';
import { Caixa } from './pages/Caixa/Caixa.tsx';
import { PDV } from './pages/Caixa/PDV.tsx';
import { Seminovos } from './pages/Caixa/Seminovos.tsx';
import { Estoque } from './pages/Estoque/Estoque.tsx';
import { Clientes } from './pages/Cadastros/Clientes.tsx';
import { Financeiro } from './pages/Financeiro/Financeiro.tsx';
import { Configuracoes } from './pages/Configuracoes/Configuracoes.tsx';
import { Assinatura } from './pages/Assinatura/Assinatura.tsx';
import { AdminSaaS } from './pages/AdminSaaS/AdminSaaS.tsx';
import { AdminSaaSStandalone } from './pages/AdminSaaS/AdminSaaSStandalone.tsx';
import { NotaFiscal } from './pages/Fiscal/NotaFiscal.tsx';

export const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [authView, setAuthView] = useState<'landing' | 'login'>(() => {
    if (window.location.hash === '#login' || window.location.pathname === '/login') {
      return 'login';
    }
    return 'landing';
  });
  const [selectedPlanForRegistration, setSelectedPlanForRegistration] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>(() => {
    return localStorage.getItem('current_tab') || 'dashboard';
  });
  const [selectedOSId, setSelectedOSId] = useState<number | null>(null);
  const [isSaaSStandaloneView, setIsSaaSStandaloneView] = useState(false);

  useEffect(() => {
    setToken(getAuthToken());
  }, []);

  useEffect(() => {
    if (currentTab) {
      localStorage.setItem('current_tab', currentTab);
    }
  }, [currentTab]);

  if (!token) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={() => setToken(getAuthToken())}
          onBackToLanding={() => setAuthView('landing')}
          selectedPlan={selectedPlanForRegistration}
        />
      );
    }
    return (
      <LandingPage
        onGoToLogin={(plan) => {
          setSelectedPlanForRegistration(plan || null);
          setAuthView('login');
        }}
      />
    );
  }

  // Página separada e dedicada do Dono do Sistema (Painel SaaS)
  if (isSaaSStandaloneView) {
    return <AdminSaaSStandalone onBackToStore={() => setIsSaaSStandaloneView(false)} />;
  }

  function handleOpenOSDetail(id: number) {
    setSelectedOSId(id);
    setCurrentTab('os_detail');
  }

  function handleOpenNewOS() {
    setCurrentTab('os_new');
  }

  function handleOpenQuickSale() {
    setCurrentTab('pdv');
  }

  return (
    <Layout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      onOpenNewOS={handleOpenNewOS}
      onOpenQuickSale={handleOpenQuickSale}
      onOpenSaaSStandalone={() => setIsSaaSStandaloneView(true)}
    >
      {currentTab === 'dashboard' && (
        <Dashboard
          onNavigate={(tab) => setCurrentTab(tab)}
          onOpenOSDetail={handleOpenOSDetail}
        />
      )}

      {currentTab === 'os' && (
        <OSHub
          onOpenNewOS={handleOpenNewOS}
          onOpenOSDetail={handleOpenOSDetail}
        />
      )}

      {currentTab === 'os_new' && (
        <NewOS
          onBack={() => setCurrentTab('os')}
          onCreated={(newId) => handleOpenOSDetail(newId)}
        />
      )}

      {currentTab === 'os_detail' && selectedOSId && (
        <OSDetail
          osId={selectedOSId}
          onBack={() => setCurrentTab('os')}
        />
      )}

      {currentTab === 'caixa' && (
        <Caixa
          onOpenPDV={() => setCurrentTab('pdv')}
          onOpenSeminovos={() => setCurrentTab('seminovos')}
        />
      )}

      {currentTab === 'pdv' && (
        <PDV onBack={() => setCurrentTab('caixa')} />
      )}

      {currentTab === 'seminovos' && (
        <Seminovos onBack={() => setCurrentTab('caixa')} />
      )}

      {currentTab === 'estoque' && <Estoque />}

      {currentTab === 'clientes' && <Clientes />}

      {currentTab === 'financeiro' && <Financeiro />}

      {currentTab === 'fiscal' && (
        <NotaFiscal onNavigateToAssinatura={() => setCurrentTab('assinatura')} />
      )}

      {currentTab === 'assinatura' && <Assinatura />}

      {currentTab === 'saas_admin' && <AdminSaaS />}

      {currentTab === 'configuracoes' && <Configuracoes />}

      {currentTab === 'landing' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl flex items-center justify-between text-xs text-blue-300">
            <span>Visualização da página pública de vendas do TechOS.</span>
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
            >
              Voltar ao Meu Início
            </button>
          </div>
          <LandingPage onGoToLogin={() => setCurrentTab('dashboard')} />
        </div>
      )}
    </Layout>
  );
};
export default App;
