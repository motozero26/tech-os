import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldAlert,
  Zap,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Printer,
  XCircle,
  Search,
  Lock,
  ArrowRight,
  KeyRound,
  Building,
  Check,
  FileCheck2,
  RefreshCw,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  Info,
  UserCheck,
  X,
  Phone,
  Mail,
  Home,
  Package,
  Plus,
  Trash2,
  Truck,
  CreditCard
} from 'lucide-react';
import { api } from '../../api.ts';
import { FiscalStatus, FiscalSettings, FiscalInvoice } from '../../types.ts';

interface NotaFiscalProps {
  onNavigateToAssinatura?: () => void;
}

export const NotaFiscal: React.FC<NotaFiscalProps> = ({ onNavigateToAssinatura }) => {
  const [fiscalStatus, setFiscalStatus] = useState<FiscalStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'settings'>('invoices');
  const [loading, setLoading] = useState(true);

  // Invoices list state
  const [invoices, setInvoices] = useState<FiscalInvoice[]>([]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Settings state
  const [settings, setSettings] = useState<FiscalSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [certPassword, setCertPassword] = useState('');
  const [certFilename, setCertFilename] = useState('');
  const [certBase64, setCertBase64] = useState('');

  // New Invoice Modal
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [emitType, setEmitType] = useState<'nfse_service_mei' | 'nfe_product'>('nfse_service_mei');

  // Customer Search Autocomplete
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Government National NFS-e standard fields
  const [emitCustomerName, setEmitCustomerName] = useState('');
  const [emitCustomerDoc, setEmitCustomerDoc] = useState('');
  const [emitCustomerEmail, setEmitCustomerEmail] = useState('');
  const [emitCustomerPhone, setEmitCustomerPhone] = useState('');
  const [emitCustomerZip, setEmitCustomerZip] = useState('');
  const [emitCustomerAddress, setEmitCustomerAddress] = useState('');
  const [emitCustomerNumber, setEmitCustomerNumber] = useState('');
  const [emitCustomerNeighborhood, setEmitCustomerNeighborhood] = useState('');
  const [emitCustomerCity, setEmitCustomerCity] = useState('São Paulo');
  const [emitCustomerState, setEmitCustomerState] = useState('SP');

  const [emitServiceCode, setEmitServiceCode] = useState('14.01');
  const [emitCustomServiceCode, setEmitCustomServiceCode] = useState('');
  const [emitCnaeCode, setEmitCnaeCode] = useState('9512-6/00');
  const [emitCompetenceDate, setEmitCompetenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [emitServiceCity, setEmitServiceCity] = useState('São Paulo');
  const [emitServiceState, setEmitServiceState] = useState('SP');
  const [emitIssRetention, setEmitIssRetention] = useState<number>(0);
  const [emitIssRate, setEmitIssRate] = useState<number>(0);
  const [emitDiscount, setEmitDiscount] = useState<string>('0.00');

  const [emitAmount, setEmitAmount] = useState('');
  const [emitOperation, setEmitOperation] = useState('Manutenção técnica preventiva e corretiva em smartphone / aparelho eletroeletrônico');
  const [emitting, setEmitting] = useState(false);

  // NF-e Product specific fields & Stock pull
  const [nfeItems, setNfeItems] = useState<Array<{
    code: string;
    description: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>>([]);
  const [searchProductTerm, setSearchProductTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  const [currentItemCode, setCurrentItemCode] = useState('');
  const [currentItemDesc, setCurrentItemDesc] = useState('');
  const [currentItemNcm, setCurrentItemNcm] = useState('8517.13.00');
  const [currentItemCfop, setCurrentItemCfop] = useState('5102');
  const [currentItemUnit, setCurrentItemUnit] = useState('UN');
  const [currentItemQty, setCurrentItemQty] = useState('1');
  const [currentItemPrice, setCurrentItemPrice] = useState('');

  const [emitNatureOperation, setEmitNatureOperation] = useState('Venda de mercadoria adquirida ou recebida de terceiros');
  const [emitCfop, setEmitCfop] = useState('5102');
  const [emitFreightMode, setEmitFreightMode] = useState('9');
  const [emitFreightAmount, setEmitFreightAmount] = useState('0.00');
  const [emitPaymentMethod, setEmitPaymentMethod] = useState('01');
  const [emitCustomerIe, setEmitCustomerIe] = useState('ISENTO');
  const [emitAdditionalInfo, setEmitAdditionalInfo] = useState('Documento emitido por ME ou EPP optante pelo Simples Nacional. Nao gera direito a credito fiscal de IPI.');

  // DANFE Modal View
  const [selectedInvoice, setSelectedInvoice] = useState<FiscalInvoice | null>(null);
  const [danfeData, setDanfeData] = useState<any | null>(null);
  const [showDanfeModal, setShowDanfeModal] = useState(false);

  // Cancel Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelInvoiceId, setCancelInvoiceId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const st = await api.getFiscalStatus();
      setFiscalStatus(st);

      if (st.has_fiscal_access) {
        await Promise.all([loadInvoices(), loadSettings()]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadInvoices() {
    try {
      const data = await api.getFiscalInvoices({
        type: filterType || undefined,
        status: filterStatus || undefined,
        q: searchTerm || undefined
      });
      setInvoices(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadSettings() {
    try {
      const setts = await api.getFiscalSettings();
      setSettings(setts);
      if (setts.certificate_a1_filename) {
        setCertFilename(setts.certificate_a1_filename);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleCertificateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCertFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string)?.split(',')[1] || '';
      setCertBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);

    try {
      await api.updateFiscalSettings({
        ...settings,
        certificate_a1_filename: certFilename || settings.certificate_a1_filename,
        certificate_a1_base64: certBase64 || undefined,
        certificate_password: certPassword || undefined
      });
      alert('Configurações fiscais salvas com sucesso!');
      await loadStatus();
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar configurações fiscais.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSearchCustomers(term: string) {
    setSearchCustomerTerm(term);
    if (!term || term.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    setIsSearchingCustomer(true);
    try {
      const results = await api.getCustomers({ q: term.trim() });
      const list = Array.isArray(results) ? results : (results?.data || []);
      setCustomerSearchResults(list);
    } catch (e) {
      console.error('Erro ao buscar clientes', e);
    } finally {
      setIsSearchingCustomer(false);
    }
  }

  function handleSelectCustomer(cust: any) {
    setSelectedCustomer(cust);
    setEmitCustomerName(cust.name || '');
    setEmitCustomerDoc(cust.cpf_cnpj || '');
    setEmitCustomerEmail(cust.email || '');
    setEmitCustomerPhone(cust.phone || cust.whatsapp || '');
    setEmitCustomerZip(cust.zip_code || '');
    setEmitCustomerAddress(cust.address || '');
    setEmitCustomerNumber(cust.number || '');
    setEmitCustomerNeighborhood(cust.neighborhood || '');
    if (cust.city) {
      setEmitCustomerCity(cust.city);
      setEmitServiceCity(cust.city);
    }
    if (cust.state) {
      setEmitCustomerState(cust.state);
      setEmitServiceState(cust.state);
    }
    setSearchCustomerTerm('');
    setCustomerSearchResults([]);
  }

  function handleClearCustomer() {
    setSelectedCustomer(null);
    setEmitCustomerName('');
    setEmitCustomerDoc('');
    setEmitCustomerEmail('');
    setEmitCustomerPhone('');
    setEmitCustomerZip('');
    setEmitCustomerAddress('');
    setEmitCustomerNumber('');
    setEmitCustomerNeighborhood('');
    setSearchCustomerTerm('');
    setCustomerSearchResults([]);
  }

  async function handleSearchProducts(query: string) {
    setSearchProductTerm(query);
    if (!query || query.trim().length < 2) {
      setProductSearchResults([]);
      return;
    }
    setIsSearchingProduct(true);
    try {
      const results = await api.getProducts({ q: query.trim() });
      setProductSearchResults(Array.isArray(results) ? results : []);
    } catch (e) {
      console.error(e);
      setProductSearchResults([]);
    } finally {
      setIsSearchingProduct(false);
    }
  }

  function handleSelectProduct(prod: any) {
    setCurrentItemCode(prod.sku || prod.barcode || String(prod.id));
    setCurrentItemDesc(prod.name || '');
    setCurrentItemNcm(prod.ncm || '8517.13.00');
    setCurrentItemUnit(prod.unit || 'UN');
    setCurrentItemPrice(prod.sale_price !== undefined ? Number(prod.sale_price).toFixed(2) : '0.00');
    setCurrentItemQty('1');
    setSearchProductTerm(prod.name);
    setProductSearchResults([]);
  }

  function handleAddProductItem() {
    if (!currentItemDesc.trim()) {
      alert('Informe a descrição do produto.');
      return;
    }
    const qty = Number(currentItemQty);
    if (qty <= 0) {
      alert('A quantidade deve ser maior que zero.');
      return;
    }
    const price = Number(currentItemPrice);
    if (price <= 0) {
      alert('O preço unitário deve ser maior que zero.');
      return;
    }
    const rawNcm = currentItemNcm.replace(/\D/g, '');
    if (rawNcm.length !== 8) {
      alert('O código NCM deve possuir 8 dígitos numéricos (ex: 8517.13.00).');
      return;
    }

    const newItem = {
      code: currentItemCode || String(nfeItems.length + 1).padStart(4, '0'),
      description: currentItemDesc.trim(),
      ncm: currentItemNcm,
      cfop: currentItemCfop || emitCfop || '5102',
      unit: (currentItemUnit || 'UN').toUpperCase().trim(),
      quantity: qty,
      unit_price: price,
      total_price: Number((qty * price).toFixed(2))
    };

    setNfeItems(prev => [...prev, newItem]);
    setSearchProductTerm('');
    setCurrentItemCode('');
    setCurrentItemDesc('');
    setCurrentItemPrice('');
    setCurrentItemQty('1');
  }

  function handleRemoveProductItem(index: number) {
    setNfeItems(prev => prev.filter((_, idx) => idx !== index));
  }

  const totalNfeProducts = nfeItems.reduce((acc, it) => acc + it.total_price, 0);
  const totalNfeAmountCalculated = Math.max(0, totalNfeProducts + (Number(emitFreightAmount) || 0) - (Number(emitDiscount) || 0));

  async function handleEmitInvoice(e: React.FormEvent) {
    e.preventDefault();

    if (emitType === 'nfse_service_mei') {
      if (!emitCustomerName.trim()) {
        alert('O Nome ou Razão Social do Tomador do Serviço é obrigatório.');
        return;
      }
      if (!emitCustomerDoc.trim()) {
        alert('O CPF ou CNPJ do Tomador do Serviço é obrigatório.');
        return;
      }
      const cleanDoc = emitCustomerDoc.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        alert('O CPF deve ter 11 dígitos ou o CNPJ deve ter 14 dígitos válidos.');
        return;
      }
      if (!emitOperation.trim()) {
        alert('A discriminação detalhada dos serviços prestados é obrigatória.');
        return;
      }
      if (Number(emitAmount) <= 0) {
        alert('O valor dos serviços prestados deve ser maior que zero.');
        return;
      }
    } else {
      // NF-e de Produtos
      if (!emitCustomerName.trim()) {
        alert('O Nome ou Razão Social do Destinatário é obrigatório para emissão da NF-e.');
        return;
      }
      if (!emitCustomerDoc.trim()) {
        alert('O CPF ou CNPJ do Destinatário é obrigatório para emissão da NF-e.');
        return;
      }
      const cleanDoc = emitCustomerDoc.replace(/\D/g, '');
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        alert('O CPF deve ter 11 dígitos ou o CNPJ deve ter 14 dígitos válidos.');
        return;
      }
      if (!emitCustomerAddress.trim() || !emitCustomerCity.trim() || !emitCustomerState.trim()) {
        alert('O Endereço, Município e UF do destinatário são obrigatórios na NF-e modelo 55.');
        return;
      }
      if (nfeItems.length === 0) {
        alert('A NF-e exige ao menos 1 produto adicionado à lista para transmissão à SEFAZ.');
        return;
      }
    }

    setEmitting(true);
    try {
      const chosenServiceCode = emitServiceCode === 'outro' ? emitCustomServiceCode : emitServiceCode;

      if (emitType === 'nfse_service_mei') {
        await api.emitFiscalInvoice({
          invoice_type: 'nfse_service_mei',
          customer_name: emitCustomerName,
          customer_cpf_cnpj: emitCustomerDoc,
          customer_email: emitCustomerEmail || undefined,
          customer_phone: emitCustomerPhone || undefined,
          customer_zip_code: emitCustomerZip || undefined,
          customer_address: emitCustomerAddress || undefined,
          customer_number: emitCustomerNumber || undefined,
          customer_neighborhood: emitCustomerNeighborhood || undefined,
          customer_city: emitCustomerCity,
          customer_state: emitCustomerState,
          service_code: chosenServiceCode || '14.01',
          cnae_code: emitCnaeCode,
          service_description: emitOperation,
          nature_of_operation: emitOperation,
          competence_date: emitCompetenceDate,
          service_city: emitServiceCity,
          service_state: emitServiceState,
          iss_retention: emitIssRetention,
          iss_rate: Number(emitIssRate) || 0,
          discount_amount: Number(emitDiscount) || 0,
          total_amount: Number(emitAmount) || 120
        });
      } else {
        await api.emitFiscalInvoice({
          invoice_type: 'nfe_product',
          customer_name: emitCustomerName,
          customer_cpf_cnpj: emitCustomerDoc,
          customer_email: emitCustomerEmail || undefined,
          customer_phone: emitCustomerPhone || undefined,
          customer_zip_code: emitCustomerZip || undefined,
          customer_address: emitCustomerAddress || undefined,
          customer_number: emitCustomerNumber || undefined,
          customer_neighborhood: emitCustomerNeighborhood || undefined,
          customer_city: emitCustomerCity,
          customer_state: emitCustomerState,
          customer_ie: emitCustomerIe || 'ISENTO',
          nature_of_operation: emitNatureOperation,
          cfop: emitCfop,
          freight_mode: emitFreightMode,
          freight_amount: Number(emitFreightAmount) || 0,
          payment_method: emitPaymentMethod,
          additional_info: emitAdditionalInfo,
          discount_amount: Number(emitDiscount) || 0,
          total_amount: totalNfeAmountCalculated,
          items: nfeItems
        });
      }

      alert(
        emitType === 'nfse_service_mei'
          ? 'Nota Fiscal de Serviços (NFS-e Nacional) emitida e autorizada com sucesso!'
          : 'Nota Fiscal de Produtos (NF-e) emitida e autorizada pela SEFAZ com sucesso!'
      );
      setShowEmitModal(false);
      handleClearCustomer();
      setNfeItems([]);
      setEmitAmount('');
      loadInvoices();
      loadStatus();
    } catch (e: any) {
      alert(e.message || 'Erro ao emitir nota fiscal');
    } finally {
      setEmitting(false);
    }
  }

  async function handleOpenDanfe(inv: FiscalInvoice) {
    setSelectedInvoice(inv);
    setShowDanfeModal(true);
    try {
      const data = await api.getFiscalDANFE(inv.id);
      setDanfeData(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCancelInvoice() {
    if (!cancelInvoiceId) return;
    if (cancelReason.trim().length < 15) {
      alert('A justificativa de cancelamento deve conter no mínimo 15 caracteres.');
      return;
    }

    setCanceling(true);
    try {
      await api.cancelFiscalInvoice(cancelInvoiceId, cancelReason);
      alert('Nota fiscal cancelada com sucesso!');
      setShowCancelModal(false);
      setCancelReason('');
      setCancelInvoiceId(null);
      loadInvoices();
    } catch (e: any) {
      alert(e.message || 'Erro ao cancelar nota fiscal');
    } finally {
      setCanceling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Se a empresa NÃO tem acesso (está no Plano Prata)
  if (!fiscalStatus?.has_fiscal_access) {
    return (
      <div className="max-w-4xl mx-auto py-10 space-y-8">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl shadow-amber-500/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400 mb-6 shadow-inner">
            <Lock className="w-10 h-10" />
          </div>

          <span className="px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            Recurso Exclusivo Plano Ouro
          </span>

          <h2 className="text-3xl font-black text-white mt-4 tracking-tight">
            Emissão de Nota Fiscal Eletrônica
          </h2>

          <p className="text-slate-300 text-sm max-w-2xl mx-auto mt-3 leading-relaxed">
            Sua loja está atualmente no <strong className="text-white">Plano Prata</strong>. A emissão de Notas Fiscais é uma funcionalidade exclusiva do <strong className="text-amber-400">Plano Ouro</strong>, desenvolvida sob medida tanto para MEI quanto para empresas em regime geral.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left mt-8">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <FileCheck2 className="w-4 h-4" />
                <span>NFS-e de Serviços para MEI</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Integração nacional simplificada para Microempreendedores Individuais. <strong>Sem necessidade de certificado digital</strong> conforme Resolução CGSN nº 169/2022.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>NF-e de Produtos com Certificado A1</span>
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Emissão completa de NF-e e NFC-e para vendas no balcão e PDV com assinatura digital via Certificado Digital A1 (.pfx).
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                if (onNavigateToAssinatura) onNavigateToAssinatura();
              }}
              className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center gap-2"
            >
              <span>Fazer Upgrade para o Plano Ouro</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empresa NO PLANO OURO (Acesso Liberado)
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header com Status do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Central de Notas Fiscais</h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase">
                Plano Ouro Ativo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Emissão de NF-e de Produtos (Certificado A1) e NFS-e de Serviços para MEI (Dispensa Certificado).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmitModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Emitir Nova Nota</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 ${
            activeTab === 'invoices'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Notas Emitidas ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold transition border-b-2 ${
            activeTab === 'settings'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Configurações Fiscais & Certificado A1 / MEI
        </button>
      </div>

      {/* Tab: Invoices List */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, CPF ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadInvoices()}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setTimeout(loadInvoices, 50);
                }}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">Todos os tipos</option>
                <option value="nfse_service_mei">NFS-e MEI (Serviço)</option>
                <option value="nfe_product">NF-e (Produto)</option>
                <option value="nfce_product">NFC-e (Consumidor)</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setTimeout(loadInvoices, 50);
                }}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">Todos os status</option>
                <option value="authorized">Autorizada</option>
                <option value="canceled">Cancelada</option>
                <option value="rejected">Rejeitada</option>
              </select>
            </div>

            <button
              onClick={loadInvoices}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Table */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-4 font-semibold">Tipo & Número</th>
                  <th className="p-4 font-semibold">Destinatário</th>
                  <th className="p-4 font-semibold">Valor Total</th>
                  <th className="p-4 font-semibold">Chave de Acesso</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Data Emissão</th>
                  <th className="p-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Nenhuma nota fiscal emitida até o momento. Clique em "Emitir Nova Nota" para começar.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4 font-semibold text-white">
                        <span className="block text-[11px] text-amber-400 uppercase font-mono">
                          {inv.invoice_type === 'nfse_service_mei' ? 'NFS-e MEI' : (inv.invoice_type === 'nfce_product' ? 'NFC-e' : 'NF-e')}
                        </span>
                        #{inv.number} (Série {inv.series})
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-200">{inv.customer_name || 'Consumidor Final'}</div>
                        <div className="text-[11px] text-slate-500">{inv.customer_cpf_cnpj}</div>
                      </td>
                      <td className="p-4 font-bold text-white font-mono">
                        R$ {inv.total_amount?.toFixed(2)}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-400 truncate max-w-[160px]" title={inv.access_key}>
                        {inv.access_key}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'authorized'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : (inv.status === 'canceled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400')
                        }`}>
                          {inv.status === 'authorized' ? 'Autorizada' : (inv.status === 'canceled' ? 'Cancelada' : inv.status)}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 text-[11px]">
                        {new Date(inv.issued_at || inv.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenDanfe(inv)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[11px] font-semibold"
                          title="Visualizar DANFE"
                        >
                          DANFE
                        </button>
                        <a
                          href={api.getFiscalXMLUrl(inv.id)}
                          download
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 transition text-[11px] font-semibold"
                          title="Baixar XML assinado"
                        >
                          XML
                        </a>
                        {inv.status === 'authorized' && (
                          <button
                            onClick={() => {
                              setCancelInvoiceId(inv.id);
                              setShowCancelModal(true);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition text-[11px] font-semibold"
                            title="Cancelar nota na SEFAZ"
                          >
                            Cancelar
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

      {/* Tab: Settings */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Seção 1: MEI (Sem exigência de Certificado Digital) */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">NFS-e de Serviços para MEI (Emissão Nacional)</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Dispensa Certificado Digital
              </span>
            </div>

            <div className="bg-blue-950/30 border border-blue-800/40 p-4 rounded-xl text-xs text-blue-300 space-y-1">
              <p className="font-bold">✓ Padrão Nacional NFS-e MEI (Resolução CGSN nº 169/2022)</p>
              <p className="text-slate-400">
                Microempreendedores Individuais não precisam adquirir certificado digital para emissão de notas de serviço. O acesso ao emissor nacional é realizado diretamente através do login com CPF/CNPJ e senha ou Token de Acesso Simplificado.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Usuário / CPF / CNPJ do MEI:</label>
                <input
                  type="text"
                  value={settings.nfse_mei_user || ''}
                  onChange={(e) => setSettings({ ...settings, nfse_mei_user: e.target.value })}
                  placeholder="Ex: 12.345.678/0001-90"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha de Acesso / Token do Portal:</label>
                <input
                  type="password"
                  value={settings.nfse_mei_password || ''}
                  onChange={(e) => setSettings({ ...settings, nfse_mei_password: e.target.value })}
                  placeholder="Senha cadastrada no Portal NFS-e"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CNAE Principal de Reparação:</label>
                <input
                  type="text"
                  value={settings.default_cnae || '9511-8/00'}
                  onChange={(e) => setSettings({ ...settings, default_cnae: e.target.value })}
                  placeholder="9511-8/00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Código de Serviço (LC 116):</label>
                <input
                  type="text"
                  value={settings.default_service_code || '14.01'}
                  onChange={(e) => setSettings({ ...settings, default_service_code: e.target.value })}
                  placeholder="14.01 - Manutenção de celulares"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Série da NFS-e:</label>
                <input
                  type="text"
                  value={settings.nfse_series || 'E'}
                  onChange={(e) => setSettings({ ...settings, nfse_series: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Próximo Número NFS-e:</label>
                <input
                  type="number"
                  value={settings.nfse_next_number || 1}
                  onChange={(e) => setSettings({ ...settings, nfse_next_number: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: NF-e / NFC-e de Produtos (Certificado Digital A1 Obrigatório) */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">NF-e & NFC-e de Produtos (Certificado Digital A1)</h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Requer Arquivo .pfx / .p12
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">Carregar Arquivo do Certificado A1 (.pfx / .p12):</label>
                <div className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer bg-slate-900/50 transition">
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleCertificateUpload}
                    className="hidden"
                    id="cert-upload"
                  />
                  <label htmlFor="cert-upload" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">
                      {certFilename ? certFilename : 'Clique para selecionar o certificado .pfx'}
                    </p>
                    <p className="text-[11px] text-slate-500">Formatos aceitos: ICP-Brasil (.pfx ou .p12)</p>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Senha do Certificado Digital A1:</label>
                  <input
                    type="password"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    placeholder="Digite a senha do arquivo .pfx"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-slate-400 block font-semibold">Status do Certificado:</span>
                  {settings.has_certificate ? (
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Certificado A1 Configurado e Válido</span>
                    </div>
                  ) : (
                    <div className="text-amber-400 font-medium">Nenhum certificado A1 instalado no momento.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Série NF-e (Modelo 55):</label>
                <input
                  type="number"
                  value={settings.nfe_series || 1}
                  onChange={(e) => setSettings({ ...settings, nfe_series: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Próximo Número NF-e:</label>
                <input
                  type="number"
                  value={settings.nfe_next_number || 1}
                  onChange={(e) => setSettings({ ...settings, nfe_next_number: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Série NFC-e (Modelo 65):</label>
                <input
                  type="number"
                  value={settings.nfce_series || 1}
                  onChange={(e) => setSettings({ ...settings, nfce_series: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Próximo Número NFC-e:</label>
                <input
                  type="number"
                  value={settings.nfce_next_number || 1}
                  onChange={(e) => setSettings({ ...settings, nfce_next_number: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Ambiente */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">Ambiente de Emissão SEFAZ</h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="environment"
                  value="homologacao"
                  checked={settings.nfe_environment === 'homologacao'}
                  onChange={() => setSettings({ ...settings, nfe_environment: 'homologacao' })}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span>Homologação (Ambiente de Testes / Sem valor fiscal)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="environment"
                  value="producao"
                  checked={settings.nfe_environment === 'producao'}
                  onChange={() => setSettings({ ...settings, nfe_environment: 'producao' })}
                  className="text-amber-500 focus:ring-amber-500"
                />
                <span>Produção (Com valor fiscal e tributário real)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              {savingSettings ? 'Salvando...' : 'Salvar Todas as Configurações Fiscais'}
            </button>
          </div>
        </form>
      )}

      {/* Modal: Emitir Nova Nota */}
      {showEmitModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    {emitType === 'nfse_service_mei'
                      ? 'Emissão de Nota Fiscal de Serviços (NFS-e Nacional)'
                      : 'Emissão de Nota Fiscal de Produtos (NF-e Modelo 55)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {emitType === 'nfse_service_mei'
                      ? 'Padrão Nacional do Governo / Portal de Gestão NFS-e e MEI'
                      : 'Padrão SEFAZ - Manual de Orientação do Contribuinte (MOC v4.00)'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowEmitModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEmitInvoice} className="space-y-5 text-xs">
              {/* Tipo de Documento */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 uppercase text-[11px] tracking-wider">Tipo de Documento Fiscal:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEmitType('nfse_service_mei')}
                    className={`p-3 rounded-xl border text-left transition ${
                      emitType === 'nfse_service_mei'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm">NFS-e de Serviços (Padrão Nacional)</div>
                    <div className="text-[11px] font-normal text-slate-400 mt-0.5">Dispensa Certificado Digital A1 para MEI</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmitType('nfe_product')}
                    className={`p-3 rounded-xl border text-left transition ${
                      emitType === 'nfe_product'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-md'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm">NF-e de Produtos (Venda de Mercadorias)</div>
                    <div className="text-[11px] font-normal text-slate-400 mt-0.5">Exige Certificado Digital A1 cadastrado</div>
                  </button>
                </div>
              </div>

              {/* Seção Condicional 1: DADOS DA OPERAÇÃO FISCAL (Exclusivo NF-e Produtos) */}
              {emitType === 'nfe_product' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    1. Dados da Operação Fiscal (SEFAZ / NF-e)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Natureza da Operação *:</label>
                      <input
                        type="text"
                        required
                        value={emitNatureOperation}
                        onChange={(e) => setEmitNatureOperation(e.target.value)}
                        placeholder="Ex: Venda de mercadoria adquirida ou recebida de terceiros"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">CFOP Padrão da Operação *:</label>
                      <select
                        value={emitCfop}
                        onChange={(e) => {
                          setEmitCfop(e.target.value);
                          setCurrentItemCfop(e.target.value);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      >
                        <option value="5102">5102 - Venda de mercadoria adquirida de terceiros (Interna)</option>
                        <option value="5405">5405 - Venda de mercadoria com ICMS retido por Substituição Tributária</option>
                        <option value="5101">5101 - Venda de produção do estabelecimento</option>
                        <option value="6102">6102 - Venda de mercadoria adquirida de terceiros (Interestadual)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-amber-400" />
                        Modalidade de Frete:
                      </label>
                      <select
                        value={emitFreightMode}
                        onChange={(e) => setEmitFreightMode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      >
                        <option value="9">9 - Sem Ocorrência de Transporte (Sem Frete)</option>
                        <option value="0">0 - Contratação por conta do Remetente (CIF)</option>
                        <option value="1">1 - Contratação por conta do Destinatário (FOB)</option>
                        <option value="2">2 - Contratação por conta de Terceiros</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Valor do Frete (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={emitFreightAmount}
                        onChange={(e) => setEmitFreightAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-amber-400" />
                        Forma de Pagamento *:
                      </label>
                      <select
                        value={emitPaymentMethod}
                        onChange={(e) => setEmitPaymentMethod(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      >
                        <option value="01">01 - Dinheiro</option>
                        <option value="17">17 - Pagamento Instantâneo (PIX)</option>
                        <option value="03">03 - Cartão de Crédito</option>
                        <option value="04">04 - Cartão de Débito</option>
                        <option value="15">15 - Boleto Bancário</option>
                        <option value="90">90 - Sem Pagamento (Bonificação / Remessa)</option>
                        <option value="99">99 - Outros Meios</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SEÇÃO DESTINATÁRIO / TOMADOR COM BUSCA DE CLIENTES JÁ CADASTRADOS */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    {emitType === 'nfse_service_mei' ? '1. Dados do Tomador do Serviço (Cliente)' : '2. Dados do Destinatário (Consumidor / Cliente)'}
                  </span>

                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-[11px] text-red-400 hover:underline flex items-center gap-1"
                    >
                      <span>Limpar / Digitar Outro</span>
                    </button>
                  )}
                </div>

                {/* Campo de Busca Rápida de Clientes */}
                <div className="relative">
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                    Buscar Cliente já Cadastrado no Sistema (Preenchimento Rápido):
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchCustomerTerm}
                      onChange={(e) => handleSearchCustomers(e.target.value)}
                      placeholder="Digite o nome, CPF/CNPJ ou telefone para autopreencher..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    {isSearchingCustomer && (
                      <div className="absolute right-3 top-2.5 text-[11px] text-amber-400 animate-pulse">
                        Buscando...
                      </div>
                    )}
                  </div>

                  {/* Resultados suspensos da busca */}
                  {customerSearchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 max-h-52 overflow-y-auto z-20">
                      {customerSearchResults.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => handleSelectCustomer(cust)}
                          className="p-3 hover:bg-slate-800 cursor-pointer transition flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{cust.name}</span>
                            <span className="text-slate-400 text-[11px]">
                              {cust.cpf_cnpj ? `CPF/CNPJ: ${cust.cpf_cnpj}` : 'Sem documento'} • Tel: {cust.phone || cust.whatsapp || 'Não informado'}
                            </span>
                            {cust.address && (
                              <span className="text-slate-500 text-[10px] block mt-0.5">
                                {cust.address}, {cust.number || 'S/N'} - {cust.city || 'São Paulo'}/{cust.state || 'SP'}
                              </span>
                            )}
                          </div>
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-[10px] font-bold">
                            Selecionar
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-xs">
                        Cliente vinculado: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.cpf_cnpj || 'Sem CPF/CNPJ'})
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">Dados importados com sucesso</span>
                  </div>
                )}

                {/* Campos do Destinatário/Tomador */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome Completo / Razão Social *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nome do cliente ou empresa"
                      value={emitCustomerName}
                      onChange={(e) => setEmitCustomerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">CPF ou CNPJ *</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      value={emitCustomerDoc}
                      onChange={(e) => setEmitCustomerDoc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-amber-500"
                    />
                  </div>
                </div>

                {emitType === 'nfe_product' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Inscrição Estadual (IE):</label>
                      <input
                        type="text"
                        placeholder="ISENTO ou número da IE"
                        value={emitCustomerIe}
                        onChange={(e) => setEmitCustomerIe(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-amber-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Informe ISENTO para consumidor final não contribuinte.</span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">E-mail (para envio do XML e DANFE):</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          placeholder="cliente@email.com"
                          value={emitCustomerEmail}
                          onChange={(e) => setEmitCustomerEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp:</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="(11) 99999-9999"
                          value={emitCustomerPhone}
                          onChange={(e) => setEmitCustomerPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {emitType === 'nfse_service_mei' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">E-mail (para envio do XML e DANFSE):</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          placeholder="cliente@email.com"
                          value={emitCustomerEmail}
                          onChange={(e) => setEmitCustomerEmail(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp:</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="(11) 99999-9999"
                          value={emitCustomerPhone}
                          onChange={(e) => setEmitCustomerPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Endereço */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <span className="text-slate-400 font-semibold text-[11px] block flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400" />
                    Endereço Completo {emitType === 'nfe_product' ? 'do Destinatário (Obrigatório NF-e)' : 'do Tomador (Padrão Nacional)'}:
                  </span>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div className="col-span-2 sm:col-span-2">
                      <label className="block text-slate-400 text-[10px] mb-0.5">CEP:</label>
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={emitCustomerZip}
                        onChange={(e) => setEmitCustomerZip(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-3">
                      <label className="block text-slate-400 text-[10px] mb-0.5">Logradouro (Rua, Av) *:</label>
                      <input
                        type="text"
                        required={emitType === 'nfe_product'}
                        placeholder="Rua Exemplo"
                        value={emitCustomerAddress}
                        onChange={(e) => setEmitCustomerAddress(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-1">
                      <label className="block text-slate-400 text-[10px] mb-0.5">Nº:</label>
                      <input
                        type="text"
                        placeholder="100"
                        value={emitCustomerNumber}
                        onChange={(e) => setEmitCustomerNumber(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Bairro:</label>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={emitCustomerNeighborhood}
                        onChange={(e) => setEmitCustomerNeighborhood(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Município *:</label>
                      <input
                        type="text"
                        required
                        placeholder="São Paulo"
                        value={emitCustomerCity}
                        onChange={(e) => setEmitCustomerCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">UF *:</label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="SP"
                        value={emitCustomerState}
                        onChange={(e) => setEmitCustomerState(e.target.value.toUpperCase())}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3 CONDICIONAL: PRODUTOS E MERCADORIAS PUXADOS DO ESTOQUE (NF-e de Produtos) */}
              {emitType === 'nfe_product' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      3. Produtos e Mercadorias da NF-e (Integração com Estoque)
                    </span>
                    <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                      {nfeItems.length} produto(s) na nota
                    </span>
                  </div>

                  {/* Campo de Busca Rápida de Produtos no Estoque */}
                  <div className="relative">
                    <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                      Puxar Produto do Estoque (Pesquisa por Nome, SKU ou Código de Barras):
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={searchProductTerm}
                        onChange={(e) => handleSearchProducts(e.target.value)}
                        placeholder="Digite o nome do produto ou SKU cadastrado para autopreencher os dados fiscais..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      {isSearchingProduct && (
                        <div className="absolute right-3 top-2.5 text-[11px] text-amber-400 animate-pulse">
                          Buscando no estoque...
                        </div>
                      )}
                    </div>

                    {/* Resultados suspensos de produtos */}
                    {productSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800 max-h-56 overflow-y-auto z-20">
                        {productSearchResults.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleSelectProduct(prod)}
                            className="p-3 hover:bg-slate-800 cursor-pointer transition flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-white block">{prod.name}</span>
                              <span className="text-slate-400 text-[11px]">
                                SKU: {prod.sku || 'Sem SKU'} · NCM: {prod.ncm || '8517.13.00'} · Estoque: {prod.stock_quantity} {prod.unit || 'UN'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-amber-400 block">
                                R$ {Number(prod.sale_price || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-emerald-400 font-semibold">Puxar para NF-e</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campos do Produto para Adição */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Dados Fiscais do Item a Adicionar:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-1">
                        <label className="block text-slate-400 text-[10px] mb-0.5">Código / SKU:</label>
                        <input
                          type="text"
                          value={currentItemCode}
                          onChange={(e) => setCurrentItemCode(e.target.value)}
                          placeholder="0001"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-slate-400 text-[10px] mb-0.5">Descrição do Produto *:</label>
                        <input
                          type="text"
                          value={currentItemDesc}
                          onChange={(e) => setCurrentItemDesc(e.target.value)}
                          placeholder="Ex: Tela Display iPhone 13 OLED Original"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">NCM (8 dígitos) *:</label>
                        <input
                          type="text"
                          value={currentItemNcm}
                          onChange={(e) => setCurrentItemNcm(e.target.value)}
                          placeholder="8517.13.00"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">CFOP Item:</label>
                        <input
                          type="text"
                          value={currentItemCfop}
                          onChange={(e) => setCurrentItemCfop(e.target.value)}
                          placeholder="5102"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Unidade:</label>
                        <input
                          type="text"
                          value={currentItemUnit}
                          onChange={(e) => setCurrentItemUnit(e.target.value.toUpperCase())}
                          placeholder="UN"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Quantidade *:</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={currentItemQty}
                          onChange={(e) => setCurrentItemQty(e.target.value)}
                          placeholder="1"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Preço Unit. (R$) *:</label>
                        <input
                          type="number"
                          step="0.01"
                          value={currentItemPrice}
                          onChange={(e) => setCurrentItemPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-slate-400 text-xs">
                        Subtotal do item: <strong className="text-white font-mono">R$ {(Number(currentItemQty || 0) * Number(currentItemPrice || 0)).toFixed(2)}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddProductItem}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Produto à Nota</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabela dos Produtos Adicionados na NF-e */}
                  {nfeItems.length > 0 ? (
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-slate-400 text-[11px] uppercase border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Descrição do Produto</th>
                            <th className="p-2.5">NCM</th>
                            <th className="p-2.5">CFOP</th>
                            <th className="p-2.5">Un</th>
                            <th className="p-2.5">Qtd</th>
                            <th className="p-2.5">Vlr. Unit</th>
                            <th className="p-2.5">Total (R$)</th>
                            <th className="p-2.5 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                          {nfeItems.map((it, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="p-2.5 text-slate-500">{idx + 1}</td>
                              <td className="p-2.5 font-mono text-slate-300">{it.code}</td>
                              <td className="p-2.5 text-white font-semibold">{it.description}</td>
                              <td className="p-2.5 font-mono text-slate-400">{it.ncm}</td>
                              <td className="p-2.5 font-mono text-slate-400">{it.cfop}</td>
                              <td className="p-2.5 text-slate-400">{it.unit}</td>
                              <td className="p-2.5 font-mono text-white">{it.quantity}</td>
                              <td className="p-2.5 font-mono text-slate-300">R$ {it.unit_price.toFixed(2)}</td>
                              <td className="p-2.5 font-mono font-bold text-amber-400">R$ {it.total_price.toFixed(2)}</td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductItem(idx)}
                                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-800"
                                  title="Remover produto da nota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center space-y-1 bg-slate-900/30">
                      <Package className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-slate-400 text-xs font-semibold">Nenhum produto adicionado à NF-e ainda.</p>
                      <p className="text-slate-600 text-[11px]">Utilize o campo de busca acima para puxar os produtos cadastrados no estoque.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* SEÇÃO SERVIÇO PRESTADO (PADRÃO NACIONAL NFS-E) */
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    2. Dados do Serviço Prestado (Padrão Nacional / LC 116 / DPS)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Código de Tributação Nacional / Item LC 116 *:
                      </label>
                      <select
                        value={emitServiceCode}
                        onChange={(e) => setEmitServiceCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      >
                        <option value="14.01">14.01 - Conserto, restauração e manutenção de aparelhos e celulares</option>
                        <option value="14.02">14.02 - Assistência técnica em equipamentos e aparelhos</option>
                        <option value="01.07">01.07 - Suporte técnico em informática, sistemas e computadores</option>
                        <option value="31.01">31.01 - Serviços técnicos em telecomunicações e telefonia</option>
                        <option value="outro">Outro código da LC 116...</option>
                      </select>

                      {emitServiceCode === 'outro' && (
                        <input
                          type="text"
                          placeholder="Digite o código (ex: 14.01.01)"
                          value={emitCustomServiceCode}
                          onChange={(e) => setEmitCustomServiceCode(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs mt-1.5 font-mono"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Código CNAE da Atividade:</label>
                      <select
                        value={emitCnaeCode}
                        onChange={(e) => setEmitCnaeCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      >
                        <option value="9512-6/00">9512-6/00 - Manutenção e reparação de celulares e comunicação</option>
                        <option value="9511-8/00">9511-8/00 - Reparação de computadores e periféricos</option>
                        <option value="9521-5/00">9521-5/00 - Reparação de eletroeletrônicos em geral</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Data de Competência *:</label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="date"
                          required
                          value={emitCompetenceDate}
                          onChange={(e) => setEmitCompetenceDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Município da Prestação:</label>
                      <input
                        type="text"
                        value={emitServiceCity}
                        onChange={(e) => setEmitServiceCity(e.target.value)}
                        placeholder="São Paulo"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">UF da Prestação:</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={emitServiceState}
                        onChange={(e) => setEmitServiceState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Discriminação Detalhada dos Serviços Prestados * (Padrão Nacional):
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Descreva minuciosamente o serviço técnico executado, modelo do aparelho, peças aplicadas e garantia..."
                      value={emitOperation}
                      onChange={(e) => setEmitOperation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs leading-relaxed focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* SEÇÃO 4 CONDICIONAL: TOTAIS E INFORMAÇÕES COMPLEMENTARES */}
              {emitType === 'nfe_product' ? (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    4. Totais e Dados Adicionais da NF-e
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total dos Produtos:</span>
                      <strong className="text-xs font-mono text-white">R$ {totalNfeProducts.toFixed(2)}</strong>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Frete (+):</span>
                      <strong className="text-xs font-mono text-white">R$ {Number(emitFreightAmount || 0).toFixed(2)}</strong>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Desconto (-):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={emitDiscount}
                        onChange={(e) => setEmitDiscount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white font-mono text-xs text-center mt-1"
                      />
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-amber-500/40">
                      <span className="text-[10px] text-amber-400 font-bold block uppercase">Valor Total da NF-e:</span>
                      <strong className="text-sm font-mono font-black text-amber-400">R$ {totalNfeAmountCalculated.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Informações Complementares de Interesse do Contribuinte (infCpl - SEFAZ):
                    </label>
                    <textarea
                      rows={2}
                      value={emitAdditionalInfo}
                      onChange={(e) => setEmitAdditionalInfo(e.target.value)}
                      placeholder="Informações adicionais da nota fiscal..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                /* VALORES E TRIBUTAÇÃO DO SERVIÇO (NFS-e) */
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    3. Valores e Tributação do Serviço
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Valor dos Serviços (R$) *:</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={emitAmount}
                        onChange={(e) => setEmitAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-sm focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Desconto Incondicionado (R$):</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={emitDiscount}
                        onChange={(e) => setEmitDiscount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Valor Líquido da NFS-e:</label>
                      <div className="bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-amber-400 font-mono font-black text-sm">
                        R$ {Math.max(0, (Number(emitAmount) || 0) - (Number(emitDiscount) || 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Retenção de ISS pelo Tomador:</label>
                      <select
                        value={emitIssRetention}
                        onChange={(e) => setEmitIssRetention(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                      >
                        <option value={0}>1 - Não Retido (Padrão MEI / Simples Nacional via DAS)</option>
                        <option value={1}>2 - Retido na Fonte pelo Tomador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Alíquota de ISS (%):</label>
                      <input
                        type="number"
                        step="0.01"
                        value={emitIssRate}
                        onChange={(e) => setEmitIssRate(Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Optante pelo MEI tem tributação fixa no DAS-SIMEI (0,00%).
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmitModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={emitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {emitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{emitType === 'nfse_service_mei' ? 'Transmitindo ao Portal Nacional...' : 'Transmitindo à SEFAZ...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{emitType === 'nfse_service_mei' ? 'Emitir e Autorizar NFS-e Nacional' : 'Autorizar e Emitir NF-e (SEFAZ)'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: DANFE Viewer */}
      {showDanfeModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Documento Auxiliar Fiscal ({selectedInvoice.invoice_type === 'nfse_service_mei' ? 'DANFSE' : 'DANFE'})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
                <button onClick={() => setShowDanfeModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>

            {/* DANFE Printable Paper View */}
            <div className="bg-white text-slate-900 p-6 rounded-xl space-y-4 border border-slate-300 font-sans text-xs">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <h1 className="font-black text-base uppercase">{danfeData?.company?.trade_name || danfeData?.company?.name || 'Minha Loja'}</h1>
                  <p className="text-[11px] text-slate-600">{danfeData?.company?.name}</p>
                  <p className="text-[11px] text-slate-600">CNPJ: {danfeData?.company?.cnpj} · {danfeData?.company?.phone}</p>
                  <p className="text-[11px] text-slate-600">{danfeData?.company?.address} - {danfeData?.company?.city}/{danfeData?.company?.state}</p>
                </div>

                <div className="text-right border-l-2 border-slate-300 pl-4">
                  <span className="text-xs font-black uppercase tracking-wider block bg-slate-900 text-white px-2 py-0.5 rounded">
                    {selectedInvoice.invoice_type === 'nfse_service_mei' ? 'NFS-e NACIONAL MEI' : 'DANFE NF-e'}
                  </span>
                  <div className="text-lg font-black mt-1">Nº {selectedInvoice.number}</div>
                  <div className="text-[10px] text-slate-600">SÉRIE: {selectedInvoice.series}</div>
                  <div className="text-[10px] text-emerald-700 font-bold uppercase mt-1">STATUS: AUTORIZADA SEFAZ</div>
                </div>
              </div>

              {/* Chave de Acesso */}
              <div className="bg-slate-100 p-2.5 rounded border border-slate-300 space-y-1">
                <div className="text-[10px] font-bold text-slate-600 uppercase">Chave de Acesso / Código de Verificação Digital:</div>
                <div className="font-mono font-bold text-xs text-slate-900 tracking-wider break-all">
                  {selectedInvoice.access_key}
                </div>
                {selectedInvoice.protocol && (
                  <div className="text-[10px] text-slate-500">Protocolo de Autorização: {selectedInvoice.protocol}</div>
                )}
              </div>

              {/* Destinatário / Tomador */}
              <div className="border border-slate-300 rounded p-3 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase">
                  {selectedInvoice.invoice_type === 'nfse_service_mei' ? 'Dados do Tomador do Serviço (Cliente):' : 'Dados do Destinatário:'}
                </div>
                <div className="font-bold text-sm text-slate-900">{selectedInvoice.customer_name || 'Consumidor Final'}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>CPF/CNPJ: <strong>{selectedInvoice.customer_cpf_cnpj}</strong></div>
                  <div>
                    {selectedInvoice.invoice_type === 'nfe_product' ? (
                      <span>Inscrição Estadual: <strong>{selectedInvoice.customer_ie || 'ISENTO'}</strong></span>
                    ) : (
                      <span>Telefone: {selectedInvoice.customer_phone || '-'}</span>
                    )}
                  </div>
                </div>
                <div className="text-slate-700">E-mail: {selectedInvoice.customer_email || '-'} · Tel: {selectedInvoice.customer_phone || '-'}</div>
                <div className="text-slate-700">
                  Endereço: {selectedInvoice.customer_address ? `${selectedInvoice.customer_address}, ${selectedInvoice.customer_number || 'S/N'}${selectedInvoice.customer_neighborhood ? ` - ${selectedInvoice.customer_neighborhood}` : ''} - ` : ''}
                  {selectedInvoice.customer_city || 'São Paulo'}/{selectedInvoice.customer_state || 'SP'}
                  {selectedInvoice.customer_zip_code ? ` - CEP: ${selectedInvoice.customer_zip_code}` : ''}
                </div>
              </div>

              {/* Informações do Serviço (NFS-e Padrão Nacional) */}
              {selectedInvoice.invoice_type === 'nfse_service_mei' && (
                <div className="border border-slate-300 rounded p-3 space-y-2 bg-slate-50/50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Identificação do Serviço Prestado (Padrão Nacional NFS-e):</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Item da LC 116:</span>
                      <strong>{selectedInvoice.service_code || '14.01'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">CNAE:</span>
                      <strong>{selectedInvoice.cnae_code || '9512-6/00'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Competência:</span>
                      <strong>{selectedInvoice.competence_date ? new Date(selectedInvoice.competence_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Local da Prestação:</span>
                      <strong>{selectedInvoice.service_city || selectedInvoice.customer_city || 'São Paulo'}/{selectedInvoice.service_state || selectedInvoice.customer_state || 'SP'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* DADOS DOS PRODUTOS / SERVIÇOS */}
              {selectedInvoice.invoice_type === 'nfe_product' ? (
                <div className="border border-slate-300 rounded overflow-hidden space-y-0">
                  <div className="bg-slate-100 p-2 border-b border-slate-300 font-bold text-[10px] text-slate-700 uppercase">
                    Dados dos Produtos e Serviços (NF-e Modelo 55 / SEFAZ):
                  </div>
                  {(() => {
                    let itemsToRender: any[] = [];
                    if (danfeData?.invoice?.items && danfeData.invoice.items.length > 0) {
                      itemsToRender = danfeData.invoice.items;
                    } else if (selectedInvoice.items && selectedInvoice.items.length > 0) {
                      itemsToRender = selectedInvoice.items;
                    } else if (selectedInvoice.items_json) {
                      try {
                        itemsToRender = JSON.parse(selectedInvoice.items_json);
                      } catch (e) {
                        itemsToRender = [];
                      }
                    }

                    if (itemsToRender.length > 0) {
                      return (
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                            <tr>
                              <th className="p-1.5">Cód.</th>
                              <th className="p-1.5">Descrição do Produto</th>
                              <th className="p-1.5">NCM/SH</th>
                              <th className="p-1.5">CFOP</th>
                              <th className="p-1.5">Un</th>
                              <th className="p-1.5">Qtd</th>
                              <th className="p-1.5">Vlr. Unit</th>
                              <th className="p-1.5 text-right">Vlr. Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {itemsToRender.map((it: any, i: number) => (
                              <tr key={i}>
                                <td className="p-1.5 font-mono text-slate-600">{it.code}</td>
                                <td className="p-1.5 font-semibold text-slate-900">{it.description}</td>
                                <td className="p-1.5 font-mono text-slate-600">{it.ncm}</td>
                                <td className="p-1.5 font-mono text-slate-600">{it.cfop || selectedInvoice.cfop || '5102'}</td>
                                <td className="p-1.5 text-slate-600">{it.unit || 'UN'}</td>
                                <td className="p-1.5 font-mono text-slate-900">{it.quantity}</td>
                                <td className="p-1.5 font-mono text-slate-700">R$ {Number(it.unit_price).toFixed(2)}</td>
                                <td className="p-1.5 font-mono font-bold text-slate-900 text-right">
                                  R$ {Number(it.total_price || (it.quantity * it.unit_price)).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    }

                    return (
                      <p className="p-3 text-slate-800 font-mono text-[11px]">
                        {selectedInvoice.nature_of_operation || 'Venda de mercadoria adquirida ou recebida de terceiros'}
                      </p>
                    );
                  })()}
                </div>
              ) : (
                /* Discriminação dos Serviços (NFS-e) */
                <div className="border border-slate-300 rounded p-3 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Discriminação das Operações / Serviços Executados:</div>
                  <p className="text-slate-800 leading-relaxed font-mono text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200">
                    {selectedInvoice.service_description || selectedInvoice.nature_of_operation}
                  </p>
                </div>
              )}

              {/* Totais e Tributação */}
              {selectedInvoice.invoice_type === 'nfe_product' ? (
                <div className="bg-slate-50 p-3 rounded space-y-2 border border-slate-300">
                  <div className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-300 pb-1">
                    Cálculo do Imposto (SEFAZ - Simples Nacional):
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px] border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-slate-500 block">Base Cálc. ICMS:</span>
                      <strong>R$ 0,00</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Valor do ICMS:</span>
                      <strong>R$ 0,00</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Produtos:</span>
                      <strong>R$ {(selectedInvoice.total_products || selectedInvoice.total_amount).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Valor Frete:</span>
                      <strong>R$ {(selectedInvoice.freight_amount || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Desconto:</span>
                      <strong>R$ {(selectedInvoice.discount_amount || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-bold text-slate-800">Total da Nota:</span>
                      <strong className="text-xs font-black text-slate-950 font-mono">
                        R$ {selectedInvoice.total_amount?.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 flex justify-between items-center pt-0.5">
                    <span>
                      Modalidade de Frete: <strong>{selectedInvoice.freight_mode === '0' ? '0 - Remetente (CIF)' : selectedInvoice.freight_mode === '1' ? '1 - Destinatário (FOB)' : '9 - Sem Ocorrência de Transporte'}</strong>
                    </span>
                    <span>
                      Forma de Pagamento: <strong>{selectedInvoice.payment_method === '17' ? 'PIX' : selectedInvoice.payment_method === '01' ? 'Dinheiro' : selectedInvoice.payment_method === '03' ? 'Cartão Crédito' : 'À Vista'}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 p-3 rounded space-y-2 border border-slate-300">
                  <div className="grid grid-cols-3 gap-2 text-center border-b border-slate-300 pb-2 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Valor dos Serviços:</span>
                      <strong className="text-xs">R$ {selectedInvoice.total_amount?.toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Desconto:</span>
                      <strong className="text-xs">R$ {(selectedInvoice.discount_amount || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Retenção de ISS:</span>
                      <strong className="text-xs">{selectedInvoice.iss_retention === 1 ? 'Retido na Fonte' : 'Não Retido (MEI)'}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-xs uppercase text-slate-700">Valor Líquido da NFS-e:</span>
                    <span className="font-black text-base text-slate-950 font-mono">
                      R$ {Math.max(0, (selectedInvoice.total_amount || 0) - (selectedInvoice.discount_amount || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Informações Complementares */}
              <div className="text-[10px] text-slate-500 text-center border-t border-slate-200 pt-2">
                {selectedInvoice.additional_info || 'Documento emitido por empresa optante pelo Simples Nacional / MEI. Não gera direito a crédito fiscal de IPI ou ICMS.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cancel Invoice */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold border-b border-slate-800 pb-3">
              <XCircle className="w-5 h-5" />
              <span>Cancelamento de Nota Fiscal na SEFAZ</span>
            </div>

            <p className="text-xs text-slate-300">
              Informe a justificativa formal para cancelamento da nota (mínimo de 15 caracteres exigidos pela SEFAZ):
            </p>

            <textarea
              rows={3}
              placeholder="Ex: Cancelamento por erro no preenchimento dos dados do destinatário e emissão duplicada."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={canceling}
                onClick={handleCancelInvoice}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-md disabled:opacity-50"
              >
                {canceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
