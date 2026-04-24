import { describe, it, expect } from 'vitest';
import { currentStock, fmtDate, fmtMoney } from './utils';

// ── currentStock ──────────────────────────────────────────────

const ITEM = { id: 'c1', assetId: 'a1', name: 'Savon Omo 200g', initialStock: 100 };

describe('currentStock', () => {
  it('returns initialStock when no sales exist', () => {
    expect(currentStock(ITEM, [])).toBe(100);
  });

  it('subtracts sold quantities from initialStock', () => {
    const sales = [
      { assetId: 'a1', items: [{ itemId: 'c1', quantity: 10 }, { itemId: 'c2', quantity: 5 }] },
      { assetId: 'a1', items: [{ itemId: 'c1', quantity: 4 }] },
    ];
    expect(currentStock(ITEM, sales)).toBe(86); // 100 - 10 - 4
  });

  it('ignores sales for a different asset', () => {
    const sales = [{ assetId: 'a2', items: [{ itemId: 'c1', quantity: 50 }] }];
    expect(currentStock(ITEM, sales)).toBe(100);
  });

  it('ignores sales for a different item', () => {
    const sales = [{ assetId: 'a1', items: [{ itemId: 'c99', quantity: 50 }] }];
    expect(currentStock(ITEM, sales)).toBe(100);
  });

  it('handles sales with missing items array', () => {
    const sales = [{ assetId: 'a1' }];
    expect(currentStock(ITEM, sales)).toBe(100);
  });

  it('handles negative stock (over-sold)', () => {
    const sales = [{ assetId: 'a1', items: [{ itemId: 'c1', quantity: 150 }] }];
    expect(currentStock(ITEM, sales)).toBe(-50);
  });

  it('handles sales with missing quantity field gracefully', () => {
    const sales = [{ assetId: 'a1', items: [{ itemId: 'c1' }] }];
    expect(currentStock(ITEM, sales)).toBe(100);
  });
});

// ── fmtDate ───────────────────────────────────────────────────

describe('fmtDate', () => {
  it('returns em dash for null/undefined/empty', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate(undefined)).toBe('—');
    expect(fmtDate('')).toBe('—');
  });

  it('formats a valid ISO date string', () => {
    const result = fmtDate('2026-04-24');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
    expect(result).toContain('2026');
  });

  it('returns the raw string if the date is unparseable', () => {
    expect(fmtDate('not-a-date')).toBe('Invalid Date');
  });
});

// ── fmtMoney ──────────────────────────────────────────────────

describe('fmtMoney', () => {
  it('returns em dash for null', () => {
    expect(fmtMoney(null)).toBe('—');
    expect(fmtMoney(undefined)).toBe('—');
  });

  it('formats zero correctly', () => {
    expect(fmtMoney(0, 'CDF')).toBe('0 CDF');
  });

  it('defaults to CDF when no currency given', () => {
    expect(fmtMoney(1500)).toContain('CDF');
  });

  it('appends the given currency', () => {
    expect(fmtMoney(100, 'USD')).toContain('USD');
  });
});
