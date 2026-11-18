import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Barcode,
  Search,
  Plus,
  Trash2,
  DollarSign,
  CreditCard,
  QrCode,
  Printer,
  CheckCircle,
  User,
  ShoppingBag
} from 'lucide-react';
import { api } from '../../api.ts';

interface PDVProps {
  onBack: () => void;
}

export const PDV: React.FC<PDVProps> = ({ onBack }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cardRates, setCardRates] = useState<any[]>([]);

  // Cart
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [discount, setDiscount] = useState(0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [installments, setInstallments] = useState(1);
  const [cashGiven, setCashGiven] = useState('');

  // Finished Sale for Print
  const [finishedSale, setFinishedSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const [prods, custs, rates] = await Promise.all([
        api.getProducts(),
        api.getCustomers(),
        api.getCardRates()
      ]);
      setProducts(prods);
      setCustomers(custs);
      setCardRates(rates);
    } catch (e) {
      console.error(e);
    }
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = products.find(p =>
      p.barcode === barcodeInput.trim() ||
      p.sku?.toLowerCase() === barcodeInput.trim().toLowerCase() ||
      p.name.toLowerCase().includes(barcodeInput.trim().toLowerCase())
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      alert('Produto não encontrado pelo código digitado.');
    }
  }

  function addToCart(product: any) {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
            : item
        );
      }
      return [...prev, {
        product_id: product.id,
        description: product.name,
        unit_price: product.sale_price,
        quantity: 1,
        total: product.sale_price
      }];
    });
  }

  function updateQuantity(productId: number, qty: number) {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.product_id === productId
        ? { ...item, quantity: qty, total: qty * item.unit_price }
        : item
    ));
  }

  function removeFromCart(productId: number) {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const finalTotal = Math.max(0, subtotal - discount);
  const change = Number(cashGiven) > finalTotal ? Number(cashGiven) - finalTotal : 0;

  async function handleFinalizeSale() {
    if (cart.length === 0) {
      alert('O carrinho está vazio!');
      return;
    }

    setLoading(true);
    try {
      const res = await api.createSale({
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        items: cart,
        discount: discount,
        payment_method: paymentMethod,
        installments: paymentMethod === 'Cartão de crédito' ? installments : 1
      });

      const details = await api.getSaleDetails(res.saleId);
      setFinishedSale(details);
      setCart([]);
      setSelectedCustomer(null);
      setDiscount(0);
      setCashGiven('');
    } catch (e: any) {
      alert(e.message || 'Erro ao finalizar venda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Caixa</span>
        </button>

        <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Frente de Caixa (PDV)
        </span>
      </div>

      {/* Main PDV Layout: Left (Cart & Search) - Right (Payment & Totals) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Barcode input and items list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode Search Bar */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-5 h-5 text-blue-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  autoFocus
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Bipar código de barras ou buscar por nome/SKU…"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
              >
                Adicionar
              </button>
            </form>

            {/* Quick Product Grid Chips */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 shrink-0">Mais vendidos:</span>
              {products.slice(0, 5).map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 shrink-0 transition"
                >
                  {p.name.slice(0, 20)} • R$ {p.sale_price.toFixed(2)}
                </button>
              ))}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl min-h-[350px] flex flex-col justify-between">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-900/40">
                    <th className="py-3 px-4">Item / Produto</th>
                    <th className="py-3 px-4 text-right">Unitário</th>
                    <th className="py-3 px-4 text-center">Qtd</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500">
                        <ShoppingBag className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                        <p className="font-semibold text-slate-400">O carrinho está vazio</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">Bipe ou selecione produtos para iniciar a venda.</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map(item => (
                      <tr key={item.product_id} className="hover:bg-slate-900/40">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          {item.description}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                          R$ {item.unit_price.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          R$ {item.total.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900/30">
                <span className="text-xs text-slate-400">{cart.length} item(ns) no carrinho</span>
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-red-400 hover:underline"
                >
                  Limpar Carrinho
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right (1 col): Customer, Totals & Payment */}
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-400" />
                <span>Cliente: {selectedCustomer ? selectedCustomer.name : 'Avulso (Balcão)'}</span>
              </div>
              {selectedCustomer && (
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-red-400 hover:underline text-[10px]"
                >
                  Remover
                </button>
              )}
            </div>

            {!selectedCustomer && (
              <select
                value=""
                onChange={(e) => {
                  const cust = customers.find(c => c.id === Number(e.target.value));
                  if (cust) setSelectedCustomer(cust);
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Vincular cliente existente...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                ))}
              </select>
            )}
          </div>

          {/* Payment Details Box */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider border-b border-slate-800 pb-2">
              Pagamento & Conclusão
            </h3>

            {/* Totals */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal dos Itens:</span>
                <span className="font-mono text-white">R$ {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Desconto (R$):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-right font-mono text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                <span>Total a Pagar:</span>
                <span className="font-mono text-emerald-400 text-xl">
                  R$ {finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl font-semibold border transition text-center ${
                      paymentMethod === method
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Given & Change */}
            {paymentMethod === 'Dinheiro' && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Valor Entregue (R$):</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    className="w-28 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-right font-mono text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-300">Troco:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    R$ {change.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Credit Installments */}
            {paymentMethod === 'Cartão de crédito' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parcelamento</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                    <option key={n} value={n}>
                      {n}x de R$ {(finalTotal / n).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Finalize Button */}
            <button
              onClick={handleFinalizeSale}
              disabled={loading || cart.length === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{loading ? 'Finalizando...' : 'Finalizar Venda (F10)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Finished Sale Receipt */}
      {finishedSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Venda Concluída com Sucesso!</h3>
            <p className="text-xs text-slate-400">
              Venda <span className="font-mono text-white font-bold">#{finishedSale.sale.code}</span> no valor de{' '}
              <span className="font-mono text-emerald-400 font-bold">R$ {finishedSale.sale.final_amount.toFixed(2)}</span>
            </p>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Cupom da Venda</span>
              </button>

              <button
                onClick={() => setFinishedSale(null)}
                className="w-full py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Fechar / Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
