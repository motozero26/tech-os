import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  FileText,
  Save,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Palette,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  Eye,
  Sun,
  Moon
} from 'lucide-react';
import { api } from '../../api.ts';

export const Configuracoes: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'empresa' | 'personalizacao' | 'equipe' | 'perfis' | 'auditoria'>(() => {
    return (localStorage.getItem('config_active_tab') as any) || 'empresa';
  });
  const [company, setCompany] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User form modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPass, setUserPass] = useState('');
  const [userRole, setUserRole] = useState('technician');
  const [userComm, setUserComm] = useState('15');

  // Profile form modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [permModules, setPermModules] = useState([
    { module: 'os', label: 'Ordens de Serviço', is_admin: true },
    { module: 'caixa', label: 'Caixa / PDV', is_admin: false },
    { module: 'estoque', label: 'Estoque & Peças', is_admin: false },
    { module: 'financeiro', label: 'Financeiro', is_admin: false },
    { module: 'equipe', label: 'Equipe & Usuários', is_admin: false },
  ]);

  // Audit search
  const [auditSearch, setAuditSearch] = useState('');

  // Preset theme colors
  const colorPresets = [
    { label: 'Azul Padrão', primary: '#2563eb', secondary: '#1e293b' },
    { label: 'Verde Esmeralda', primary: '#059669', secondary: '#064e3b' },
    { label: 'Roxo Moderno', primary: '#7c3aed', secondary: '#4c1d95' },
    { label: 'Dourado Âmbar', primary: '#d97706', secondary: '#78350f' },
    { label: 'Vermelho Rubi', primary: '#dc2626', secondary: '#7f1d1d' },
    { label: 'Ciano Tech', primary: '#0891b2', secondary: '#164e63' },
    { label: 'Laranja Solar', primary: '#ea580c', secondary: '#7c2d12' },
    { label: 'Rosa Pink', primary: '#db2777', secondary: '#831843' },
    { label: 'Grafite Premium', primary: '#475569', secondary: '#0f172a' },
  ];

  useEffect(() => {
    localStorage.setItem('config_active_tab', activeTab);
    loadTabContent();
  }, [activeTab]);

  async function loadTabContent() {
    setLoading(true);
    try {
      if (activeTab === 'empresa' || activeTab === 'personalizacao') {
        const comp = await api.getCompany();
        setCompany(comp);
      } else if (activeTab === 'equipe') {
        const u = await api.getUsers();
        setUsers(u);
      } else if (activeTab === 'perfis') {
        const p = await api.getProfiles();
        setProfiles(p);
      } else if (activeTab === 'auditoria') {
        const a = await api.getAuditLogs({ q: auditSearch });
        setAuditLogs(a.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem da logo deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCompany((prev: any) => ({ ...prev, logo: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveLogo() {
    setCompany((prev: any) => ({ ...prev, logo: '' }));
  }

  async function handleSavePersonalizacao(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateCompany(company);
      // Aplicar tema e cor no layout global
      const targetMode = company.theme_mode || 'dark';
      if (targetMode === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme_mode', 'light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme_mode', 'dark');
      }
      if (company.primary_color) {
        document.documentElement.style.setProperty('--brand-primary', company.primary_color);
      }
      localStorage.setItem('config_active_tab', 'personalizacao');
      window.dispatchEvent(new CustomEvent('company_updated', { detail: company }));
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar personalização.');
    }
  }

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.updateCompany(company);
      localStorage.setItem('config_active_tab', 'empresa');
      window.dispatchEvent(new CustomEvent('company_updated', { detail: company }));
      window.location.reload();
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar dados');
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!userName || !userEmail || !userPass) return;
    try {
      await api.createUser({
        name: userName,
        email: userEmail,
        password: userPass,
        role: userRole,
        commission_rate: Number(userComm)
      });
      setShowUserModal(false);
      setUserName('');
      setUserEmail('');
      setUserPass('');
      loadTabContent();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar usuário');
    }
  }

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName) return;
    try {
      await api.createProfile({
        name: profileName,
        description: profileDesc,
        modules: permModules
      });
      setShowProfileModal(false);
      setProfileName('');
      setProfileDesc('');
      loadTabContent();
    } catch (e: any) {
      alert(e.message || 'Erro ao criar perfil');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Configurações do Sistema</h2>
          <p className="text-xs text-slate-400">
            Dados da matriz, controle de equipe, perfis de permissão (RBAC) e auditoria de ações.
          </p>
        </div>

        {activeTab === 'equipe' && (
          <button
            onClick={() => setShowUserModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Utilizador</span>
          </button>
        )}

        {activeTab === 'perfis' && (
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Perfil de Acesso</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('empresa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'empresa'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empresa & Termos</span>
        </button>

        <button
          onClick={() => setActiveTab('personalizacao')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'personalizacao'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Personalização & Visual</span>
        </button>

        <button
          onClick={() => setActiveTab('equipe')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'equipe'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Equipe</span>
        </button>

        <button
          onClick={() => setActiveTab('perfis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'perfis'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Perfis & Acessos</span>
        </button>

        <button
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'auditoria'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Auditoria</span>
        </button>
      </div>

      {/* Empresa & Termos Tab */}
      {activeTab === 'empresa' && (
        <form onSubmit={handleSaveCompany} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Identificação da Matriz</h3>
            <p className="text-xs text-slate-400">Dados exibidos nos cabeçalhos de ordens de serviço, recibos e termos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Razão Social</label>
              <input
                type="text"
                value={company.name || ''}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome Fantasia (Marca do Sistema)</label>
              <input
                type="text"
                value={company.trade_name || 'Assistencia shop'}
                onChange={(e) => setCompany({ ...company, trade_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">CNPJ</label>
              <input
                type="text"
                value={company.cnpj || ''}
                onChange={(e) => setCompany({ ...company, cnpj: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={company.phone || ''}
                onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">E-mail</label>
              <input
                type="email"
                value={company.email || ''}
                onChange={(e) => setCompany({ ...company, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Endereço Completo</label>
              <input
                type="text"
                value={company.address || ''}
                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cidade / UF</label>
              <input
                type="text"
                value={company.city ? `${company.city} - ${company.state}` : ''}
                onChange={(e) => {
                  const parts = e.target.value.split('-');
                  setCompany({ ...company, city: parts[0]?.trim(), state: parts[1]?.trim() });
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-slate-800">
            <h3 className="font-bold text-white text-base">Termos Legais de Garantia (Art. 26 CDC)</h3>
            <textarea
              rows={4}
              value={company.warranty_terms || ''}
              onChange={(e) => setCompany({ ...company, warranty_terms: e.target.value })}
              className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      )}

      {/* Personalização & Visual Tab */}
      {activeTab === 'personalizacao' && (
        <form onSubmit={handleSavePersonalizacao} className="space-y-6">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-400" />
                  <span>Personalização Visual da Loja</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Defina a identidade visual, insira o logotipo da sua empresa e escolha as cores do layout do sistema.
                </p>
              </div>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition self-start sm:self-auto"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Personalização</span>
              </button>
            </div>

            {/* Seletor de Modo de Exibição (Tema: Claro ou Escuro) */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-3">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-300 block">
                  Modo de Exibição (Tema)
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Escolha se o sistema será exibido no modo escuro ou claro. A alteração será aplicada após clicar em "Salvar Personalização".
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opção Modo Escuro */}
                <button
                  type="button"
                  onClick={() => {
                    setCompany((prev: any) => ({ ...prev, theme_mode: 'dark' }));
                  }}
                  className={`p-4 rounded-xl border flex items-center gap-4 text-left transition ${
                    (company.theme_mode || 'dark') === 'dark'
                      ? 'border-blue-500 bg-slate-900 ring-2 ring-blue-500/30 text-white shadow-lg'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 shrink-0 border border-slate-700">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Modo Escuro (Padrão)</span>
                      {(company.theme_mode || 'dark') === 'dark' && (
                        <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fundo escuro profundo, alto contraste e conforto visual prolongado.
                    </p>
                  </div>
                </button>

                {/* Opção Modo Claro */}
                <button
                  type="button"
                  onClick={() => {
                    setCompany((prev: any) => ({ ...prev, theme_mode: 'light' }));
                  }}
                  className={`p-4 rounded-xl border flex items-center gap-4 text-left transition ${
                    company.theme_mode === 'light'
                      ? 'border-blue-500 bg-slate-900 ring-2 ring-blue-500/30 text-white shadow-lg'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/20">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">Modo Claro</span>
                      {company.theme_mode === 'light' && (
                        <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Superfícies claras e arejadas, ideal para ambientes bem iluminados.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Grid 2 Colunas: Logotipo e Cores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna 1: Logotipo da Loja */}
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                    Logotipo da Empresa
                  </span>
                  {company.logo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover Logo</span>
                    </button>
                  )}
                </div>

                {/* Box de Preview da Logo */}
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-950/50">
                  {company.logo ? (
                    <div className="space-y-3 text-center">
                      <img
                        src={company.logo}
                        alt="Logo da Loja"
                        className="max-h-24 max-w-full object-contain mx-auto rounded"
                      />
                      <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Logomarca ativa e exibida no sistema
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 text-slate-400">
                      <ImageIcon className="w-10 h-10 mx-auto text-slate-600" />
                      <p className="text-xs font-medium">Nenhum logotipo cadastrado</p>
                      <p className="text-[11px] text-slate-500">
                        O sistema usará o nome e ícone padrão da loja
                      </p>
                    </div>
                  )}
                </div>

                {/* Input de Upload */}
                <div className="space-y-2">
                  <label className="cursor-pointer flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>{company.logo ? 'Substituir Logomarca' : 'Carregar Nova Logomarca'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-500 text-center">
                    Formatos recomendados: PNG ou SVG com fundo transparente. Máx. 2MB.
                  </p>
                </div>
              </div>

              {/* Coluna 2: Cor do Layout & Tema */}
              <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-300 block">
                  Cor Principal do Layout
                </span>

                {/* Paleta Pré-definida */}
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Paletas de Cores Prontas</label>
                  <div className="grid grid-cols-3 gap-2">
                    {colorPresets.map((preset) => {
                      const isSelected = (company.primary_color || '#2563eb').toLowerCase() === preset.primary.toLowerCase();
                      return (
                        <button
                          key={preset.primary}
                          type="button"
                          onClick={() => setCompany({
                            ...company,
                            primary_color: preset.primary,
                            secondary_color: preset.secondary
                          })}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                            isSelected
                              ? 'border-white bg-slate-800 text-white shadow-md'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full shrink-0 shadow"
                            style={{ backgroundColor: preset.primary }}
                          />
                          <span className="text-[11px] font-medium truncate">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seletor Customizado Hex */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <label className="block text-xs text-slate-400">
                    Ou selecione qualquer cor personalizada (Hexadecimal)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={company.primary_color || '#2563eb'}
                      onChange={(e) => setCompany({ ...company, primary_color: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                    />
                    <input
                      type="text"
                      value={company.primary_color || '#2563eb'}
                      onChange={(e) => setCompany({ ...company, primary_color: e.target.value })}
                      placeholder="#2563eb"
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Simulador de Pré-visualização em Tempo Real */}
            <div className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Pré-visualização em Tempo Real (Não afeta o sistema até salvar)
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Prévia: {company.theme_mode === 'light' ? 'Modo Claro' : 'Modo Escuro'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Mockup Topo Sidebar */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                  company.theme_mode === 'light'
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  {company.logo ? (
                    <img src={company.logo} alt="Logo" className="w-9 h-9 object-contain rounded" />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
                      style={{ backgroundColor: company.primary_color || '#2563eb' }}
                    >
                      AS
                    </div>
                  )}
                  <div>
                    <p className={`text-xs font-bold truncate ${company.theme_mode === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {company.trade_name || company.name || 'Assistencia shop'}
                    </p>
                    <p className="text-[10px]" style={{ color: company.primary_color || '#2563eb' }}>Gestão Técnica & PDV</p>
                  </div>
                </div>

                {/* Mockup Botão Primário */}
                <div className={`p-3 rounded-xl border flex items-center justify-center transition ${
                  company.theme_mode === 'light'
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  <button
                    type="button"
                    className="px-4 py-2 text-white text-xs font-bold rounded-lg shadow-sm"
                    style={{ backgroundColor: company.primary_color || '#2563eb' }}
                  >
                    + Nova O.S. (Exemplo)
                  </button>
                </div>

                {/* Mockup Badge / Destaque */}
                <div className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition ${
                  company.theme_mode === 'light'
                    ? 'bg-white border-slate-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800'
                }`}>
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full text-white"
                    style={{ backgroundColor: company.primary_color || '#2563eb' }}
                  >
                    Plano Ativo
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Personalização</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Equipe Tab */}
      {activeTab === 'equipe' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4 text-center">Comissão</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className="py-3.5 px-4 font-semibold text-white">{u.name}</td>
                    <td className="py-3.5 px-4 text-slate-400">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-semibold">
                      {u.commission_rate}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-500/10 text-emerald-400">
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Perfis Tab */}
      {activeTab === 'perfis' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map(p => (
              <div key={p.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-white text-sm">{p.name}</h4>
                  <span className="text-[10px] uppercase font-bold text-slate-500">Perfil</span>
                </div>
                <p className="text-xs text-slate-400">{p.description || 'Perfil com permissões modulares.'}</p>
                <div className="space-y-1.5 pt-2">
                  {p.permissions?.map((perm: any) => (
                    <div key={perm.id} className="flex justify-between text-xs py-1 border-b border-slate-900">
                      <span className="text-slate-300 uppercase text-[11px] font-semibold">{perm.module}</span>
                      <span className={`text-[10px] font-bold ${perm.is_admin ? 'text-blue-400' : 'text-slate-500'}`}>
                        {perm.is_admin ? 'Admin do Módulo' : 'Acesso Operador'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auditoria Tab */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Buscar em logs de auditoria por usuário, módulo, ação…"
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                    <th className="py-3 px-4">Módulo</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4 text-right">Data / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        Nenhum registro de auditoria encontrado.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded font-semibold text-[10px] uppercase bg-slate-800 text-slate-300">
                            {l.module}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">{l.action}</td>
                        <td className="py-3 px-4 text-slate-300">{l.description}</td>
                        <td className="py-3 px-4 text-slate-400">{l.user_name || 'Sistema'}</td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono">
                          {new Date(l.created_at).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New User */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateUser} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Novo Utilizador da Equipe</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nome do operador"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="email@empresa.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Senha Provisória *</label>
              <input
                type="password"
                required
                value={userPass}
                onChange={(e) => setUserPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Função</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="technician">Técnico</option>
                  <option value="attendant">Atendente / Vendedor</option>
                  <option value="admin">Administrador</option>
                  <option value="master">Dono (Master)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Comissão (%)</label>
                <input
                  type="number"
                  value={userComm}
                  onChange={(e) => setUserComm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Criar Acesso
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Profile */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateProfile} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Novo Perfil de Acesso</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome do Perfil *</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex: Atendimento, Balcão, Estagiário"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Módulos & Permissões</label>
              <div className="space-y-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                {permModules.map((m, idx) => (
                  <div key={m.module} className="flex items-center justify-between text-xs py-1">
                    <span className="text-slate-300">{m.label}</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={m.is_admin}
                        onChange={(e) => {
                          const updated = [...permModules];
                          updated[idx].is_admin = e.target.checked;
                          setPermModules(updated);
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
                      />
                      <span className="text-[11px] text-slate-400">Admin</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Perfil
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
