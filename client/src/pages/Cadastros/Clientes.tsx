import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Smartphone,
  ClipboardList,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Eye
} from 'lucide-react';
import { api } from '../../api.ts';

export const Clientes: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustDetails, setSelectedCustDetails] = useState<any>(null);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);

  // New Customer Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [notes, setNotes] = useState('');

  // New Device Form
  const [devBrand, setDevBrand] = useState('Apple');
  const [devModel, setDevModel] = useState('');
  const [devImei, setDevImei] = useState('');
  const [devColor, setDevColor] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [search]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await api.getCustomers({ q: search });
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    try {
      await api.createCustomer({
        name, phone, whatsapp, cpf_cnpj: cpf, email,
        address, city, state, notes
      });
      setShowAddModal(false);
      resetCustomerForm();
      loadCustomers();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar cliente');
    }
  }

  function resetCustomerForm() {
    setName('');
    setPhone('');
    setWhatsapp('');
    setCpf('');
    setEmail('');
    setAddress('');
    setCity('');
    setNotes('');
  }

  async function viewCustomer(id: number) {
    try {
      const details = await api.getCustomerDetails(id);
      setSelectedCustDetails(details);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAddDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!devBrand || !devModel || !selectedCustDetails) return;
    try {
      await api.addCustomerDevice(selectedCustDetails.customer.id, {
        brand: devBrand,
        model: devModel,
        imei_serial: devImei || null,
        color: devColor || null
      });
      setShowAddDeviceModal(false);
      setDevModel('');
      setDevImei('');
      setDevColor('');
      viewCustomer(selectedCustDetails.customer.id);
    } catch (e: any) {
      alert(e.message || 'Erro ao adicionar aparelho');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Base de Clientes</h2>
          <p className="text-xs text-slate-400">
            Histórico completo de clientes, aparelhos vinculados e ordens de serviço.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, CPF ou e-mail…"
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Carregando clientes...</div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Telefone / WhatsApp</th>
                  <th className="py-3 px-4">CPF / CNPJ</th>
                  <th className="py-3 px-4 text-center">Aparelhos</th>
                  <th className="py-3 px-4 text-center">O.S.</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => viewCustomer(c.id)}
                    className="hover:bg-slate-900/40 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.phone || c.whatsapp || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {c.cpf_cnpj || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">
                        {c.devices_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                        {c.orders_count || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-blue-400">
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: View Customer Details */}
      {selectedCustDetails && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-lg">{selectedCustDetails.customer.name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedCustDetails.customer.phone} • {selectedCustDetails.customer.cpf_cnpj}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustDetails(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Devices Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Aparelhos Cadastrados ({selectedCustDetails.devices?.length || 0})
                </h4>
                <button
                  onClick={() => setShowAddDeviceModal(true)}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Aparelho</span>
                </button>
              </div>

              {selectedCustDetails.devices?.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum aparelho cadastrado para este cliente.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCustDetails.devices.map((d: any) => (
                    <div key={d.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      <div className="font-semibold text-white">{d.brand} {d.model}</div>
                      <div className="text-slate-400 mt-0.5">IMEI: {d.imei_serial || 'Não informado'}</div>
                      <div className="text-slate-500">Cor: {d.color || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Orders */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Histórico de Ordens de Serviço ({selectedCustDetails.orders?.length || 0})
              </h4>
              {selectedCustDetails.orders?.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhuma O.S. aberta para este cliente.</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustDetails.orders.map((o: any) => (
                    <div key={o.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-blue-400 font-mono">O.S. #{o.code}</span>
                        <span className="text-slate-300 ml-2">{o.device_model}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{o.status}</span>
                        <span className="font-bold font-mono text-white">R$ {o.total_amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Device */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddDevice} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Novo Aparelho para o Cliente</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Marca *</label>
              <select
                value={devBrand}
                onChange={(e) => setDevBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
                placeholder="Ex: iPhone 12 Pro"
                value={devModel}
                onChange={(e) => setDevModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">IMEI / Número de Série</label>
              <input
                type="text"
                placeholder="15 dígitos"
                value={devImei}
                onChange={(e) => setDevImei(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Cor</label>
              <input
                type="text"
                placeholder="Ex: Azul Meia-Noite"
                value={devColor}
                onChange={(e) => setDevColor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDeviceModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Aparelho
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Customer */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateCustomer} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Novo Cliente</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Telefone Principal</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@cliente.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
