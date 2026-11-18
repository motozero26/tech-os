import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Smartphone,
  Plus,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api.ts';

interface SeminovosProps {
  onBack: () => void;
}

export const Seminovos: React.FC<SeminovosProps> = ({ onBack }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Buy form
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCpf, setCustCpf] = useState('');
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState('Excelente');
  const [buyPrice, setBuyPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    setLoading(true);
    try {
      const data = await api.getUsedDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!custName || !brand || !model || !imei || !buyPrice) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      await api.purchaseUsedDevice({
        customer_name: custName,
        customer_phone: custPhone,
        customer_cpf: custCpf,
        brand,
        model,
        imei_serial: imei,
        color,
        condition_grade: condition,
        purchase_price: Number(buyPrice),
        expected_sale_price: Number(salePrice) || undefined,
        notes
      });
      setShowBuyModal(false);
      resetForm();
      loadDevices();
    } catch (e: any) {
      alert(e.message || 'Erro ao registrar compra de seminovo');
    }
  }

  function resetForm() {
    setCustName('');
    setCustPhone('');
    setCustCpf('');
    setModel('');
    setImei('');
    setColor('');
    setBuyPrice('');
    setSalePrice('');
    setNotes('');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Compra & Venda de Seminovos</h2>
            <p className="text-xs text-slate-400">
              Controle de aquisição e revenda de aparelhos usados com saída direta de caixa.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowBuyModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Comprar Aparelho de Cliente</span>
        </button>
      </div>

      {/* Devices List */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Estoque de Seminovos</h3>
          <span className="text-xs text-slate-400">{devices.length} aparelho(s) registrado(s)</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Carregando seminovos...</div>
        ) : devices.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Nenhum aparelho seminovo registrado no momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Aparelho</th>
                  <th className="py-3 px-4">IMEI / Serial</th>
                  <th className="py-3 px-4">Comprado de</th>
                  <th className="py-3 px-4">Conservação</th>
                  <th className="py-3 px-4 text-right">Valor Pago</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {devices.map(d => (
                  <tr key={d.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-semibold text-white">
                      {d.brand} {d.model} {d.color && `(${d.color})`}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {d.imei_serial}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {d.customer_name} ({d.customer_phone || d.customer_cpf})
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {d.condition_grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      R$ {d.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {d.status === 'stock' ? 'Em Estoque' : 'Vendido'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Buy Used Phone */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handlePurchase} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Comprar Aparelho de Cliente</h3>
            <p className="text-xs text-slate-400">O valor de compra sairá automaticamente do saldo do caixa aberto.</p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nome do Vendedor (Cliente) *</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CPF do Vendedor</label>
                  <input
                    type="text"
                    value={custCpf}
                    onChange={(e) => setCustCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Marca *</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Motorola">Motorola</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: iPhone 11 64GB"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IMEI *</label>
                  <input
                    type="text"
                    required
                    placeholder="15 dígitos"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Cor</label>
                  <input
                    type="text"
                    placeholder="Ex: Branco"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estado</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Excelente">Excelente (Sem marcas)</option>
                    <option value="Bom">Bom (Pequenas marcas)</option>
                    <option value="Marcas de uso">Marcas de uso evidentes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor Pago (Sai do Caixa R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço Sugerido de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl"
              >
                Efetivar Compra
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
