import { useState, useMemo } from 'react';

interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  vatRate: number;
  fbaBaseFee: number; // small standard
  fbaPerKg: number;
  referralFeeDefault: number; // percentage
  eprPackaging: number; // annual estimate
  monthlyStorage: number; // per cbm per month
}

const countries: CountryConfig[] = [
  { code: 'DE', name: '德國', flag: '🇩🇪', currency: 'EUR', vatRate: 19, fbaBaseFee: 3.00, fbaPerKg: 0.25, referralFeeDefault: 15, eprPackaging: 100, monthlyStorage: 26 },
  { code: 'FR', name: '法國', flag: '🇫🇷', currency: 'EUR', vatRate: 20, fbaBaseFee: 3.10, fbaPerKg: 0.25, referralFeeDefault: 15, eprPackaging: 120, monthlyStorage: 26 },
  { code: 'IT', name: '義大利', flag: '🇮🇹', currency: 'EUR', vatRate: 22, fbaBaseFee: 3.10, fbaPerKg: 0.25, referralFeeDefault: 15, eprPackaging: 80, monthlyStorage: 26 },
  { code: 'ES', name: '西班牙', flag: '🇪🇸', currency: 'EUR', vatRate: 21, fbaBaseFee: 3.10, fbaPerKg: 0.25, referralFeeDefault: 15, eprPackaging: 80, monthlyStorage: 26 },
  { code: 'UK', name: '英國', flag: '🇬🇧', currency: 'GBP', vatRate: 20, fbaBaseFee: 2.70, fbaPerKg: 0.22, referralFeeDefault: 15, eprPackaging: 80, monthlyStorage: 22 },
];

interface ProductInput {
  sellingPrice: number;
  productCost: number;
  shippingToFba: number; // per unit
  weightKg: number;
  referralFeePct: number;
  unitsPerMonth: number;
}

const defaultInput: ProductInput = {
  sellingPrice: 25,
  productCost: 5,
  shippingToFba: 2,
  weightKg: 0.5,
  referralFeePct: 15,
  unitsPerMonth: 100,
};

function calcProfit(input: ProductInput, country: CountryConfig) {
  const { sellingPrice, productCost, shippingToFba, weightKg, referralFeePct, unitsPerMonth } = input;
  const priceExVat = sellingPrice / (1 + country.vatRate / 100);
  const referralFee = priceExVat * (referralFeePct / 100);
  const fbaFee = country.fbaBaseFee + Math.max(0, weightKg - 0.5) * country.fbaPerKg;
  const storageCost = (weightKg * 0.002) * country.monthlyStorage; // rough cbm estimate
  const eprPerUnit = country.eprPackaging / Math.max(unitsPerMonth * 12, 1);
  const totalFees = referralFee + fbaFee + storageCost + eprPerUnit;
  const profitPerUnit = priceExVat - productCost - shippingToFba - totalFees;
  const margin = priceExVat > 0 ? (profitPerUnit / priceExVat) * 100 : 0;
  const monthlyProfit = profitPerUnit * unitsPerMonth;

  return {
    priceExVat,
    vatAmount: sellingPrice - priceExVat,
    referralFee,
    fbaFee,
    storageCost,
    eprPerUnit,
    totalFees,
    profitPerUnit,
    margin,
    monthlyProfit,
    currency: country.currency,
  };
}

export default function ProfitCalculator() {
  const [input, setInput] = useState<ProductInput>(defaultInput);

  const update = <K extends keyof ProductInput>(key: K, val: ProductInput[K]) => {
    setInput(prev => ({ ...prev, [key]: val }));
  };

  const results = useMemo(() =>
    countries.map(c => ({ country: c, ...calcProfit(input, c) })),
    [input]
  );

  const bestCountry = results.reduce((best, r) => r.margin > best.margin ? r : best, results[0]);

  const fmt = (v: number, cur: string) => {
    const sym = cur === 'GBP' ? '£' : '€';
    const sign = v < 0 ? '-' : '';
    return `${sign}${sym}${Math.abs(v).toFixed(2)}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-amazon-dark flex items-center gap-2">
          <span className="text-2xl">💰</span>
          多國利潤比較器
        </h2>
        <p className="text-gray-500 text-sm mt-1">輸入產品資訊，一次比較歐洲五國的利潤（含 VAT、FBA、佣金、EPR）</p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm mb-6 animate-fadeIn">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 產品資訊</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InputField label="售價（含稅）" value={input.sellingPrice} onChange={v => update('sellingPrice', v)} prefix="€" />
          <InputField label="產品成本" value={input.productCost} onChange={v => update('productCost', v)} prefix="$" />
          <InputField label="頭程運費/件" value={input.shippingToFba} onChange={v => update('shippingToFba', v)} prefix="$" />
          <InputField label="重量 (kg)" value={input.weightKg} onChange={v => update('weightKg', v)} />
          <InputField label="佣金 (%)" value={input.referralFeePct} onChange={v => update('referralFeePct', v)} suffix="%" />
          <InputField label="月銷量 (件)" value={input.unitsPerMonth} onChange={v => update('unitsPerMonth', v)} />
        </div>
        <p className="text-xs text-gray-400 mt-3">💡 售價以歐元計，英國站會依匯率換算。產品成本和頭程運費以美元計。</p>
      </div>

      {/* Results Comparison */}
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
                <th className="text-right px-3 py-2 text-gray-500">總費用</th>
                <th className="text-right px-3 py-2 text-gray-500">單件利潤</th>
                <th className="text-right px-3 py-2 text-gray-500">利潤率</th>
                <th className="text-right px-3 py-2 text-gray-500">月利潤</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => {
                const isBest = r === bestCountry;
                return (
                  <tr key={r.country.code} className={`border-t ${isBest ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2.5 font-medium">
                      {r.country.flag} {r.country.name}
                      {isBest && <span className="ml-1 text-xs text-green-600">⭐</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmt(r.priceExVat, r.currency)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500">{fmt(r.referralFee, r.currency)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500">{fmt(r.fbaFee, r.currency)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-red-600">{fmt(r.totalFees, r.currency)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.profitPerUnit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(r.profitPerUnit, r.currency)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${r.margin >= 20 ? 'text-green-700' : r.margin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {r.margin.toFixed(1)}%
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.monthlyProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(r.monthlyProfit, r.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Best Country Highlight */}
      <div className={`rounded-xl p-4 mb-6 ${bestCountry.profitPerUnit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">最佳利潤國家</p>
          <p className="text-2xl font-bold">
            {bestCountry.country.flag} {bestCountry.country.name}
          </p>
          <p className={`text-lg font-semibold mt-1 ${bestCountry.profitPerUnit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            單件利潤 {fmt(bestCountry.profitPerUnit, bestCountry.currency)} · 利潤率 {bestCountry.margin.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p>💡 此計算為估算值，實際費用以 Amazon Seller Central 為準。</p>
        <p>💡 FBA 費用依商品尺寸分級而異，此處使用小型標準件費率。大型商品費用會更高。</p>
        <p>💡 未包含廣告費用、退貨成本、長期倉儲費等變動成本。</p>
        <p>💡 英國站售價以歐元輸入，實際以英鎊計價，此處使用近似匯率換算。</p>
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
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-orange/50"
        />
        {suffix && <span className="text-xs text-gray-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}
