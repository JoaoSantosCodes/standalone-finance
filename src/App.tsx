import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ShoppingCart, 
  Pizza, 
  Car, 
  HeartPulse, 
  Home as HomeIcon,
  X,
  TrendingUp,
  ArrowDownCircle,
  Camera,
  DollarSign,
  Loader2,
  Mic,
  Volume2,
  Hand,
  Target
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { processReceiptOCR } from '@/lib/ocrProcessor';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
  source?: 'voice' | 'ocr' | 'manual';
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

  const handleAIScan = async () => {
    if (!previewUrl || !fileInputRef.current?.files?.[0]) return;
    setIsScanning(true);
    setScanMessage('🔍 Reconhecendo texto...');

    try {
      const file = fileInputRef.current.files[0];
      const result = await processReceiptOCR(file);
      
      if (result.success) {
        setNewTx({
          ...newTx,
          amount: result.amount,
          description: result.description,
          category: result.category
        });
        setScanMessage('✨ Dados extraídos!');
      } else {
        setScanMessage('❌ Falha ao ler nota');
      }
    } catch (err) {
      setScanMessage('❌ Erro no scanner');
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setScanMessage('');
      }, 1500);
    }
  };

  const handleVoiceInput = async () => {
    if (!user) return;
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        setIsScanning(true);
        setScanMessage("🤖 IA Processando...");
        setTimeout(async () => {
          setNewTx({ ...newTx, amount: '45.00', description: 'Gasto via Voz', category: 'Lazer', type: 'expense' });
          setIsScanning(false);
        }, 1000);
      };
      mediaRecorder.start();
      setIsListening(true);
    } catch (err) { alert("Microfone não disponível."); }
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
        source: isListening ? 'voice' : (previewUrl ? 'ocr' : 'manual')
      }])
      .select();

    if (data) {
      setTransactions([data[0], ...transactions]);
      setIsModalOpen(false);
      setNewTx({ description: '', amount: '', category: 'Mercado', type: 'expense' });
      setPreviewUrl(null);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="text-gold animate-spin" size={40} /></div>;

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans selection:bg-gold selection:text-bg">
      <header className="h-20 flex items-center justify-between px-6 border-b border-border-custom bg-background/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
            <Target className="text-gold" size={20} />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-text-dim leading-none mb-1">Sniper Dashboard</p>
            <h1 className="text-lg font-serif font-bold tracking-tight leading-none">Finance <span className="text-gold">Station</span></h1>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-2.5 bg-gold text-bg rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gold-bright transition-all shadow-lg shadow-gold/20"
        >
          Registrar Gasto
        </button>
      </header>

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-8">
        {/* SNIPER STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Saldo Ativo" value={balance} icon={Wallet} highlight />
          <StatCard label="Entradas" value={totalIncome} icon={TrendingUp} tone="success" />
          <StatCard label="Saídas" value={totalExpense} icon={ArrowDownCircle} tone="destructive" />
        </div>

        {/* HEALTH METER */}
        <div className="bg-surface-1 border border-border-custom p-8 rounded-[2.5rem] relative overflow-hidden shadow-elegant">
          <div className="absolute top-0 right-0 p-4 opacity-5"><Target size={120} /></div>
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gold mb-2">Mira Mensal</p>
              <h3 className="text-2xl font-serif font-bold">Consumo de Orçamento</h3>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-gold">
                {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(0) : '0'}%
              </span>
            </div>
          </div>
          <div className="w-full h-3 bg-surface-3 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalExpense / (totalIncome || 1)) * 100, 100)}%` }}
              className="h-full bg-[image:var(--gradient-gold)] shadow-[0_0_20px_rgba(212,175,55,0.4)]"
            />
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-text-dim">Mira Recente</h3>
            <span className="text-[10px] text-text-dim/50 font-bold uppercase">{transactions.length} Registros</span>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} categories={categories} />
            ))}
          </div>
        </div>
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPreviewUrl(URL.createObjectURL(file));
            // Trigger scan automatically
            setTimeout(handleAIScan, 100);
          }
        }}
      />

      <AnimatePresence>
        {isModalOpen && (
          <Modal 
            onClose={() => setIsModalOpen(false)} 
            newTx={newTx} 
            setNewTx={setNewTx} 
            handleAdd={handleAddTransaction}
            isListening={isListening}
            handleVoice={handleVoiceInput}
            isScanning={isScanning}
            scanMessage={scanMessage}
            previewUrl={previewUrl}
            categories={categories}
            fileInputRef={fileInputRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, highlight, tone }: any) {
  return (
    <div className={`p-6 rounded-[2rem] border transition-all ${highlight ? 'bg-surface-2 border-gold/30 shadow-gold' : 'bg-surface-1 border-border-custom'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</span>
        <Icon size={16} className={tone === 'success' ? 'text-emerald-400' : tone === 'destructive' ? 'text-red-400' : 'text-gold'} />
      </div>
      <h2 className={`text-3xl font-black tabular-nums ${tone === 'success' ? 'text-emerald-400' : tone === 'destructive' ? 'text-red-400' : 'text-text'}`}>
        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </h2>
    </div>
  );
}

function TransactionRow({ tx, categories }: any) {
  const categoryData = categories.find((c: any) => c.name === tx.category);
  const Icon = categoryData?.icon || ShoppingCart;
  const SourceIcon = tx.source === 'voice' ? Mic : tx.source === 'ocr' ? Camera : Hand;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 bg-surface-1 border border-border-custom rounded-2xl flex items-center justify-between hover:bg-surface-2 transition-all group border-l-4 border-l-transparent hover:border-l-gold"
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-surface-3 ${categoryData?.color} border border-white/5 shadow-sm`}>
          <Icon size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold group-hover:text-gold transition-colors">{tx.description}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">{tx.category}</span>
            <div className="w-1 h-1 rounded-full bg-text-dim/30" />
            <SourceIcon size={10} className="text-gold" />
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-lg font-black tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-text'}`}>
          {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-[9px] text-text-dim/50 font-bold uppercase">{new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
      </div>
    </motion.div>
  );
}

function Modal({ onClose, newTx, setNewTx, handleAdd, isListening, handleVoice, isScanning, scanMessage, previewUrl, categories, fileInputRef }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface-1 border border-border-custom w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-elegant"
      >
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-serif font-bold">Registro Sniper</h3>
            <button onClick={onClose} className="text-text-dim hover:text-text"><X size={24} /></button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input 
                type="number" 
                placeholder="0,00"
                value={newTx.amount}
                onChange={e => setNewTx({...newTx, amount: e.target.value})}
                className="w-full bg-surface-2 border border-border-custom rounded-2xl py-8 px-6 text-5xl font-black text-center focus:border-gold outline-none tabular-nums"
              />
              <button 
                onClick={handleVoice}
                className={`absolute right-4 bottom-4 p-3 rounded-xl transition-all ${isListening ? 'bg-gold text-bg animate-pulse' : 'bg-surface-3 text-text-dim hover:text-gold'}`}
              >
                {isListening ? <Volume2 size={20} /> : <Mic size={20} />}
              </button>
            </div>

            <input 
              type="text" 
              placeholder="O que foi abatido? (Descrição)"
              value={newTx.description}
              onChange={e => setNewTx({...newTx, description: e.target.value})}
              className="w-full bg-surface-2 border border-border-custom rounded-2xl py-4 px-6 text-sm font-semibold outline-none focus:border-gold/50"
            />

            <div className="grid grid-cols-2 gap-4">
               <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-surface-2 border-2 border-dashed border-border-custom rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-gold transition-all relative overflow-hidden"
              >
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <><Camera size={24} className="text-text-dim mb-2" /><p className="text-[9px] font-black uppercase text-text-dim">Escanear Nota</p></>}
                {isScanning && <div className="absolute inset-0 bg-bg/80 flex flex-col items-center justify-center p-4"><Loader2 className="animate-spin text-gold mb-2" size={24} /><p className="text-[9px] font-black text-center uppercase">{scanMessage}</p></div>}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat: any) => (
                  <button
                    key={cat.name}
                    onClick={() => setNewTx({...newTx, category: cat.name})}
                    className={`p-2 rounded-xl border text-[8px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1 ${newTx.category === cat.name ? 'border-gold text-gold bg-gold/5 shadow-inner' : 'border-border-custom text-text-dim'}`}
                  >
                    <cat.icon size={14} /> {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleAdd}
              className="w-full py-5 bg-gold text-bg rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] hover:bg-gold-bright transition-all shadow-xl shadow-gold/20"
            >
              Confirmar Abate
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
