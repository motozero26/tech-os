import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Receipt,
  Boxes,
  FileText,
  BarChart3,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Camera,
  QrCode,
  Printer,
  Headphones,
  Laptop,
  Check,
  X,
  CreditCard,
  DollarSign,
  AlertCircle
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: (planName?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
  const [activeTab, setActiveTab] = useState<'os' | 'pdv' | 'seminovos' | 'fiscal' | 'dashboard'>('os');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white font-sans">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">TechOS</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Gestão para Assistência Técnica & Varejo
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#recursos" className="hover:text-blue-400 transition-colors">
              Recursos
            </a>
            <a href="#telas" className="hover:text-blue-400 transition-colors">
              Telas do Sistema
            </a>
            <a href="#como-funciona" className="hover:text-blue-400 transition-colors">
              Como Funciona
            </a>
            <a href="#planos" className="hover:text-blue-400 transition-colors">
              Planos & Preços
            </a>
            <a href="#faq" className="hover:text-blue-400 transition-colors">
              Dúvidas
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onGoToLogin()}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Entrar
            </button>
            <button
              onClick={() => onGoToLogin('Ouro')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all flex items-center gap-2"
            >
              <span>Testar Grátis 7 Dias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Glow Backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Feito de Técnico para Técnicos • 100% em Nuvem</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6">
            O Sistema Mais Rápido e Completo para sua{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">
              Assistência Técnica
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
            Controle <strong className="text-white">Ordens de Serviço com fotos de entrada</strong>, Frente de Caixa (PDV), Estoque de Peças, Seminovos e <strong className="text-white">Emissão Fiscal SEFAZ (NF-e & NFS-e MEI)</strong> em uma única plataforma intuitiva, sem travamentos e com o menor custo do mercado.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <button
              onClick={() => onGoToLogin('Ouro')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
            >
              <span>Começar Teste Grátis de 7 Dias</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#telas"
              className="w-full sm:w-auto px-7 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-base border border-slate-800 hover:border-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>Ver Telas do Sistema</span>
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          {/* Badges de Confiança */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-6 border-t border-slate-800/80 text-xs font-semibold text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Sem cartão no teste</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Laptop className="w-4 h-4 text-blue-400" />
              <span>PC, Tablet e Celular</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Ativação Instantânea</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>100% Sem Fidelidade</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SHOWCASE INTERATIVO DE TELAS (COMO FUNCIONA NA PRÁTICA) */}
      <section id="telas" className="py-20 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-extrabold text-blue-400 tracking-wider uppercase">
              Demonstração Prática
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Interface Desenvolvida para a Bancada e Balcão
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Sem telas confusas ou dezenas de cliques. Veja as telas principais operando em tempo real:
            </p>
          </div>

          {/* Seletor de Abas de Telas */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setActiveTab('os')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'os'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>1. Ordens de Serviço (O.S.)</span>
            </button>

            <button
              onClick={() => setActiveTab('pdv')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'pdv'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>2. Frente de Caixa & PDV</span>
            </button>

            <button
              onClick={() => setActiveTab('seminovos')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'seminovos'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>3. Seminovos & Usados</span>
            </button>

            <button
              onClick={() => setActiveTab('fiscal')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'fiscal'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>4. Módulo Fiscal SEFAZ</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>5. Dashboard & Financeiro</span>
            </button>
          </div>

          {/* Mockup da Tela Selecionada */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 max-w-5xl mx-auto">
            {activeTab === 'os' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-white font-mono">O.S. #1042</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Aguardando Peça
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Cliente: <strong>Lucas Gabriel Mendes</strong> • (11) 98765-4321 • Entrada: 17/11/2026 14:32
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                      Termo de Garantia c/ QR Code
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Equipamento</span>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      iPhone 14 Pro 128GB Grafite
                    </div>
                    <p className="text-xs text-slate-300">
                      <strong>Defeito Relatado:</strong> Tela trincada após queda, sem touch e bateria descarregando rápido.
                    </p>
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      Senha de Desbloqueio: <span className="font-mono text-slate-200">140792</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Fotos de Check-in</span>
                      <span className="text-emerald-400 text-[11px]">2 fotos anexadas</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-20 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[11px]">
                        <Camera className="w-5 h-5 text-blue-400 mb-1" />
                        <span>Frente (Trincada)</span>
                      </div>
                      <div className="h-20 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-[11px]">
                        <Camera className="w-5 h-5 text-blue-400 mb-1" />
                        <span>Lateral (Riscos)</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Evita contestações de danos pré-existentes na entrega.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Orçamento & Peças</span>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>1x Tela OLED iPhone 14 Pro</span>
                        <strong className="text-white font-mono">R$ 580,00</strong>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>1x Mão de Obra Especializada</span>
                        <strong className="text-white font-mono">R$ 150,00</strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-extrabold">
                      <span className="text-slate-300">Total O.S.:</span>
                      <span className="text-emerald-400 font-mono text-base">R$ 730,00</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl flex items-center justify-between text-xs text-blue-300">
                  <span className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-blue-400" />
                    O cliente acompanha o status do reparo pelo link do WhatsApp sem ligar para a loja.
                  </span>
                  <span className="font-bold text-white">Disponível em todos os planos</span>
                </div>
              </div>
            )}

            {activeTab === 'pdv' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-white">Frente de Caixa Rápida (PDV)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Operação com leitor de código de barras ou busca instantânea.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Caixa Aberto (Sessão #48)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400">
                      <span>Item</span>
                      <span>Qtd x Preço</span>
                      <span>Total</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">Cabo USB-C Trançado 1.5m 60W</div>
                          <span className="text-slate-500 text-[11px]">SKU: ACC-USB-01</span>
                        </div>
                        <div className="text-slate-300 font-mono">1 x R$ 45,00</div>
                        <div className="font-bold text-emerald-400 font-mono">R$ 45,00</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">Película de Vidro 3D iPhone 14 Pro</div>
                          <span className="text-slate-500 text-[11px]">SKU: PEL-IP14P</span>
                        </div>
                        <div className="text-slate-300 font-mono">1 x R$ 35,00</div>
                        <div className="font-bold text-emerald-400 font-mono">R$ 35,00</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subtotal da Venda</span>
                      <div className="text-3xl font-black text-white font-mono mt-1">R$ 80,00</div>
                      <div className="text-xs text-slate-400 mt-2 space-y-1">
                        <div className="flex justify-between">
                          <span>Forma:</span>
                          <strong className="text-blue-400">PIX Dinâmico</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa:</span>
                          <strong className="text-emerald-400">R$ 0,00 (Sem desconto)</strong>
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-3 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2">
                      <QrCode className="w-4 h-4" />
                      <span>Gerar QR Code PIX na Tela</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seminovos' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-white">Módulo Especializado em Seminovos & Usados</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Compre de clientes com segurança jurídica e coloque na vitrine de revenda.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Margem Lucro: 42%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Aparelho Adquirido</span>
                    <div className="text-sm font-bold text-white">iPhone 13 128GB Estelar</div>
                    <div className="text-slate-400 font-mono">IMEI: 359124098234123</div>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <span>Saúde Bateria: 88%</span>
                      <span>•</span>
                      <span>Biometria: OK</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Contrato de Compra</span>
                    <div className="text-slate-300">
                      Gera automaticamente o <strong>Termo de Procedência Legal</strong> com CPF e assinatura do vendedor, blindando sua loja contra aparelhos com impedimento.
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Precificação & Lucro</span>
                    <div className="flex justify-between text-slate-300">
                      <span>Valor Pago ao Cliente:</span>
                      <strong className="text-white font-mono">R$ 1.800,00</strong>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Preço Sugerido Venda:</span>
                      <strong className="text-emerald-400 font-mono">R$ 2.550,00</strong>
                    </div>
                    <div className="pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                      Lucro Previsto: + R$ 750,00
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fiscal' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black text-white">Módulo Fiscal SEFAZ Integrado</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                        Exclusivo Plano Ouro
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Emissão de NF-e Modelo 55 (Produtos) e NFS-e MEI Nacional sem complicação.</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Certificado Digital A1 Ativo
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-400 text-[11px] gap-2">
                    <span>CHAVE DE ACESSO AUTORIZADA SEFAZ (44 DÍGITOS):</span>
                    <span className="text-emerald-400 font-bold">Status: 100 - Autorizado o uso da NF-e</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg text-amber-300 font-semibold text-center tracking-wider break-all select-all">
                    35261110987654000199550010000000421298374652
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px] text-slate-400">
                    <div>Modelo: <strong className="text-white">55 (NF-e)</strong></div>
                    <div>Série: <strong className="text-white">1</strong></div>
                    <div>Número: <strong className="text-white">000.042</strong></div>
                    <div>Ambiente: <strong className="text-emerald-400">Produção</strong></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">Espelho DANFE Oficial</div>
                      <span className="text-slate-400 text-[11px]">Visualização e impressão direta em PDF</span>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                      Ver DANFE
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">Download XML Homologado</div>
                      <span className="text-slate-400 text-[11px]">Envio direto para seu contador</span>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs">
                      Baixar XML
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-white">Dashboard & Indicadores em Tempo Real</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Visão 360° do faturamento diário, mensal e ticket médio.</p>
                  </div>
                  <span className="text-xs text-slate-400">Mês Vigente</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Faturamento Mês</span>
                    <div className="text-2xl font-black text-white font-mono mt-1">R$ 28.450</div>
                    <span className="text-[11px] text-emerald-400 font-semibold">+18% vs mês anterior</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">O.S. Concluídas</span>
                    <div className="text-2xl font-black text-blue-400 font-mono mt-1">142</div>
                    <span className="text-[11px] text-slate-400">98% de entrega no prazo</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Ticket Médio O.S.</span>
                    <div className="text-2xl font-black text-indigo-400 font-mono mt-1">R$ 185</div>
                    <span className="text-[11px] text-emerald-400 font-semibold">Peças + Mão de obra</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Comissões Técnicos</span>
                    <div className="text-2xl font-black text-amber-400 font-mono mt-1">R$ 3.840</div>
                    <span className="text-[11px] text-slate-400">Cálculo automático</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. RECURSOS ESSENCIAIS (GRID COM O QUE O TÉCNICO REALMENTE PRECISA) */}
      <section id="recursos" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold text-blue-400 tracking-wider uppercase">
            Tudo o Que Sua Loja Precisa
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
            Funcionalidades Pensadas para a Rotina Real
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            Construído para eliminar a dor de cabeça do técnico e do lojista. Tudo o que importa, sem enrolação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:bg-slate-900 group">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Check-in de O.S. com Fotos</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Fotografe o estado físico do aparelho logo na entrada (riscos, trincados ou marcas). Registre no sistema e evite acusações injustas de clientes na retirada.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:bg-slate-900 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Frente de Caixa Rápida & PIX</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Venda acessórios, películas e cabos em segundos. O sistema calcula troco, simula parcelamento na maquininha e gera o PIX dinâmico na hora.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:bg-slate-900 group">
            <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Nota Fiscal SEFAZ (NF-e & NFS-e)</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Emita NF-e Modelo 55 (Produtos) com Certificado Digital A1 ou NFS-e MEI Nacional de serviços direto pela Ordem de Serviço, em 1 clique.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:bg-slate-900 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gestão de Seminovos</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Compre celulares usados de clientes gerando automaticamente o termo de procedência com CPF, garantindo total segurança contra bloqueios ou golpes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:bg-slate-900 group">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Termos com QR Code WhatsApp</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Imprima comprovantes de entrada com termos de garantia personalizáveis e QR Code para o cliente consultar o andamento da O.S. pelo celular.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 transition-all hover:bg-slate-900 group">
            <div className="w-12 h-12 rounded-xl bg-violet-600/10 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Suporte Humanizado Especializado</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Não fique falando com robôs. Nossa equipe entende a rotina de bancada e ajuda sua loja via WhatsApp sempre que você precisar.
            </p>
          </div>
        </div>
      </section>

      {/* 5. COMO FUNCIONA (PASSO A PASSO DIRETO) */}
      <section id="como-funciona" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold text-blue-400 tracking-wider uppercase">
              Simples e Rápido
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Comece a Usar em Menos de 2 Minutos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30">
                1
              </div>
              <h3 className="text-base font-bold text-white">Crie Sua Conta Grátis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cadastre sua loja sem precisar cadastrar cartão de crédito. Seu acesso é liberado instantaneamente por 7 dias.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                2
              </div>
              <h3 className="text-base font-bold text-white">Personalize com Sua Marca</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Coloque o logotipo da sua assistência, dados do CNPJ, endereço e defina o termo de garantia oficial nos recibos.
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                3
              </div>
              <h3 className="text-base font-bold text-white">Opere na Bancada</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Abra ordens de serviço, realize vendas de balcão e acompanhe seu lucro diário sem planilhas ou papelada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TABELA E CARDS DE PLANOS (OS 2 PLANOS OFICIAIS) */}
      <section id="planos" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Clock className="w-3.5 h-3.5" />
            <span>Planos 100% Mensais • Cancele Quando Quiser</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Preço Justo e Sem Surpresas
          </h2>
          <p className="text-slate-400 text-sm mt-3">
            A única diferença entre os planos é a emissão de nota fiscal. Escolha o ideal para o momento da sua loja:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {/* PLANO PRATA */}
          <div className="rounded-3xl p-8 bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Para Assistências Sem Nota
                </span>
              </div>

              <h3 className="text-2xl font-black text-white">Plano Prata</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ideal para assistências e técnicos autônomos que buscam organização completa da rotina de bancada e balcão.
              </p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-400">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">49,90</span>
                  <span className="text-xs font-semibold text-slate-400">/ mês</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                  Sem taxas de adesão • Sem fidelidade
                </span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 pb-8 border-t border-slate-800 pt-6">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Ordens de Serviço ilimitadas</strong> com fotos de entrada</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Impressão de Termos de Garantia e Recibos</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Frente de Caixa (PDV) com Troco e Sangria</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Controle de Estoque de Peças e Acessórios</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Módulo de Compra e Venda de Seminovos</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Controle Financeiro e Comissão de Técnicos</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Suporte Técnico via WhatsApp e Backups em Nuvem</span>
                </li>
                <li className="flex items-center gap-2.5 text-slate-500">
                  <X className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="line-through">Emissão de Notas Fiscais (NF-e / NFS-e)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onGoToLogin('Prata')}
              className="w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Começar no Plano Prata</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* PLANO OURO (DESTAQUE) */}
          <div className="rounded-3xl p-8 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/20 border-2 border-amber-500 flex flex-col justify-between relative shadow-2xl shadow-amber-500/10">
            <span className="absolute -top-3.5 right-8 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              O Mais Completo • Recomendado
            </span>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Com Emissão Fiscal SEFAZ
                </span>
              </div>

              <h3 className="text-2xl font-black text-white">Plano Ouro</h3>
              <p className="text-xs text-slate-300 mt-1">
                Para assistências e lojas consolidadas que necessitam de emissão fiscal descomplicada e gestão avançada.
              </p>

              <div className="my-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-amber-400">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-tight">79,90</span>
                  <span className="text-xs font-semibold text-slate-400">/ mês</span>
                </div>
                <span className="text-[11px] text-amber-300/80 font-medium mt-1 block">
                  Economia de até R$ 200/mês comparado a emissores fiscais externos
                </span>
              </div>

              <ul className="space-y-3 text-xs text-slate-200 pb-8 border-t border-slate-800 pt-6">
                <li className="flex items-center gap-2.5 font-bold text-amber-300">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>TUDO o que está incluso no Plano Prata</span>
                </li>
                <li className="flex items-center gap-2.5 font-semibold text-white">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Emissão de NF-e Modelo 55 (Produtos)</strong> com Certificado A1</span>
                </li>
                <li className="flex items-center gap-2.5 font-semibold text-white">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>NFS-e de Serviços MEI Nacional</strong> (Sem precisar de certificado)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Impressão do <strong>Espelho DANFE Oficial</strong> em PDF</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Download do XML SEFAZ homologado para contabilidade</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Cancelamento de notas fiscais com justificativa oficial</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Múltiplos técnicos e relatórios de auditoria</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Atendimento e Suporte Prioritário no WhatsApp</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onGoToLogin('Ouro')}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all flex items-center justify-center gap-2"
            >
              <span>Testar Plano Ouro Grátis por 7 Dias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. FAQ (PERGUNTAS FREQUENTES) */}
      <section id="faq" className="py-20 bg-slate-900/50 border-t border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-extrabold text-blue-400 tracking-wider uppercase">
              Tire Suas Dúvidas
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight mt-2">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Preciso instalar algum programa no meu computador?',
                a: 'Não! O TechOS é 100% online e funciona direto pelo navegador de internet (Google Chrome, Edge, Safari). Você pode acessar do computador, notebook, tablet ou até do seu celular, com seus dados sempre sincronizados na nuvem.'
              },
              {
                q: 'Como funciona o teste grátis de 7 dias?',
                a: 'Ao criar sua conta, você recebe 7 dias de acesso liberado com todas as funcionalidades para cadastrar sua loja, abrir ordens de serviço e testar na prática. Não solicitamos dados de cartão de crédito para iniciar o teste.'
              },
              {
                q: 'Existe contrato de fidelidade ou multa de cancelamento?',
                a: 'Nenhum! Nossos planos são estritamente mensais. Você tem total liberdade e pode interromper o uso ou cancelar sua assinatura a qualquer momento com apenas 1 clique, sem multas ou taxas ocultas.'
              },
              {
                q: 'Qual certificado digital preciso para emitir NF-e no Plano Ouro?',
                a: 'Para emissão de NF-e Modelo 55 (produtos/peças), é necessário um Certificado Digital do tipo A1 (arquivo .pfx ou .p12). Já para a NFS-e MEI de serviços (Padrão Nacional), a emissão é autorizada diretamente dispensando certificado digital.'
              },
              {
                q: 'Posso migrar do Plano Prata para o Plano Ouro depois?',
                a: 'Sim, a qualquer momento pelo menu de Assinatura. Ao fazer o upgrade, o módulo fiscal é desbloqueado instantaneamente no seu painel.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden transition"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-white hover:text-blue-400 transition"
                >
                  <span>{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-900 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CTA FINAL (FECHAMENTO) */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border border-blue-500/30 shadow-2xl relative">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
              Pronto para Profissionalizar sua Assistência Técnica?
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto mb-8 leading-relaxed">
              Junte-se a lojas e técnicos que economizam horas de trabalho na bancada e transmitem muito mais confiança aos clientes.
            </p>

            <button
              onClick={() => onGoToLogin('Ouro')}
              className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm shadow-xl shadow-blue-600/40 transition-all flex items-center justify-center gap-2 mx-auto transform hover:-translate-y-0.5"
            >
              <span>Experimentar Grátis por 7 Dias</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[11px] text-slate-400 mt-4">
              Sem cartão de crédito • Liberação imediata • Acesso total
            </p>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-300">TechOS</span>
            <span>— Todos os direitos reservados.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onGoToLogin()}
              className="hover:text-slate-300 transition"
            >
              Área do Assinante (Login)
            </button>
            <a href="#planos" className="hover:text-slate-300 transition">
              Planos & Preços
            </a>
            <a href="#recursos" className="hover:text-slate-300 transition">
              Recursos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
