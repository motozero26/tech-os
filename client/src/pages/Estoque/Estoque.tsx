import React, { useState, useEffect } from 'react';
import {
  Package,
  Wrench,
  Plus,
  Search,
  AlertTriangle,
  Tag,
  DollarSign,
  Layers,
  Edit2
} from 'lucide-react';
import { api } from '../../api.ts';

export const Estoque: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'categories'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterPart, setFilterPart] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Product Form
  const [prodName, setProdName] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodBrandId, setProdBrandId] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodSale, setProdSale] = useState('');
  const [prodQty, setProdQty] = useState('1');
  const [prodMinStock, setProdMinStock] = useState('2');
  const [prodIsPart, setProdIsPart] = useState(0);

  // Service Form
  const [servName, setServName] = useState('');
  const [servCatId, setServCatId] = useState('');
  const [servPrice, setServPrice] = useState('');
  const [servTime, setServTime] = useState('60');
  const [servComm, setServComm] = useState('15');

  // Category Form
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('product');

  useEffect(() => {
    loadData();
  }, [activeTab, filterPart]);

  async function loadData() {
    setLoading(true);
    try {
      const [cats, brs] = await Promise.all([
        api.getCategories(),
        api.getBrands()
      ]);
      setCategories(cats);
      setBrands(brs);

      if (activeTab === 'products') {
        const params: any = { q: search };
        if (filterPart === 'parts') params.is_part = 1;
        if (filterPart === 'products') params.is_part = 0;
        if (filterPart === 'low_stock') params.low_stock = 1;
        const prods = await api.getProducts(params);
        setProducts(prods);
      } else if (activeTab === 'services') {
        const servs = await api.getServices();
        setServices(servs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!prodName || !prodSale) return;
    try {
      await api.createProduct({
        name: prodName,
        barcode: prodBarcode || null,
        sku: prodSku || null,
        category_id: Number(prodCatId) || null,
        brand_id: Number(prodBrandId) || null,
        cost_price: Number(prodCost) || 0,
        sale_price: Number(prodSale) || 0,
        stock_quantity: Number(prodQty) || 0,
        min_stock: Number(prodMinStock) || 2,
        is_part: prodIsPart
      });
      setShowProductModal(false);
      resetProductForm();
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar produto');
    }
  }

  function resetProductForm() {
    setProdName('');
    setProdBarcode('');
    setProdSku('');
    setProdCatId('');
    setProdBrandId('');
    setProdCost('');
    setProdSale('');
    setProdQty('1');
    setProdMinStock('2');
    setProdIsPart(0);
  }

  async function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!servName || !servPrice) return;
    try {
      await api.createService({
        name: servName,
        category_id: Number(servCatId) || null,
        default_price: Number(servPrice),
        estimated_time_minutes: Number(servTime) || 60,
        default_commission_percent: Number(servComm) || 10
      });
      setShowServiceModal(false);
      setServName('');
      setServPrice('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar serviço');
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName) return;
    try {
      await api.createCategory({ name: catName, type: catType });
      setShowCategoryModal(false);
      setCatName('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Erro ao cadastrar categoria');
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Estoque & Catálogos</h2>
          <p className="text-xs text-slate-400">
            Peças para O.S., produtos de balcão e catálogo de serviços técnicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'products' && (
            <button
              onClick={() => setShowProductModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto / Peça</span>
            </button>
          )}

          {activeTab === 'services' && (
            <button
              onClick={() => setShowServiceModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          )}

          {activeTab === 'categories' && (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Categoria</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'products'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Produtos & Peças</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'services'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Catálogo de Serviços</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categorias & Marcas</span>
        </button>
      </div>

      {/* Products Tab Content */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Subfilters */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs">
              {[
                { id: 'all', label: 'Todos os Itens' },
                { id: 'parts', label: 'Peças para O.S.' },
                { id: 'products', label: 'Produtos de Venda' },
                { id: 'low_stock', label: 'Estoque Baixo' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterPart(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                    filterPart === f.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, SKU, código…"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-12 text-center text-slate-400">Carregando itens...</div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                Nenhum produto cadastrado com os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Categoria / Marca</th>
                      <th className="py-3 px-4 text-right">Custo</th>
                      <th className="py-3 px-4 text-right">Venda</th>
                      <th className="py-3 px-4 text-center">Estoque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase ${
                            p.is_part
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {p.is_part ? 'Peça O.S.' : 'Venda'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.barcode ? `EAN: ${p.barcode}` : (p.sku ? `SKU: ${p.sku}` : '')}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {p.category_name || '-'} • {p.brand_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          R$ {p.cost_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          R$ {p.sale_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            p.stock_quantity <= p.min_stock
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'text-slate-200'
                          }`}>
                            {p.stock_quantity} un
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Services Tab Content */}
      {activeTab === 'services' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                  <th className="py-3 px-4">Serviço</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Tempo Est.</th>
                  <th className="py-3 px-4 text-right">Preço Padrão</th>
                  <th className="py-3 px-4 text-center">Comissão Técnico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {services.map(s => (
                  <tr key={s.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-semibold text-white">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {s.category_name || 'Geral'}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-400">
                      {s.estimated_time_minutes} min
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      R$ {s.default_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400">
                      {s.default_commission_percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories & Brands Tab Content */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white text-base">Categorias</h3>
            <div className="divide-y divide-slate-800">
              {categories.map(c => (
                <div key={c.id} className="py-2.5 flex justify-between text-xs">
                  <span className="text-slate-200 font-medium">{c.name}</span>
                  <span className="text-slate-500 uppercase text-[10px]">{c.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="font-bold text-white text-base">Marcas & Fabricantes</h3>
            <div className="divide-y divide-slate-800">
              {brands.map(b => (
                <div key={b.id} className="py-2.5 text-xs text-slate-200 font-medium">
                  {b.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Product */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateProduct} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Cadastrar Produto ou Peça</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Item *</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Ex: Tela iPhone 13 OLED, Carregador 25W"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Destinação do Item</label>
                  <select
                    value={prodIsPart}
                    onChange={(e) => setProdIsPart(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>Produto de Venda (Balcão)</option>
                    <option value={1}>Peça de Reposição (O.S.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoria</label>
                  <select
                    value={prodCatId}
                    onChange={(e) => setProdCatId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Código de Barras (EAN)</label>
                  <input
                    type="text"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    placeholder="789..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Marca / Fabricante</label>
                  <select
                    value={prodBrandId}
                    onChange={(e) => setProdBrandId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prodCost}
                    onChange={(e) => setProdCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={prodSale}
                    onChange={(e) => setProdSale(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    value={prodQty}
                    onChange={(e) => setProdQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Estoque Mínimo (Alerta)</label>
                  <input
                    type="number"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Service */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateService} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-white text-base">Novo Serviço no Catálogo</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome do Serviço *</label>
              <input
                type="text"
                required
                value={servName}
                onChange={(e) => setServName(e.target.value)}
                placeholder="Ex: Troca de conector, Formatação"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Preço Padrão (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={servPrice}
                  onChange={(e) => setServPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Comissão Técnico (%)</label>
                <input
                  type="number"
                  value={servComm}
                  onChange={(e) => setServComm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                Salvar Serviço
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
