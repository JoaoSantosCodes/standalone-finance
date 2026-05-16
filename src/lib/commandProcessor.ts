import { supabase } from './supabase';

export interface CommandResponse {
  success: boolean;
  message: string;
  module: 'finance' | 'shopping' | 'kanban' | 'unknown';
  data?: any;
}

export const processVoiceCommand = async (text: string, userId: string): Promise<CommandResponse> => {
  const input = text.toLowerCase();
  
  if (input.includes('gastei') || input.includes('paguei') || input.includes('reais')) {
    const amountMatch = input.match(/\d+([.,]\d+)?/);
    const amount = amountMatch ? parseFloat(amountMatch[0].replace(',', '.')) : 0;
    
    let category = 'Outros';
    if (input.includes('mercado')) category = 'Mercado';
    if (input.includes('pizza') || input.includes('comer') || input.includes('lanche')) category = 'Lazer';
    if (input.includes('carro') || input.includes('uber') || input.includes('combustivel')) category = 'Transporte';

    const description = text.replace(/gastei|paguei|reais|no|na|com/gi, '').trim();

    const { data, error } = await supabase.from('transactions').insert([{
      user_id: userId,
      description: description || 'Despesa por Voz',
      amount: amount,
      category: category,
      type: 'expense',
      date: new Date().toISOString().split('T')[0]
    }]).select();

    if (error) return { success: false, message: 'Erro ao salvar despesa.', module: 'finance' };
    return { success: true, message: `Registrado: R$ ${amount} em ${category}`, module: 'finance', data: data[0] };
  }

  return { success: false, message: 'Não entendi o comando. Tente "Gastei X reais..."', module: 'unknown' };
};
