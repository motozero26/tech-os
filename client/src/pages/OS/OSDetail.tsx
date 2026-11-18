import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Printer,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Wrench,
  Smartphone,
  User,
  ShieldCheck,
  History,
  FileText,
  AlertCircle,
  ChevronRight,
  Camera,
  Eye,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../../api.ts';
import { PrintOS } from './PrintOS.tsx';

interface OSDetailProps {
  osId: number;
  onBack: () => void;
}

export const OSDetail: React.FC<OSDetailProps> = ({ osId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Add Item Modals
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [servicesCatalog, setServicesCatalog] = useState<any[]>([]);
  const [productsInventory, setProductsInventory] = useState<any[]>([]);

  // Service form
  const [servDesc, setServDesc] = useState('');
  const [servPrice, setServPrice] = useState('');
  const [servQty, setServQty] = useState(1);
  const [servId, setServId] = useState<number | ''>('');

  // Part form
  const [partDesc, setPartDesc] = useState('');
  const [partPrice, setPartPrice] = useState('');
  const [partQty, setPartQty] = useState(1);
  const [partId, setPartId] = useState<number | ''>('');
  const [partWarrantyPeriod, setPartWarrantyPeriod] = useState(90);
  const [partWarrantyUnit, setPartWarrantyUnit] = useState('Dias');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [discountVal, setDiscountVal] = useState(0);

  // Print Mode
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal80' | 'thermal58' | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  async function handleUploadMorePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    const readers = Array.from(files).map(file => {
      return new Promise<void>((resolve) => {
        if (file.size > 5 * 1024 * 1024) {
          alert(`A imagem "${file.name}" ultrapassa o limite de 5MB.`);
          resolve();
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newPhotos.push(event.target.result as string);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(readers);
    if (newPhotos.length > 0) {
      try {
        const currentPhotos = Array.isArray(data?.os?.entry_photos)
          ? data.os.entry_photos
          : (typeof data?.os?.entry_photos === 'string' ? JSON.parse(data.os.entry_photos || '[]') : []);
        const updated = [...currentPhotos, ...newPhotos];
        await api.updateOSPhotos(osId, updated);
        await loadOSDetails();
      } catch (err: any) {
        alert(err.message || 'Erro ao anexar fotos');
      }
    }
    e.target.value = '';
  }

  useEffect(() => {
    loadOSDetails();
    loadCatalogs();
  }, [osId]);

  async function loadOSDetails() {
    setLoading(true);
    try {
      const res = await api.getOSDetails(osId);
      setData(res);
      setNewStatus(res.os.status);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogs() {
    try {
      const [servs, prods] = await Promise.all([
        api.getServices(),
        api.getProducts({ is_part: 1 })
      ]);
      setServicesCatalog(servs);
      setProductsInventory(prods);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStatusChange() {
    if (!newStatus) return;
    try {
      await api.updateOSStatus(osId, { status: newStatus, notes: statusNote });
      setShowStatusModal(false);
      setStatusNote('');
      loadOSDetails();
    } catch (e: any) {
      alert(e.message || 'Erro ao alterar situação');
    }
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!servDesc || !servPrice) return;
    try {
      await api.addOSItem(osId, {
        item_type: 'service',
        service_id: servId || null,
        description: servDesc,
        unit_price: Number(servPrice),
        quantity: servQty
      });
      setShowAddServiceModal(false);
      setServDesc('');
      setServPrice('');
      setServQty(1);
      setServId('');
      loadOSDetails();
    } catch (e: any) {
      alert(e.message || 'Erro ao adicionar serviço');
    }
  }

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    if (!partDesc || !partPrice) return;
    try {
      await api.addOSItem(osId, {
        item_type: 'part',
        product_id: partId || null,
        description: partDesc,
        unit_price: Number(partPrice),
        quantity: partQty,
        warranty_period: partWarrantyPeriod,
        warranty_unit: partWarrantyUnit
      });
      setShowAddPartModal(false);
      setPartDesc('');
      setPartPrice('');
      setPartQty(1);
      setPartId('');
      loadOSDetails();
    } catch (e: any) {
      alert(e.message || 'Erro ao adicionar peça');
    }
  }

  async function handleDeleteItem(itemId: number) {
    if (!confirm('Deseja realmente remover este item da O.S.? O estoque será restaurado caso seja peça.')) return;
    try {
      await api.deleteOSItem(osId, itemId);
      loadOSDetails();
    } catch (e: any) {
      alert(e.message || 'Erro ao remover item');
    }
  }

  async function handleFinalizePayment() {
    try {
      await api.payOS(osId, {
        payment_method: paymentMethod,
        discount: discountVal,
        final_status: 'Finalizada'
      });
      setShowPaymentModal(false);
      loadOSDetails();
    } catch (e: any) {
      alert(e.message || 'Erro ao finalizar pagamento');
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando dados da O.S...</span>
        </div>
      </div>
    );
  }

  const { os, items, checklist, history, company } = data;
  const netDue = Math.max(0, (os.total_amount - os.advance_payment - (os.discount || 0)));

  const statusOptions = [
    'Aguardando avaliação',
    'Aguardando orçamento',
    'Autorizada',
    'Reparo em andamento',
    'Pronta',
    'Finalizada',
    'Laudo técnico',
    'Devolver na garantia',
    'Finalizada sem reparo',
    'Cancelada'
  ];

  return (
    <>
      {/* If in print mode, render print component */}
      {printFormat && (
        <PrintOS
          format={printFormat}
          os={os}
          items={items}
          checklist={checklist}
          company={company}
          onClose={() => setPrintFormat(null)}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6 print:hidden">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-white font-mono">
                  GESTÃO O.S. #{os.code}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                  Matriz
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Entrada em {new Date(os.entry_date).toLocaleString('pt-BR')} • Atendente: {os.attendant_name || 'Sistema'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Change Button */}
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-bold transition flex items-center gap-2"
            >
              <span>Situação: {os.status}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Print Dropdown */}
            <div className="relative group">
              <button
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
              <div className="absolute right-0 mt-1 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 hidden group-hover:block z-30">
                <button
                  onClick={() => setPrintFormat('a4')}
                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                  Imprimir A4 (Padrão)
                </button>
                <button
                  onClick={() => setPrintFormat('thermal80')}
                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                  Térmica 80 mm
                </button>
                <button
                  onClick={() => setPrintFormat('thermal58')}
                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-900 hover:text-white"
                >
                  Térmica 58 mm
                </button>
              </div>
            </div>

            {/* Payment Button */}
            {os.status !== 'Finalizada' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                <span>Receber / Fechar O.S.</span>
              </button>
            )}
          </div>
        </div>

        {/* 2 Columns: Client/Device Info and Defect Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client & Device Box */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Dados do Cliente & Aparelho</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Cliente:</span>
                <p className="font-bold text-white text-sm mt-0.5">{os.customer_name}</p>
                <p className="text-slate-400">{os.customer_phone || 'Sem telefone'}</p>
                <p className="text-slate-500">CPF: {os.customer_cpf || 'Não informado'}</p>
              </div>

              <div>
                <span className="text-slate-400">Aparelho:</span>
                <p className="font-bold text-white text-sm mt-0.5">
                  {os.device_brand} {os.device_model}
                </p>
                <p className="text-slate-400">Cor: {os.device_color || 'Não informada'}</p>
                <p className="text-slate-500 font-mono">IMEI: {os.imei_serial || 'Não informado'}</p>
                {os.unlock_password && (
                  <p className="text-amber-400 font-semibold mt-1">Senha: {os.unlock_password}</p>
                )}
              </div>
            </div>
          </div>

          {/* Defect, Notes & Deadlines */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              <span>Diagnóstico & Observações de Entrada</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Defeito Relatado:</span>
                <p className="text-slate-200 mt-0.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  {os.reported_defects || 'Nenhum defeito detalhado.'}
                </p>
              </div>

              {os.entry_notes && (
                <div>
                  <span className="text-slate-400 font-semibold">Observações da Entrada (Acessórios, riscos):</span>
                  <p className="text-slate-300 mt-0.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    {os.entry_notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-slate-400">Previsão: </span>
                  <span className="text-amber-400 font-semibold">
                    {os.deadline_date ? new Date(os.deadline_date).toLocaleDateString('pt-BR') : 'Não estipulada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Garantia: </span>
                  <span className="text-emerald-400 font-semibold">{os.warranty_period} {os.warranty_unit}</span>
                </div>
              </div>

              {/* Fotos de Entrada do Aparelho */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    Fotos do Estado de Entrada ({Array.isArray(os.entry_photos) ? os.entry_photos.length : (typeof os.entry_photos === 'string' ? JSON.parse(os.entry_photos || '[]').length : 0)})
                  </span>
                  <label className="cursor-pointer text-blue-400 hover:text-blue-300 text-[11px] font-semibold flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span>Anexar Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadMorePhotos}
                      className="hidden"
                    />
                  </label>
                </div>

                {(() => {
                  const photosList: string[] = Array.isArray(os.entry_photos)
                    ? os.entry_photos
                    : (typeof os.entry_photos === 'string' ? JSON.parse(os.entry_photos || '[]') : []);

                  if (photosList.length === 0) {
                    return (
                      <p className="text-[11px] text-slate-500 italic py-1">
                        Nenhuma foto anexada no momento da entrada.
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                      {photosList.map((photo: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhoto(photo)}
                          className="relative group rounded-lg overflow-hidden border border-slate-700 aspect-square bg-slate-900 cursor-pointer shadow-sm"
                        >
                          <img
                            src={photo}
                            alt={`Entrada ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Eye className="w-4 h-4 text-white drop-shadow" />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Parts and Services Section */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Peças e Serviços da O.S.</h3>
              <p className="text-xs text-slate-400">Adicione peças do estoque e serviços com garantia individual</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddServiceModal(true)}
                className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Serviço</span>
              </button>

              <button
                onClick={() => setShowAddPartModal(true)}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Peça</span>
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhuma peça ou serviço adicionado nesta ordem de serviço ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3">Garantia</th>
                    <th className="py-2.5 px-3 text-right">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Unitário</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 text-center">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                          item.item_type === 'service'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {item.item_type === 'service' ? 'Serviço' : 'Peça'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {item.description}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {item.warranty_period} {item.warranty_unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        R$ {item.unit_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        R$ {item.total_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals Summary */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-400 space-y-1">
              <div>Serviços: <span className="font-mono font-bold text-white">R$ {os.total_services.toFixed(2)}</span></div>
              <div>Peças: <span className="font-mono font-bold text-white">R$ {os.total_parts.toFixed(2)}</span></div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-right space-y-1">
              <div className="text-xs text-slate-400">
                Adiantamento recebido: <span className="text-emerald-400 font-mono">R$ {os.advance_payment.toFixed(2)}</span>
              </div>
              {os.discount > 0 && (
                <div className="text-xs text-slate-400">
                  Desconto: <span className="text-red-400 font-mono">R$ {os.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="text-lg font-black font-mono text-white pt-1">
                Restante a pagar: <span className="text-blue-400">R$ {netDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* History and Checklist Accordions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* History */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Histórico de Tramitação</span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {history.map((h: any) => (
                <div key={h.id} className="text-xs border-l-2 border-blue-500 pl-3 py-1 space-y-0.5">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>{h.to_status}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(h.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-slate-400">{h.notes}</div>
                  <div className="text-[10px] text-slate-500">Por: {h.user_name || 'Sistema'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist Summary */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Checklist de Entrada</span>
              </div>
              <span className="text-xs text-slate-400">29 itens inspecionados</span>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {checklist.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 text-xs border border-slate-800/60"
                >
                  <span className="text-slate-300">{c.item_label}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.status === 'sim'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {c.status === 'sim' ? 'Defeito' : 'OK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Change Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Alterar Situação da O.S.</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nova Situação</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {statusOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Motivo / Observação da Mudança</label>
              <textarea
                rows={3}
                placeholder="Ex: Peça chegou e foi iniciada a substituição..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStatusChange}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Nova Situação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Service */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddService} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Adicionar Serviço à O.S.</h3>

            {servicesCatalog.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Selecionar do Catálogo</label>
                <select
                  value={servId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setServId(id || '');
                    const found = servicesCatalog.find(s => s.id === id);
                    if (found) {
                      setServDesc(found.name);
                      setServPrice(found.default_price.toString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Digitar serviço avulso...</option>
                  {servicesCatalog.map(s => (
                    <option key={s.id} value={s.id}>{s.name} - R$ {s.default_price.toFixed(2)}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Descrição do Serviço *</label>
              <input
                type="text"
                required
                value={servDesc}
                onChange={(e) => setServDesc(e.target.value)}
                placeholder="Ex: Troca de tela, Limpeza química"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={servPrice}
                  onChange={(e) => setServPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={servQty}
                  onChange={(e) => setServQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddServiceModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Adicionar à O.S.
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Part */}
      {showAddPartModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddPart} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Adicionar Peça à O.S.</h3>

            {productsInventory.length > 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Selecionar do Estoque</label>
                <select
                  value={partId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setPartId(id || '');
                    const found = productsInventory.find(p => p.id === id);
                    if (found) {
                      setPartDesc(found.name);
                      setPartPrice(found.sale_price.toString());
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Digitar peça avulsa...</option>
                  {productsInventory.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Saldo: {p.stock_quantity}) - R$ {p.sale_price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Descrição da Peça *</label>
              <input
                type="text"
                required
                value={partDesc}
                onChange={(e) => setPartDesc(e.target.value)}
                placeholder="Ex: Tela iPhone 13 OLED Premium"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preço Unitário (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={partPrice}
                  onChange={(e) => setPartPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={partQty}
                  onChange={(e) => setPartQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Garantia Individual da Peça</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={partWarrantyPeriod}
                  onChange={(e) => setPartWarrantyPeriod(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <select
                  value={partWarrantyUnit}
                  onChange={(e) => setPartWarrantyUnit(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Dias">Dias</option>
                  <option value="Meses">Meses</option>
                  <option value="Anos">Anos</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPartModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Adicionar à O.S.
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Payment / Fechamento de O.S. */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Recebimento & Conclusão da O.S.</h3>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Bruto:</span>
                <span className="font-mono text-white">R$ {os.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sinal Já Pago:</span>
                <span className="font-mono text-emerald-400">- R$ {os.advance_payment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800 text-sm">
                <span>Saldo a Receber:</span>
                <span className="font-mono text-blue-400">
                  R$ {Math.max(0, netDue - discountVal).toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Desconto Concedido (R$)</label>
              <input
                type="number"
                step="0.01"
                value={discountVal}
                onChange={(e) => setDiscountVal(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Forma de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de débito">Cartão de débito</option>
                <option value="Cartão de crédito">Cartão de crédito</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalizePayment}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Confirmar Pagamento e Finalizar
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
    </>
  );
};
