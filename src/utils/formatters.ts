import { CurrencyCode } from '../types/procurement';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
};

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  PHP: 'Pesos',
  USD: 'Dollars',
  EUR: 'Euros',
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'PHP'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const symbol = CURRENCY_SYMBOLS[currency] || '₱';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  return `${symbol} ${formatted}`;
}

export function formatCompactCurrency(amount: number, currency: CurrencyCode = 'PHP'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const symbol = CURRENCY_SYMBOLS[currency] || '₱';
  if (Math.abs(safeAmount) >= 1_000_000) {
    return `${symbol}${(safeAmount / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(safeAmount) >= 1_000) {
    return `${symbol}${(safeAmount / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${safeAmount.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Number.isFinite(value) ? value : 0);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nextDocNumber(prefix: string, fiscalYear: number, existingNumbers: string[]): string {
  let maxSeq = 0;
  const pattern = new RegExp(`^${prefix}-${fiscalYear}-(\\d+)`);
  for (const docNo of existingNumbers) {
    const match = docNo.match(pattern);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${fiscalYear}-${String(maxSeq + 1).padStart(3, '0')}`;
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const SCALES = ['', 'Thousand', 'Million', 'Billion'];

function convertChunk(num: number): string {
  const parts: string[] = [];
  if (num >= 100) {
    parts.push(`${ONES[Math.floor(num / 100)]} Hundred`);
    num %= 100;
  }
  if (num >= 20) {
    const tenWord = TENS[Math.floor(num / 10)];
    const oneWord = ONES[num % 10];
    parts.push(oneWord ? `${tenWord}-${oneWord}` : tenWord);
  } else if (num > 0) {
    parts.push(ONES[num]);
  }
  return parts.join(' ');
}

export function amountToWords(amount: number, currency: CurrencyCode = 'PHP'): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return `Zero ${CURRENCY_NAMES[currency]} Only`;
  }
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);

  const chunks: string[] = [];
  let n = whole;
  let scaleIndex = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const words = convertChunk(chunk);
      const scale = SCALES[scaleIndex];
      chunks.unshift(scale ? `${words} ${scale}` : words);
    }
    n = Math.floor(n / 1000);
    scaleIndex++;
  }

  const mainWords = chunks.length > 0 ? chunks.join(' ') : 'Zero';
  const currencyLabel = CURRENCY_NAMES[currency];
  if (cents > 0) {
    return `${mainWords} ${currencyLabel} & ${String(cents).padStart(2, '0')}/100 Only`;
  }
  return `${mainWords} ${currencyLabel} Only`;
}
