const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function below1000(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
  }
  const h = Math.floor(n / 100);
  const rem = n % 100;
  return rem ? `${ONES[h]} hundred ${below1000(rem)}` : `${ONES[h]} hundred`;
}

export function amountInWordsEnUpper(rupiah: number): string {
  const n = Math.abs(Math.round(rupiah));
  if (n === 0) return 'ZERO RUPIAH';

  const groups: [number, string][] = [
    [1_000_000_000_000, 'trillion'],
    [1_000_000_000, 'billion'],
    [1_000_000, 'million'],
    [1_000, 'thousand'],
    [1, ''],
  ];

  const parts: string[] = [];
  let rem = n;
  for (const [div, label] of groups) {
    const q = Math.floor(rem / div);
    rem = rem % div;
    if (q > 0) {
      parts.push(label ? `${below1000(q)} ${label}` : below1000(q));
    }
  }

  return `${parts.join(' ').trim()} RUPIAH`.toUpperCase();
}
