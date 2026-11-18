import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  Smartphone,
  CheckSquare,
  DollarSign,
  Calendar,
  AlertCircle,
  Save,
  CheckCircle,
  Search,
  Plus,
  Camera,
  Image as ImageIcon,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import { api } from '../../api.ts';

interface NewOSProps {
  onBack: () => void;
  onCreated: (newOsId: number) => void;
}

export const NewOS: React.FC<NewOSProps> = ({ onBack, onCreated }) => {
  const [nextCode, setNextCode] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer State
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');

  // Device State
  const [customerDevices, setCustomerDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [deviceBrand, setDeviceBrand] = useState('Apple');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceImei, setDeviceImei] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [devicePassword, setDevicePassword] = useState('');

  // Details
  const [reportedDefects, setReportedDefects] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState(90);
  const [warrantyUnit, setWarrantyUnit] = useState('Dias');

  // Advance Payment
  const [advancePayment, setAdvancePayment] = useState<number | string>('');
  const [advanceMethod, setAdvanceMethod] = useState('Dinheiro');
  const [cashIsOpen, setCashIsOpen] = useState(true);

  // Technicians
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState<number | ''>('');

  // Checklist (29 standard items)
  const [checklist, setChecklist] = useState<any[]>([
    { key: 'liga', label: 'Aparelho liga normalmente', status: 'nao' },
    { key: 'reinicia', label: 'Reinicia sozinho ou desliga inesperadamente', status: 'nao' },
    { key: 'tela_quebrada', label: 'Tela ou vidro quebrado/trincado', status: 'nao' },
    { key: 'tela_mancha', label: 'Mancha ou linhas no display (LCD/OLED)', status: 'nao' },
    { key: 'touch_falhas', label: 'Touch screen com falhas ou toque fantasma', status: 'nao' },
    { key: 'bateria_saude', label: 'Bateria descarregando rápido', status: 'nao' },
    { key: 'bateria_inchada', label: 'Bateria inchada (requer substituição)', status: 'nao' },
    { key: 'porta_carga', label: 'Porta de carga danificada ou com folga', status: 'nao' },
    { key: 'botao_power', label: 'Botão Power com defeito', status: 'nao' },
    { key: 'botoes_volume', label: 'Botões de volume com defeito', status: 'nao' },
    { key: 'carcaca_amassada', label: 'Carcaça amassada, empenada ou trincada', status: 'nao' },
    { key: 'oxidacao', label: 'Contato com líquido / Oxidação', status: 'nao' },
    { key: 'camera_traseira', label: 'Câmera traseira falhando', status: 'nao' },
    { key: 'camera_frontal', label: 'Câmera frontal falhando', status: 'nao' },
    { key: 'lente_camera', label: 'Lente de vidro da câmera trincada', status: 'nao' },
    { key: 'alto_falante', label: 'Alto-falante viva-voz (chiando/mudo)', status: 'nao' },
    { key: 'auricular', label: 'Alto-falante auricular (áudio de chamada)', status: 'nao' },
    { key: 'microfone', label: 'Microfone com ruído ou mudo', status: 'nao' },
    { key: 'biometria', label: 'Biometria / Digital com defeito', status: 'nao' },
    { key: 'face_id', label: 'Face ID / Reconhecimento facial inoperante', status: 'nao' },
    { key: 'wifi', label: 'Wi-Fi não conecta ou sinal fraco', status: 'nao' },
    { key: 'bluetooth', label: 'Bluetooth não pareia', status: 'nao' },
    { key: 'rede_movel', label: 'Rede celular / Chip sem serviço', status: 'nao' },
    { key: 'sensor_proximidade', label: 'Sensor de proximidade não apaga tela', status: 'nao' },
    { key: 'nfc', label: 'NFC / Pagamento por aproximação inoperante', status: 'nao' },
    { key: 'sistema_lento', label: 'Sistema lento ou travando', status: 'nao' },
    { key: 'bloqueio_conta', label: 'Bloqueio de conta (iCloud/FRP/Google)', status: 'nao' }
  ]);

  const [showChecklistModal, setShowChecklistModal] = useState(false);

  useEffect(() => {
    loadInitialInfo();
  }, []);

  async function loadInitialInfo() {
    try {
      const codeRes = await api.getNextOSCode();
      setNextCode(codeRes.nextCode);

      const cashRes = await api.getCashStatus();
      setCashIsOpen(cashRes.isOpen);

      const usersRes = await api.getUsers();
      setTechnicians(usersRes.filter((u: any) => u.role === 'technician' || u.role === 'master'));
    } catch (e) {
      console.error(e);
    }
  }

  async function searchCustomers(term: string) {
    setCustomerSearch(term);
    if (term.length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const res = await api.getCustomers({ q: term });
      setCustomerResults(res);
    } catch (e) {
      console.error(e);
    }
  }

  async function selectCustomer(cust: any) {
    setSelectedCustomer(cust);
    setCustomerSearch('');
    setCustomerResults([]);
    try {
      const details = await api.getCustomerDetails(cust.id);
      setCustomerDevices(details.devices || []);
      if (details.devices && details.devices.length > 0) {
        selectDevice(details.devices[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function selectDevice(dev: any) {
    setSelectedDevice(dev);
    setDeviceBrand(dev.brand);
    setDeviceModel(dev.model);
    setDeviceImei(dev.imei_serial || '');
    setDeviceColor(dev.color || '');
    setDevicePassword(dev.unlock_password || '');
  }

  async function handleCreateNewCustomer() {
    if (!newCustName.trim()) return;
    try {
      const res = await api.createCustomer({
        name: newCustName,
        phone: newCustPhone,
        cpf_cnpj: newCustCpf
      });
      setShowNewCustModal(false);
      selectCustomer({ id: res.id, name: res.name, phone: newCustPhone, cpf_cnpj: newCustCpf });
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar cliente');
    }
  }

  function updateChecklistItem(key: string, status: 'sim' | 'nao' | 'nao_se_aplica') {
    setChecklist(prev => prev.map(item => item.key === key ? { ...item, status } : item));
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`A imagem "${file.name}" ultrapassa o limite de 5MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setEntryPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  function handleRemovePhoto(indexToRemove: number) {
    setEntryPhotos(prev => prev.filter((_, idx) => idx !== indexToRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer && !newCustName) {
      setError('Por favor selecione ou informe o cliente da O.S.');
      return;
    }
    if (!deviceBrand || !deviceModel) {
      setError('Informe a marca e modelo do aparelho.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        customer_name: !selectedCustomer ? newCustName : undefined,
        customer_phone: !selectedCustomer ? newCustPhone : undefined,
        customer_cpf: !selectedCustomer ? newCustCpf : undefined,
        device_id: selectedDevice ? selectedDevice.id : null,
        device_brand: deviceBrand,
        device_model: deviceModel,
        device_imei: deviceImei,
        device_color: deviceColor,
        device_password: devicePassword,
        reported_defects: reportedDefects,
        entry_notes: entryNotes,
        entry_photos: entryPhotos,
        internal_notes: internalNotes,
        deadline_date: deadlineDate || null,
        advance_payment: Number(advancePayment) || 0,
        advance_payment_method: advanceMethod,
        warranty_period: warrantyPeriod,
        warranty_unit: warrantyUnit,
        technician_id: selectedTech || null,
        checklist: checklist
      };

      const res = await api.createOS(payload);
      onCreated(res.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar Ordem de Serviço.');
    } finally {
      setLoading(false);
    }
  }

  const checklistSimCount = checklist.filter(c => c.status === 'sim').length;
  const checklistNaoCount = checklist.filter(c => c.status === 'nao').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Hub de O.S.</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
            Nova O.S. #{nextCode}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Device Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Section */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <User className="w-5 h-5 text-blue-400" />
                <span>1. Cliente</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Cliente</span>
              </button>
            </div>

            {selectedCustomer ? (
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedCustomer.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCustomer.phone || selectedCustomer.whatsapp || 'Sem telefone'} • CPF: {selectedCustomer.cpf_cnpj || 'Não informado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null);
                    setSelectedDevice(null);
                    setCustomerDevices([]);
                  }}
                  className="text-xs text-red-400 hover:underline"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => searchCustomers(e.target.value)}
                    placeholder="Buscar cliente por nome, CPF ou telefone…"
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {customerResults.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800 max-h-48 overflow-y-auto">
                    {customerResults.map(cust => (
                      <div
                        key={cust.id}
                        onClick={() => selectCustomer(cust)}
                        className="p-3 hover:bg-slate-800 cursor-pointer transition text-xs"
                      >
                        <div className="font-semibold text-white">{cust.name}</div>
                        <div className="text-slate-400">{cust.phone} • {cust.cpf_cnpj}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device Section */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <span>2. Aparelho / Equipamento</span>
              </div>
              {customerDevices.length > 0 && (
                <span className="text-xs text-slate-400">
                  {customerDevices.length} aparelho(s) cadastrado(s)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Marca *</label>
                <select
                  value={deviceBrand}
                  onChange={(e) => setDeviceBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Apple">Apple</option>
                  <option value="Samsung">Samsung</option>
                  <option value="Motorola">Motorola</option>
                  <option value="Xiaomi">Xiaomi</option>
                  <option value="LG">LG</option>
                  <option value="Asus">Asus</option>
                  <option value="Dell">Dell</option>
                  <option value="Lenovo">Lenovo</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: iPhone 13, Moto G8"
                  value={deviceModel}
                  onChange={(e) => setDeviceModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">IMEI / Número de Série</label>
                <input
                  type="text"
                  placeholder="15 dígitos ou serial"
                  value={deviceImei}
                  onChange={(e) => setDeviceImei(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Cor</label>
                <input
                  type="text"
                  placeholder="Ex: Preto, Azul"
                  value={deviceColor}
                  onChange={(e) => setDeviceColor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Senha de Desbloqueio</label>
                <input
                  type="text"
                  placeholder="Senha ou padrão"
                  value={devicePassword}
                  onChange={(e) => setDevicePassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Checklist & Attendance Notes */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <CheckSquare className="w-5 h-5 text-blue-400" />
              <span>3. Atendimento & Checklist de Entrada</span>
            </div>

            <button
              type="button"
              onClick={() => setShowChecklistModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold flex items-center gap-2 transition"
            >
              <span>Responder Checklist ({checklistSimCount} Sim, {checklistNaoCount} Não)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Defeitos relatados pelo cliente *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Como o cliente descreveu o problema ocorrido..."
                value={reportedDefects}
                onChange={(e) => setReportedDefects(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Observações de entrada (Aparência, Riscos, Acessórios)
                </label>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium transition">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Anexar Fotos ({entryPhotos.length})</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={3}
                placeholder="Aparelho com riscos na tampa traseira, sem carregador, película trincada..."
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />

              {/* Photos Gallery Preview */}
              {entryPhotos.length > 0 && (
                <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Fotos do Estado de Entrada ({entryPhotos.length})
                    </span>
                    <label className="cursor-pointer text-blue-400 hover:text-blue-300 text-[11px] font-semibold">
                      + Adicionar mais fotos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {entryPhotos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-square bg-slate-950">
                        <img
                          src={photo}
                          alt={`Foto de entrada ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setPreviewPhoto(photo)}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(photo)}
                            className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700"
                            title="Visualizar foto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="p-1 rounded bg-red-600 text-white hover:bg-red-700"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Previsão de Entrega</label>
              <div className="relative">
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Técnico Responsável</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(Number(e.target.value) || '')}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Atribuir posteriormente</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Garantia Padrão</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={warrantyPeriod}
                  onChange={(e) => setWarrantyPeriod(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <select
                  value={warrantyUnit}
                  onChange={(e) => setWarrantyUnit(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Dias">Dias</option>
                  <option value="Meses">Meses</option>
                  <option value="Anos">Anos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Advance Payment Section */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>4. Pagamento Adiantado / Sinal</span>
            </div>
            {!cashIsOpen && (
              <span className="text-xs text-amber-400 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-4 h-4" />
                Caixa fechado (Não é possível registrar adiantamento)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Valor que abate o total (R$)</label>
              <input
                type="number"
                step="0.01"
                disabled={!cashIsOpen}
                placeholder="0.00"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Forma de Pagamento</label>
              <select
                disabled={!cashIsOpen || !advancePayment}
                value={advanceMethod}
                onChange={(e) => setAdvanceMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de débito">Cartão de débito</option>
                <option value="Cartão de crédito">Cartão de crédito</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Criando O.S...' : 'Criar Ordem de Serviço'}</span>
          </button>
        </div>
      </form>

      {/* Modal: New Customer Inline */}
      {showNewCustModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Novo Cliente</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome Completo *</label>
              <input
                type="text"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">CPF / CNPJ</label>
              <input
                type="text"
                value={newCustCpf}
                onChange={(e) => setNewCustCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewCustModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewCustomer}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Confirmar e Selecionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Interactive 29-item Checklist */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">Checklist de Verificação</h3>
                <p className="text-xs text-slate-400">Inspeção detalhada na entrada do dispositivo</p>
              </div>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-2">
              {checklist.map((item) => (
                <div
                  key={item.key}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between gap-4"
                >
                  <span className="text-xs font-medium text-slate-200">{item.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateChecklistItem(item.key, 'sim')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                        item.status === 'sim'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Sim (Defeito)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateChecklistItem(item.key, 'nao')}
                      className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                        item.status === 'nao'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Não (OK)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-4">
              <span className="text-xs text-slate-400">
                {checklistSimCount} com defeito(s), {checklistNaoCount} testados e OK
              </span>
              <button
                type="button"
                onClick={() => setShowChecklistModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Concluir Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl p-3 border border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-300 font-semibold">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Foto de Entrada do Equipamento</span>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewPhoto}
              alt="Estado do equipamento"
              className="max-h-[75vh] w-auto rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};
