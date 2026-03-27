import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Utensils, Coffee, Pizza, RefreshCcw, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { saveOrderToSupabase, updateOrderStatusInSupabase, fetchOrdersFromSupabase } from './services/orderService';

type ItemType = 'marmita' | 'salgado' | 'bebida';

interface CartItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  price: number;
  quantity: number;
}

type OrderStatus = 'PENDENTE' | 'ENTREGUE';

interface Order {
  id: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  status: OrderStatus;
  createdAt: Date;
}

type ViewState = 'HOME' | 'MARMITA' | 'SALGADO' | 'BEBIDA' | 'CHECKOUT' | 'ORDERS';

const MARMITA_SIZES = [
  { id: '300g', label: '300g', price: 25.90 },
  { id: '400g', label: '400g', price: 29.90 },
  { id: '500g', label: '500g', price: 35.90 },
];

const MARMITA_BASES = [
  { id: 'arroz', label: 'Arroz branco' },
  { id: 'quinoa', label: 'Quinoa' },
];

const MARMITA_PROTEINS = [
  { id: 'frango', label: 'Frango cremoso' },
  { id: 'carne', label: 'Carne moída' },
  { id: 'porco', label: 'Porco ao curry' },
];

const SALGADOS = [
  { id: 'bolinho', label: 'Bolinho de carne proteico', price: 15.90 },
  { id: 'tortinha', label: 'Tortinha de frango proteica', price: 10.00 },
];

const BEBIDAS = [
  { id: 'agua', label: 'Água', price: 5.00 },
  { id: 'agua_gas', label: 'Água com gás', price: 6.00 },
  { id: 'coca_cola', label: 'Coca Cola', price: 8.00 },
  { id: 'coca_zero', label: 'Coca Cola Zero', price: 8.00 },
  { id: 'guarana', label: 'Guaraná', price: 8.00 },
  { id: 'isotonico', label: 'Isotônico', price: 12.00 },
];

export default function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [customerName, setCustomerName] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [orders, setOrders] = useState<Order[]>([]);

  // Marmita State
  const [mSize, setMSize] = useState<string | null>(null);
  const [mBase, setMBase] = useState<string | null>(null);
  const [mProtein, setMProtein] = useState<string | null>(null);

  // Salgado State
  const [salgadoCounts, setSalgadoCounts] = useState<Record<string, number>>({});

  // Bebida State
  const [bebidaCounts, setBebidaCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadOrders = async () => {
      const fetchedOrders = await fetchOrdersFromSupabase();
      setOrders(fetchedOrders);
    };
    
    // Carrega os pedidos inicialmente
    loadOrders();

    // Configura a atualização automática a cada 10 segundos
    const intervalId = setInterval(loadOrders, 10000);

    // Limpa o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, []);

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const discountAmount = useMemo(() => subtotal * (discountPercent / 100), [subtotal, discountPercent]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const resetMarmita = () => {
    setMSize(null);
    setMBase(null);
    setMProtein(null);
  };

  const resetSalgados = () => setSalgadoCounts({});
  const resetBebidas = () => setBebidaCounts({});

  const handleAddMarmita = () => {
    if (!mSize || !mBase || !mProtein) return;
    
    const sizeObj = MARMITA_SIZES.find(s => s.id === mSize)!;
    const baseObj = MARMITA_BASES.find(b => b.id === mBase)!;
    const proteinObj = MARMITA_PROTEINS.find(p => p.id === mProtein)!;

    const newItem: CartItem = {
      id: Date.now().toString(),
      type: 'marmita',
      name: `Marmita ${sizeObj.label}`,
      description: `${baseObj.label} + ${proteinObj.label}`,
      price: sizeObj.price,
      quantity: 1,
    };

    setCart([...cart, newItem]);
    resetMarmita();
    setView('HOME');
  };

  const handleAddSalgados = () => {
    const newItems: CartItem[] = [];
    Object.entries(salgadoCounts).forEach(([id, count]: [string, number]) => {
      if (count > 0) {
        const item = SALGADOS.find(s => s.id === id)!;
        newItems.push({
          id: Date.now().toString() + id,
          type: 'salgado',
          name: item.label,
          description: '',
          price: item.price,
          quantity: count,
        });
      }
    });

    if (newItems.length > 0) {
      setCart([...cart, ...newItems]);
    }
    resetSalgados();
    setView('HOME');
  };

  const handleAddBebidas = () => {
    const newItems: CartItem[] = [];
    Object.entries(bebidaCounts).forEach(([id, count]: [string, number]) => {
      if (count > 0) {
        const item = BEBIDAS.find(s => s.id === id)!;
        newItems.push({
          id: Date.now().toString() + id,
          type: 'bebida',
          name: item.label,
          description: '',
          price: item.price,
          quantity: count,
        });
      }
    });

    if (newItems.length > 0) {
      setCart([...cart, ...newItems]);
    }
    resetBebidas();
    setView('HOME');
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const resetOrder = () => {
    setCustomerName('');
    setCart([]);
    setDiscountPercent(0);
    setView('HOME');
    resetMarmita();
    resetSalgados();
    resetBebidas();
  };

  const handleFinishOrder = async () => {
    const newOrder: Order = {
      id: Date.now().toString(),
      customerName: customerName || 'Sem Nome',
      items: [...cart],
      subtotal,
      discountPercent,
      discountAmount,
      total,
      status: 'PENDENTE',
      createdAt: new Date(),
    };
    setOrders([newOrder, ...orders]);
    
    // Save to Supabase
    await saveOrderToSupabase(newOrder);

    resetOrder();
  };

  const toggleOrderStatus = async (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    
    const newStatus = order.status === 'PENDENTE' ? 'ENTREGUE' : 'PENDENTE';
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    
    // Update in Supabase
    await updateOrderStatusInSupabase(id, newStatus);
  };

  const formatPrice = (value: number) => `R$ ${(value || 0).toFixed(2).replace('.', ',')}`;

  return (
    <div className="min-h-screen bg-emerald-950 text-emerald-50 font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* LEFT PANEL: CART */}
      <div className="w-full md:w-80 lg:w-96 bg-emerald-900 border-r border-emerald-800 flex flex-col h-screen">
        <div className="p-4 border-b border-emerald-800">
          <h1 className="text-xl font-bold mb-3 flex items-center gap-2 text-emerald-100">
            <ShoppingCart className="w-5 h-5" />
            Pedido Atual
          </h1>
          <input 
            type="text" 
            placeholder="Nome do Cliente" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-emerald-950 border border-emerald-700 rounded-lg p-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-emerald-700"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center text-emerald-700 mt-6 font-medium text-sm">
              Nenhum item adicionado
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-emerald-800/50 rounded-lg p-3 flex justify-between items-start border border-emerald-800/50">
                <div className="flex-1">
                  <div className="font-bold text-base leading-tight">{item.quantity}x {item.name}</div>
                  {item.description && <div className="text-xs text-emerald-300/80 mt-1 leading-tight">{item.description}</div>}
                  <div className="text-emerald-400 font-medium mt-1 text-sm">{formatPrice(item.price * item.quantity)}</div>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-emerald-950/50 border-t border-emerald-800">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium text-emerald-200">Total</span>
            <span className="text-2xl font-bold text-white">{formatPrice(total)}</span>
          </div>
          <button 
            onClick={() => setView('CHECKOUT')}
            disabled={cart.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-emerald-950 font-bold text-lg py-3 rounded-lg transition-colors shadow-md disabled:shadow-none"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: ACTIONS */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <div className="p-4 flex justify-between items-center border-b border-emerald-900/50">
          {view !== 'HOME' ? (
            <button 
              onClick={() => setView('HOME')}
              className="flex items-center gap-2 text-emerald-300 hover:text-white font-medium px-3 py-1.5 rounded-md hover:bg-emerald-800/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Voltar
            </button>
          ) : (
            <div className="text-emerald-400 font-bold text-lg tracking-wider">ATELIÊ FIT EVENTOS</div>
          )}
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setView('ORDERS')}
              className={`flex items-center gap-2 font-medium px-3 py-1.5 rounded-md transition-colors ${view === 'ORDERS' ? 'bg-emerald-800 text-white' : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-800/50'}`}
            >
              <ClipboardList className="w-4 h-4" /> 
              <span className="hidden sm:inline">Pedidos ({orders.filter(o => o.status === 'PENDENTE').length})</span>
            </button>
            <button 
              onClick={resetOrder}
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-200 font-medium px-3 py-1.5 rounded-md hover:bg-emerald-800/50 transition-colors"
            >
              <RefreshCcw className="w-4 h-4" /> <span className="hidden sm:inline">Novo Pedido</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-6 max-w-4xl mx-auto w-full">
          
          {/* HOME VIEW */}
          {view === 'HOME' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full content-center">
              <button 
                onClick={() => setView('MARMITA')}
                className="bg-emerald-800 hover:bg-emerald-700 border-2 border-emerald-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="bg-emerald-900 p-4 rounded-full">
                  <Utensils className="w-12 h-12 text-emerald-300" />
                </div>
                <span className="text-xl font-bold">Marmita</span>
              </button>
              
              <button 
                onClick={() => setView('SALGADO')}
                className="bg-emerald-800 hover:bg-emerald-700 border-2 border-emerald-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="bg-emerald-900 p-4 rounded-full">
                  <Pizza className="w-12 h-12 text-emerald-300" />
                </div>
                <span className="text-xl font-bold">Salgado</span>
              </button>

              <button 
                onClick={() => setView('BEBIDA')}
                className="bg-emerald-800 hover:bg-emerald-700 border-2 border-emerald-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 transition-all transform hover:scale-105 shadow-lg"
              >
                <div className="bg-emerald-900 p-4 rounded-full">
                  <Coffee className="w-12 h-12 text-emerald-300" />
                </div>
                <span className="text-xl font-bold">Bebida</span>
              </button>
            </div>
          )}

          {/* MARMITA VIEW */}
          {view === 'MARMITA' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-4">Montar Marmita</h2>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-emerald-300 uppercase tracking-wider">1. Tamanho</h3>
                <div className="grid grid-cols-3 gap-3">
                  {MARMITA_SIZES.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setMSize(s.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${mSize === s.id ? 'bg-emerald-500 border-emerald-400 text-emerald-950 shadow-md scale-105' : 'bg-emerald-900 border-emerald-800 text-emerald-100 hover:border-emerald-600'}`}
                    >
                      <div className="text-lg font-bold">{s.label}</div>
                      <div className={`mt-1 text-sm font-medium ${mSize === s.id ? 'text-emerald-900' : 'text-emerald-400'}`}>{formatPrice(s.price)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-emerald-300 uppercase tracking-wider">2. Base</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MARMITA_BASES.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setMBase(b.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${mBase === b.id ? 'bg-emerald-500 border-emerald-400 text-emerald-950 shadow-md scale-105' : 'bg-emerald-900 border-emerald-800 text-emerald-100 hover:border-emerald-600'}`}
                    >
                      <div className="text-lg font-bold">{b.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-emerald-300 uppercase tracking-wider">3. Proteína</h3>
                <div className="grid grid-cols-3 gap-3">
                  {MARMITA_PROTEINS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setMProtein(p.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${mProtein === p.id ? 'bg-emerald-500 border-emerald-400 text-emerald-950 shadow-md scale-105' : 'bg-emerald-900 border-emerald-800 text-emerald-100 hover:border-emerald-600'}`}
                    >
                      <div className="text-base font-bold leading-tight">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleAddMarmita}
                  disabled={!mSize || !mBase || !mProtein}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-700 text-emerald-950 font-bold text-xl py-4 rounded-xl transition-all shadow-lg disabled:shadow-none"
                >
                  Adicionar Marmita ao Pedido
                </button>
              </div>
            </div>
          )}

          {/* SALGADO VIEW */}
          {view === 'SALGADO' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-4">Adicionar Salgados</h2>
              
              <div className="space-y-3">
                {SALGADOS.map(s => {
                  const count = salgadoCounts[s.id] || 0;
                  return (
                    <div key={s.id} className="bg-emerald-900 border border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-white">{s.label}</div>
                        <div className="text-emerald-400 font-medium text-sm mt-1">{formatPrice(s.price)}</div>
                      </div>
                      <div className="flex items-center gap-4 bg-emerald-950 p-1.5 rounded-lg">
                        <button 
                          onClick={() => setSalgadoCounts({...salgadoCounts, [s.id]: Math.max(0, count - 1)})}
                          className="w-10 h-10 rounded-md bg-emerald-800 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors"
                        >
                          <Minus className="w-6 h-6" />
                        </button>
                        <span className="text-xl font-bold w-8 text-center">{count}</span>
                        <button 
                          onClick={() => setSalgadoCounts({...salgadoCounts, [s.id]: count + 1})}
                          className="w-10 h-10 rounded-md bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition-colors"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  onClick={handleAddSalgados}
                  disabled={Object.values(salgadoCounts).every(c => c === 0)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-700 text-emerald-950 font-bold text-xl py-4 rounded-xl transition-all shadow-lg disabled:shadow-none"
                >
                  Adicionar ao Pedido
                </button>
              </div>
            </div>
          )}

          {/* BEBIDA VIEW */}
          {view === 'BEBIDA' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-4">Adicionar Bebidas</h2>
              
              <div className="space-y-3">
                {BEBIDAS.map(b => {
                  const count = bebidaCounts[b.id] || 0;
                  return (
                    <div key={b.id} className="bg-emerald-900 border border-emerald-800 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-white">{b.label}</div>
                        <div className="text-emerald-400 font-medium text-sm mt-1">{formatPrice(b.price)}</div>
                      </div>
                      <div className="flex items-center gap-4 bg-emerald-950 p-1.5 rounded-lg">
                        <button 
                          onClick={() => setBebidaCounts({...bebidaCounts, [b.id]: Math.max(0, count - 1)})}
                          className="w-10 h-10 rounded-md bg-emerald-800 hover:bg-emerald-700 flex items-center justify-center text-white transition-colors"
                        >
                          <Minus className="w-6 h-6" />
                        </button>
                        <span className="text-xl font-bold w-8 text-center">{count}</span>
                        <button 
                          onClick={() => setBebidaCounts({...bebidaCounts, [b.id]: count + 1})}
                          className="w-10 h-10 rounded-md bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center text-white transition-colors"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4">
                <button
                  onClick={handleAddBebidas}
                  disabled={Object.values(bebidaCounts).every(c => c === 0)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-700 text-emerald-950 font-bold text-xl py-4 rounded-xl transition-all shadow-lg disabled:shadow-none"
                >
                  Adicionar ao Pedido
                </button>
              </div>
            </div>
          )}

          {/* CHECKOUT VIEW */}
          {view === 'CHECKOUT' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-xl mx-auto">
              <div className="bg-emerald-900 rounded-2xl p-6 border border-emerald-800 shadow-xl">
                <h2 className="text-2xl font-bold text-white mb-4 text-center">Resumo do Pedido</h2>
                
                {customerName && (
                  <div className="mb-4 pb-4 border-b border-emerald-800">
                    <div className="text-emerald-400 font-medium uppercase tracking-wider text-xs mb-1">Cliente</div>
                    <div className="text-xl font-bold text-white">{customerName}</div>
                  </div>
                )}

                <div className="space-y-3 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-bold text-base text-emerald-50">{item.quantity}x {item.name}</div>
                        {item.description && <div className="text-emerald-300/80 text-xs mt-0.5">{item.description}</div>}
                      </div>
                      <div className="font-medium text-emerald-200 ml-3 text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-emerald-800 space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300">Subtotal</span>
                    <span className="text-emerald-100 font-medium">{formatPrice(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-300">Desconto (%)</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={discountPercent || ''}
                        onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-20 bg-emerald-950 border border-emerald-700 rounded-md p-1.5 text-right text-emerald-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0"
                      />
                      <span className="text-emerald-400 font-medium w-20 text-right">
                        - {formatPrice(discountAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-emerald-800/50">
                    <span className="text-lg font-medium text-emerald-200">Total a Pagar</span>
                    <span className="text-3xl font-bold text-emerald-400">{formatPrice(total)}</span>
                  </div>
                </div>

                <button
                  onClick={handleFinishOrder}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xl py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Finalizar Pedido
                </button>
              </div>
            </div>
          )}

          {/* ORDERS VIEW */}
          {view === 'ORDERS' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Controle de Pedidos</h2>
                <div className="flex gap-4 text-sm font-medium">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-4 h-4" /> {orders.filter(o => o.status === 'PENDENTE').length} Pendentes
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> {orders.filter(o => o.status === 'ENTREGUE').length} Entregues
                  </div>
                </div>
              </div>
              
              {orders.length === 0 ? (
                <div className="text-center text-emerald-600 mt-12 font-medium text-lg">
                  Nenhum pedido realizado ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map(order => (
                    <div 
                      key={order.id} 
                      className={`bg-emerald-900 border-l-4 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${
                        order.status === 'ENTREGUE' 
                          ? 'border-emerald-500 opacity-60' 
                          : 'border-amber-500 shadow-md'
                      }`}
                    >
                      <div className="flex-1 flex flex-col sm:flex-row gap-4 w-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-lg text-white">#{order.id.slice(-4)}</span>
                            <span className="text-emerald-200 font-medium text-lg">{order.customerName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              order.status === 'PENDENTE' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="text-xs text-emerald-400 mb-2">
                            {new Date(order.createdAt).toLocaleTimeString()} • {(order.items || []).reduce((acc, i) => acc + i.quantity, 0)} itens • {formatPrice(order.total)}
                          </div>
                          
                          {(order.items || []).filter(item => item.type === 'marmita').length > 0 && (
                            <div className="mt-3 space-y-2 w-full">
                              {(order.items || []).filter(item => item.type === 'marmita').map((item, idx) => (
                                <div 
                                  key={`marmita-${idx}`} 
                                  className="p-3 rounded-lg bg-emerald-500/20 border-2 border-emerald-400 shadow-sm"
                                >
                                  <div className="font-bold text-emerald-200 text-lg">
                                    {item.quantity}x {item.name}
                                  </div>
                                  {item.description && (
                                    <div className="mt-1 text-white font-bold text-base bg-emerald-900/50 p-2 rounded-md inline-block">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {(order.items || []).filter(item => item.type !== 'marmita').length > 0 && (
                          <div className="sm:w-1/3 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-emerald-800/50 pt-3 sm:pt-0 sm:pl-4">
                            <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Outros Itens</div>
                            <ul className="space-y-1.5">
                              {(order.items || []).filter(item => item.type !== 'marmita').map((i, idx) => (
                                <li key={idx} className="text-sm text-emerald-100/90 flex items-start gap-2 leading-tight">
                                  <span className="font-bold text-emerald-300">{i.quantity}x</span> {i.name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                        <button
                          onClick={() => toggleOrderStatus(order.id)}
                          className={`px-4 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                            order.status === 'PENDENTE' 
                              ? 'bg-amber-500 hover:bg-amber-400 text-amber-950' 
                              : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-200'
                          }`}
                        >
                          {order.status === 'PENDENTE' ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" /> Marcar Entregue
                            </>
                          ) : (
                            <>
                              <Clock className="w-5 h-5" /> Desfazer
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
