/**
 * Validasi kredensial mitra dari payload JWT (USERNAME / PASSWORD).
 */
export function validateCredentials(username?: string, password?: string): boolean {
  const expectedUser = process.env.USERNAME_BMI?.trim();
  const expectedPass = process.env.PASSWORD_BMI?.trim();
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

export type ParsedVANO = {
  bin: string;
  productCode: string;
  customerId: string;
};

/**
 * Parse VANO 16 digit: BIN(4) + kode produk(2) + id pelanggan(10).
 */
export function parseVANO(vano: string): ParsedVANO | null {
  const d = String(vano ?? '').replace(/\D/g, '');
  if (d.length !== 16) return null;
  return {
    bin: d.slice(0, 4),
    productCode: d.slice(4, 6),
    customerId: d.slice(6, 16),
  };
}

/**
 * Nama pelanggan untuk channel BMI: huruf besar A–Z, boleh spasi, tanpa simbol, maks 30 karakter.
 */
export function formatCustomerName(name: string): string {
  return String(name ?? '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 30);
}
