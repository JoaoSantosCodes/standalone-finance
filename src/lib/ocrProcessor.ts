import Tesseract from 'tesseract.js';

export interface OCRResult {
  amount: string;
  description: string;
  category: string;
  success: boolean;
}

export const processReceiptOCR = async (imageFile: File | string): Promise<OCRResult> => {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageFile,
      'por', // Portuguese
      { logger: m => console.log(m) }
    );

    console.log('OCR Raw Text:', text);

    // Simple regex for currency R$ and numbers
    const amountRegex = /(?:R\$|r\$)\s*(\d+(?:[.,]\d{2})?)/i;
    const amountMatch = text.match(amountRegex);
    
    // Simple establishment name extraction (usually first line or capitalized words)
    const lines = text.split('\n').filter(l => l.trim().length > 3);
    const description = lines[0]?.trim() || 'Gasto via OCR';

    return {
      amount: amountMatch ? amountMatch[1].replace(',', '.') : '0.00',
      description,
      category: 'Mercado', // AI could improve this by looking at keywords
      success: true
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      amount: '0.00',
      description: 'Falha no processamento',
      category: 'Geral',
      success: false
    };
  }
};
