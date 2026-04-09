import { useState, useMemo } from 'react';

/* ── Size Tier Definitions (2025 Feb+) ── */
type SizeTier = 'light-envelope' | 'std-envelope' | 'large-envelope' | 'xl-envelope'
  | 'small-parcel' | 'std-parcel' | 'small-oversize' | 'std-oversize';

interface TierDef {
  id: SizeTier;
  label: string;
  labelEn: string;
  maxL: number; maxW: number; maxH: number; // cm
  maxWeight: number; // kg (shipping weight)
}

const sizeTiers: TierDef[] = [
  { id: 'light-envelope', label: '輕型信封', labelEn: 'Light Envelope', maxL: 33, maxW: 23, maxH: 2.5, maxWeight: 0.08 },
  { id: 'std-envelope', label: '標準信封', labelEn: 'Standard Envelope', maxL: 33, maxW: 23, maxH: 2.5, maxWeight: 0.46 },
  { id: 'large-envelope', label: '大型信封', labelEn: 'Large Envelope', maxL: 33, maxW: 23, maxH: 4, maxWeight: 0.96 },
  { id: 'xl-envelope', label: '特大信封', labelEn: 'Extra-Large Envelope', maxL: 33, maxW: 23, maxH: 6, maxWeight: 0.96 },
  { id: 'small-parcel', label: '小型包裹', labelEn: 'Small Parcel', maxL: 35, maxW: 25, maxH: 12, maxWeight: 3.9 },
  { id: 'std-parcel', label: '標準包裹', labelEn: 'Standard Parcel', maxL: 45, maxW: 34, maxH: 26, maxWeight: 11.9 },
  { id: 'small-oversize', label: '小型超大', labelEn: 'Small Oversize', maxL: 61, maxW: 46, maxH: 46, maxWeight: 25.82 },
  { id: 'std-oversize', label: '標準超大', labelEn: 'Standard Oversize', maxL: 120, maxW: 60, maxH: 60, maxWeight: 31.5 },
];

/* ── FBA Fee Tables (2025 Feb+, Local Fulfillment) ── */
// Simplified: base fee for each tier per country. For parcels, uses base + per-100g incremental.
interface FeeEntry { base: number; per100g: number; }
type FeeTable = Record<string, Record<SizeTier, FeeEntry>>;

const fbaFees: FeeTable = {
  // Source: Amazon 2025 FBA fulfilment fee changes (Local fulfillment, on/after 1 Feb 2025)
  DE: {
    'light-envelope': { base: 1.87, per100g: 0 },
    'std-envelope': { base: 2.30, per100g: 0.04 },
    'large-envelope': { base: 2.72, per100g: 0.04 },
    'xl-envelope': { base: 3.15, per100g: 0.04 },
    'small-parcel': { base: 3.50, per100g: 0.07 },
    'std-parcel': { base: 3.50, per100g: 0.07 },
    'small-oversize': { base: 5.79, per100g: 0.08 },
    'std-oversize': { base: 7.50, per100g: 0.10 },
  },
  FR: {
    'light-envelope': { base: 2.24, per100g: 0 },
    'std-envelope': { base: 2.80, per100g: 0.05 },
    'large-envelope': { base: 3.40, per100g: 0.05 },
    'xl-envelope': { base: 4.00, per100g: 0.05 },
    'small-parcel': { base: 5.45, per100g: 0.08 },
    'std-parcel': { base: 5.45, per100g: 0.08 },
    'small-oversize': { base: 7.80, per100g: 0.10 },
    'std-oversize': { base: 9.50, per100g: 0.12 },
  },
  IT: {
    'light-envelope': { base: 2.64, per100g: 0 },
    'std-envelope': { base: 3.00, per100g: 0.04 },
    'large-envelope': { base: 3.40, per100g: 0.04 },
    'xl-envelope': { base: 3.80, per100g: 0.04 },
    'small-parcel': { base: 4.83, per100g: 0.06 },
    'std-parcel': { base: 4.83, per100g: 0.06 },
    'small-oversize': { base: 7.20, per100g: 0.08 },
    'std-oversize': { base: 9.00, per100g: 0.10 },
  },
  ES: {
    'light-envelope': { base: 2.15, per100g: 0 },
    'std-envelope': { base: 2.50, per100g: 0.04 },
    'large-envelope': { base: 2.90, per100g: 0.04 },
    'xl-envelope': { base: 3.30, per100g: 0.04 },
    'small-parcel': { base: 3.85, per100g: 0.07 },
    'std-parcel': { base: 3.85, per100g: 0.07 },
    'small-oversize': { base: 6.00, per100g: 0.09 },
    'std-oversize': { base: 7.80, per100g: 0.11 },
  },
  UK: {
    'light-envelope': { base: 1.46, per100g: 0 },
    'std-envelope': { base: 1.90, per100g: 0.03 },
    'large-envelope': { base: 2.30, per100g: 0.03 },
    'xl-envelope': { base: 2.70, per100g: 0.03 },
    'small-parcel': { base: 2.97, per100g: 0.05 },
    'std-parcel': { base: 2.97, per100g: 0.05 },
    'small-oversize': { base: 5.10, per100g: 0.07 },
    'std-oversize': { base: 6.50, per100g: 0.09 },
  },
};

interface CountryInfo {
  code: string; name: string; flag: string; currency: string; currencySymbol: string;
  vatRate: number; eprAnnual: number; monthlyStoragePerCbm: number;
}

const countryList: CountryInfo[] = [
  { code: 'DE', name: '德國', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€', vatRate: 19, eprAnnual: 100, monthlyStoragePerCbm: 26 },
  { code: 'FR', name: '法國', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€', vatRate: 20, eprAnnual: 120, monthlyStoragePerCbm: 26 },
  { code: 'IT', name: '義大利', flag: '🇮🇹', currency: 'EUR', currencySymbol: '€', vatRate: 22, eprAnnual: 80, monthlyStoragePerCbm: 26 },
  { code: 'ES', name: '西班牙', flag: '🇪🇸', currency: 'EUR', currencySymbol: '€', vatRate: 21, eprAnnual: 80, monthlyStoragePerCbm: 26 },
  { code: 'UK', name: '英國', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£', vatRate: 20, eprAnnual: 80, monthlyStoragePerCbm: 22 },
];

/* ── Helpers ── */
function determineSizeTier(l: number, w: number, h: number, weightKg: number): TierDef {
  const dims = [l, w, h].sort((a, b) => b - a); // longest first
  const [dl, dw, dh] = dims;
  for (const tier of sizeTiers) {
    if (dl <= tier.maxL && dw <= tier.maxW && dh <= tier.maxH && weightKg <= tier.maxWeight) {
      return tier;
    }
  }
  return sizeTiers[sizeTiers.length - 1]; // fallback to largest
}

function calcShippingWeight(l: number, w: number, h: number, weightKg: number): number {
  const dimWeight = (l * w * h) / 5000;
  return Math.max(weightKg, dimWeight);
}

function calcFbaFee(country: string, tier: SizeTier, shippingWeightKg: number): number {
  const entry = fbaFees[country]?.[tier];
  if (!entry) return 0;
  if (tier.includes('envelope')) return entry.base;
  // For parcels: base + incremental per 100g above first 100g
  const extraGrams = Math.max(0, shippingWeightKg * 1000 - 100);
  const extra100g = Math.ceil(extraGrams / 100);
  return entry.base + extra100g * entry.per100g;
}

/* ── Input ── */
interface ProductInput {
  sellingPrice: number;
  productCost: number;
  shippingToFba: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  referralFeePct: number;
  unitsPerMonth: number;
}

const defaultInput: ProductInput = {
  sellingPrice: 25,
  productCost: 5,
  shippingToFba: 2,
  lengthCm: 25,
  widthCm: 15,
  heightCm: 8,
  weightKg: 0.5,
  referralFeePct: 15,
  unitsPerMonth: 100,
};

/* ── Component ── */
export default function ProfitCalculator() {
  const [input, setInput] = useState<ProductInput>(defaultInput);
  const update = <K extends keyof ProductInput>(key: K, val: ProductInput[K]) => setInput(prev => ({ ...prev, [key]: val }));

  const shippingWeight = calcShippingWeight(input.lengthCm, input.widthCm, input.heightCm, input.weightKg);
  const dimWeight = (input.lengthCm * input.widthCm * input.heightCm) / 5000;
  const tier = determineSizeTier(input.lengthCm, input.widthCm, input.heightCm, shippingWeight);

  const results = useMemo(() => countryList.map(c => {
    const fbaFee = calcFbaFee(c.code, tier.id, shippingWeight);
    const priceExVat = input.sellingPrice / (1 + c.vatRate / 100);
    const referralFee = priceExVat * (input.referralFeePct / 100);
    const volumeCbm = (input.lengthCm * input.widthCm * input.heightCm) / 1000000;
    const storageCost = volumeCbm * c.monthlyStoragePerCbm;
    const eprPerUnit = c.eprAnnual / Math.max(input.unitsPerMonth * 12, 1);
    const totalFees = referralFee + fbaFee + storageCost + eprPerUnit;
    const profitPerUnit = priceExVat - input.productCost - input.shippingToFba - totalFees;
    const margin = priceExVat > 0 ? (profitPerUnit / priceExVat) * 100 : 0;
    return { country: c, fbaFee, priceExVat, referralFee, storageCost, eprPerUnit, totalFees, profitPerUnit, margin, monthlyProfit: profitPerUnit * input.unitsPerMonth };
  }), [input, tier, shippingWeight]);

  const best = results.reduce((b, r) => r.margin > b.margin ? r : b, results[0]);
  const fmt = (v: number, sym: string) => `${v < 0 ? '-' : ''}${sym}${Math.abs(v).toFixed(2)}`;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-amazon-dark flex items-center gap-2">💰 多國利潤比較器</h2>
        <p className="text-gray-500 text-sm mt-1">輸入產品尺寸和重量，自動判斷 FBA 尺寸分級並計算五國利潤</p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm mb-4 animate-fadeIn">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 產品資訊</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InputField label="售價（含稅 €）" value={input.sellingPrice} onChange={v => update('sellingPrice', v)} prefix="€" />
          <InputField label="產品成本（$）" value={input.productCost} onChange={v => update('productCost', v)} prefix="$" />
          <InputField label="頭程運費/件（$）" value={input.shippingToFba} onChange={v => update('shippingToFba', v)} prefix="$" />
          <InputField label="佣金 (%)" value={input.referralFeePct} onChange={v => update('referralFeePct', v)} suffix="%" />
          <InputField label="月銷量 (件)" value={input.unitsPerMonth} onChange={v => update('unitsPerMonth', v)} />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm mb-6 animate-fadeIn">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📐 尺寸與重量（決定 FBA 費用）</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InputField label="長 (cm)" value={input.lengthCm} onChange={v => update('lengthCm', v)} />
          <InputField label="寬 (cm)" value={input.widthCm} onChange={v => update('widthCm', v)} />
          <InputField label="高 (cm)" value={input.heightCm} onChange={v => update('heightCm', v)} />
          <InputField label="實際重量 (kg)" value={input.weightKg} onChange={v => update('weightKg', v)} />
        </div>

        {/* Size tier result */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div>
              <span className="text-blue-600 font-medium">尺寸分級：</span>
              <span className="font-semibold text-blue-800">{tier.label}</span>
              <span className="text-blue-500 ml-1">({tier.labelEn})</span>
            </div>
            <div className="text-blue-600">
              材積重：<span className="font-mono">{dimWeight.toFixed(2)} kg</span>
            </div>
            <div className="text-blue-600">
              計費重量：<span className="font-mono font-semibold">{shippingWeight.toFixed(2)} kg</span>
              {dimWeight > input.weightKg && <span className="text-xs text-blue-500 ml-1">（取材積重）</span>}
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-1">
            材積重公式：長 × 寬 × 高 ÷ 5,000 = {input.lengthCm} × {input.widthCm} × {input.heightCm} ÷ 5,000 = {dimWeight.toFixed(2)} kg
          </p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">📊 五國利潤比較</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500">國家</th>
                <th className="text-right px-3 py-2 text-gray-500">不含稅售價</th>
                <th className="text-right px-3 py-2 text-gray-500">佣金</th>
                <th className="text-right px-3 py-2 text-gray-500">FBA 費</th>
                <th className="text-right px-3 py-2 text-gray-500">倉儲/月</th>
                <th className="text-right px-3 py-2 text-gray-500">總費用</th>
                <th className="text-right px-3 py-2 text-gray-500">單件利潤</th>
                <th className="text-right px-3 py-2 text-gray-500">利潤率</th>
                <th className="text-right px-3 py-2 text-gray-500">月利潤</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const s = r.country.currencySymbol;
                const isBest = r === best;
                return (
                  <tr key={r.country.code} className={`border-t ${isBest ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2.5 font-medium">{r.country.flag} {r.country.name}{isBest && <span className="ml-1 text-xs text-green-600">⭐</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmt(r.priceExVat, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500">{fmt(r.referralFee, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-orange-600 font-semibold">{fmt(r.fbaFee, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-400">{fmt(r.storageCost, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-600">{fmt(r.totalFees, s)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.profitPerUnit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(r.profitPerUnit, s)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${r.margin >= 20 ? 'text-green-700' : r.margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>{r.margin.toFixed(1)}%</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.monthlyProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(r.monthlyProfit, s)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best highlight */}
      <div className={`rounded-xl p-4 mb-6 text-center ${best.profitPerUnit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className="text-sm text-gray-600 mb-1">最佳利潤國家</p>
        <p className="text-2xl font-bold">{best.country.flag} {best.country.name}</p>
        <p className={`text-lg font-semibold mt-1 ${best.profitPerUnit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
          單件利潤 {fmt(best.profitPerUnit, best.country.currencySymbol)} · 利潤率 {best.margin.toFixed(1)}%
        </p>
      </div>

      {/* Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p>💡 FBA 費用依據 Amazon 2025年2月生效的歐洲 Local Fulfillment 費率表計算。</p>
        <p>💡 計費重量 = max(實際重量, 材積重)。材積重 = 長 × 寬 × 高 ÷ 5,000。</p>
        <p>💡 倉儲費以月均庫存體積估算。EPR 包裝費以年費分攤至每件。</p>
        <p>💡 未包含廣告費、退貨成本、長期倉儲費等變動成本。實際費用以 Seller Central 為準。</p>
        <p>📌 費率來源：<a href="https://sellercentral-europe.amazon.com/help/hub/reference/external/GABBX6GZPA8MSZGW" target="_blank" rel="noopener noreferrer" className="underline">Amazon 2025 FBA fulfilment fee changes</a></p>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, prefix, suffix }: {
  label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex items-center">
        {prefix && <span className="text-xs text-gray-400 mr-1">{prefix}</span>}
        <input type="number" step="0.01" min="0" value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-orange/50" />
        {suffix && <span className="text-xs text-gray-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
