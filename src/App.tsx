import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Plus, 
  ShoppingCart, 
  Pizza, 
  Car, 
  HeartPulse, 
  Home as HomeIcon,
  X,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  MoreHorizontal,
  Receipt,
  Camera,
  Image as ImageIcon,
  DollarSign,
  Eye,
  Sparkles,
  Loader2,
  Mic,
  Volume2,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { processVoiceCommand } from '@/lib/commandProcessor';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
  receipt_url?: string;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({ 
    description: '', 
    amount: '', 
    category: 'Mercado', 
    type: 'expense' as 'income' | 'expense' 
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [aiScanHistory, setAiScanHistory] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const categories = [
    { name: 'Mercado', icon: ShoppingCart, color: 'text-blue-400' },
    { name: 'Lazer', icon: Pizza, color: 'text-gold' },
    { name: 'Saúde', icon: HeartPulse, color: 'text-red-400' },
    { name: 'Casa', icon: HomeIcon, color: 'text-green-400' },
    { name: 'Transporte', icon: Car, color: 'text-purple-400' },
    { name: 'Salário', icon: DollarSign, color: 'text-emerald-400' },
  ];

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchTransactions(session.user.id);
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const fetchTransactions = async (userId: string) => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (data) setTransactions(data);
    setIsLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAIScan = async () => {
    if (!previewUrl) return;
    setIsScanning(true);
    
    const steps = [
      '🔍 Analisando imagem...',
      '🏬 Identificando estabelecimento...',
      '💸 Extraindo valores...',
      '✨ Otimizando categoria...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setScanMessage(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const scanResult = {
      id: Date.now().toString(),
      amount: '342.90',
      description: 'Supermercado Central',
      category: 'Mercado',
      date: new Date().toLocaleDateString()
    };

    setNewTx({
      ...newTx,
      amount: scanResult.amount,
      description: scanResult.description,
      category: scanResult.category
    });

    setAiScanHistory(prev => [scanResult, ...prev]);
    setIsScanning(false);
    setScanMessage('');
  };

  const handleVoiceInput = async () => {
    if (!user) {
      alert("Por favor, faça login para usar o comando de voz.");
      return;
    }

    if (isListening) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsListening(false);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsScanning(true);
        setScanMessage("🤖 IA Processando áudio...");

        setTimeout(async () => {
          const simulatedCommand = "Gastei 45 reais com Lazer";
          const result = await processVoiceCommand(simulatedCommand, user.id);
          
          if (result.success) {
            setNewTx({
              ...newTx,
              amount: '45.00',
              description: 'Gasto via Voz',
              category: 'Lazer',
              type: 'expense'
            });
          }
          setIsScanning(false);
          setScanMessage('');
          stream.getTracks().forEach(track => track.stop());
        }, 1500);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      alert("Microfone não disponível.");
    }
  };

  const handleAddTransaction = async () => {
    if (!newTx.description || !newTx.amount || !user) return;
    
    const { data } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        description: newTx.description,
        amount: parseFloat(newTx.amount),
        category: newTx.category,
        date: new Date().toISOString().split('T')[0],
        type: newTx.type,
        receipt_url: previewUrl || null
      }])
      .select();

    if (data) {
      setTransactions([data[0], ...transactions]);
      setIsModalOpen(false);
      setNewTx({ description: '', amount: '', category: 'Mercado', type: 'expense' });
      setPreviewUrl(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="text-gold animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <header className="h-20 flex items-center justify-between px-6 border-b border-border-custom bg-background/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <Wallet className="text-gold" size={20} />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight">Finance <span className="text-gold">POC</span></h1>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-gold text-bg rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gold-bright transition-all shadow-lg shadow-gold/20"
        >
          <Plus size={18} /> Novo Registro
        </button>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
        {/* DASHBOARD CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-1 border border-border-custom p-6 rounded-3xl relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Entradas</p>
            <h2 className="text-3xl font-black">R$ {totalIncome.toLocaleString('pt-BR')}</h2>
            <ArrowUpCircle className="absolute top-4 right-4 text-emerald-400 opacity-10" size={48} />
          </div>

          <div className="bg-surface-1 border border-border-custom p-6 rounded-3xl relative overflow-hidden">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1">Saídas</p>
            <h2 className="text-3xl font-black">R$ {totalExpense.toLocaleString('pt-BR')}</h2>
            <ArrowDownCircle className="absolute top-4 right-4 text-red-400 opacity-10" size={48} />
          </div>

          <div className={`bg-surface-1 border p-6 rounded-3xl relative overflow-hidden ${balance >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-1">Saldo</p>
            <h2 className={`text-3xl font-black ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {balance.toLocaleString('pt-BR')}</h2>
            <TrendingUp className="absolute top-4 right-4 text-gold opacity-10" size={48} />
          </div>
        </div>

        {/* ANALYSIS WIDGET */}
        <div className="bg-surface-2 border border-border-custom p-8 rounded-[2.5rem] relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold">Saúde Financeira</h3>
              <p className="text-xs text-text-dim">Consumo do orçamento mensal</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-gold">
                {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : '0'}%
              </span>
            </div>
          </div>
          
          <div className="w-full h-4 bg-surface-3 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalExpense / (totalIncome || 1)) * 100, 100)}%` }}
              className="h-full bg-gradient-to-r from-gold-dim to-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            />
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-surface-1 border border-border-custom rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-border-custom bg-surface-2/30">
            <h3 className="text-lg font-serif font-bold flex items-center gap-3">
              <Receipt className="text-gold" size={20} /> Histórico
            </h3>
          </div>
          
          <div className="divide-y divide-border-custom">
            {transactions.map((tx) => {
              const categoryData = categories.find(c => c.name === tx.category);
              const Icon = categoryData?.icon || ShoppingCart;
              
              return (
                <div key={tx.id} className="p-5 flex items-center justify-between hover:bg-surface-2/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-surface-3 ${categoryData?.color} border border-white/5`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold group-hover:text-gold transition-colors">{tx.description}</h4>
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-widest">{tx.category} • {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`text-lg font-black ${tx.type === 'income' ? 'text-emerald-400' : 'text-text'}`}>
                    {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface-1 border border-border-custom w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-serif font-bold">Novo Registro</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text"><X size={24} /></button>
                </div>

                <div className="flex p-1 bg-surface-2 rounded-2xl border border-border-custom">
                  <button 
                    onClick={() => setNewTx({...newTx, type: 'expense'})}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newTx.type === 'expense' ? 'bg-red-500 text-white' : 'text-text-dim'}`}
                  >
                    Despesa
                  </button>
                  <button 
                    onClick={() => setNewTx({...newTx, type: 'income'})}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${newTx.type === 'income' ? 'bg-emerald-500 text-white' : 'text-text-dim'}`}
                  >
                    Receita
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black opacity-50">R$</span>
                    <input 
                      type="number" 
                      placeholder="0,00"
                      value={newTx.amount}
                      onChange={e => setNewTx({...newTx, amount: e.target.value})}
                      className="w-full bg-surface-2 border border-border-custom rounded-2xl py-6 pl-16 pr-6 text-4xl font-black focus:border-gold outline-none"
                    />
                    <button 
                      onClick={handleVoiceInput}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-4 rounded-2xl transition-all ${isListening ? 'bg-gold text-bg' : 'bg-surface-3 text-text-dim'}`}
                    >
                      {isListening ? <Volume2 size={24} /> : <Mic size={24} />}
                    </button>
                  </div>

                  <input 
                    type="text" 
                    placeholder="Descrição..."
                    value={newTx.description}
                    onChange={e => setNewTx({...newTx, description: e.target.value})}
                    className="w-full bg-surface-2 border border-border-custom rounded-2xl py-4 px-6 text-sm font-semibold outline-none"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video bg-surface-2 border-2 border-dashed border-border-custom rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-all relative overflow-hidden"
                    >
                      {previewUrl ? (
                        <img src={previewUrl} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera size={24} className="text-text-dim mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Anexar Nota</p>
                        </>
                      )}
                      {isScanning && (
                        <div className="absolute inset-0 bg-bg/80 flex flex-col items-center justify-center p-4">
                          <Loader2 className="animate-spin text-gold mb-2" size={24} />
                          <p className="text-[10px] font-bold text-center">{scanMessage}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat.name}
                          onClick={() => setNewTx({...newTx, category: cat.name})}
                          className={`p-2 rounded-xl border text-[9px] font-bold uppercase transition-all flex flex-col items-center gap-1 ${newTx.category === cat.name ? 'border-gold text-gold bg-gold/5' : 'border-border-custom text-text-dim'}`}
                        >
                          <cat.icon size={14} /> {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {previewUrl && !isScanning && (
                    <button 
                      onClick={handleAIScan}
                      className="w-full py-4 bg-surface-2 border border-gold/30 text-gold rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-gold/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles size={16} /> Analisar com IA
                    </button>
                  )}

                  <button 
                    onClick={handleAddTransaction}
                    className="w-full py-5 bg-gold text-bg rounded-2xl font-bold hover:bg-gold-bright transition-all shadow-xl shadow-gold/20"
                  >
                    Confirmar Registro
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
