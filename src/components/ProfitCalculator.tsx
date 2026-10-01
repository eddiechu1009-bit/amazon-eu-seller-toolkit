import { useState, useMemo } from 'react';

/**
 * 多國利潤比較器 —— 費率與計算邏輯不在這支裡面。
 * 舊版自帶一份手抄的近似費率（德國輕型信封 2.33 其實是 DE-only 欄、倉儲一律 €26/m³、佣金用不含稅價算），
 * 而且 € / £ / $ 直接混算，「最佳利潤國家」會系統性偏向英國。
 * 現在改用 eu-seller-101 成本計算機同一份引擎（public/eu-calc/，由學習地圖 tools/build_seller_calc.py 同步）：
 * 費率逐格取自 Amazon Rate Card Europe 2026-02-01，佣金依品類、用含稅售價計算，金額先換到各站當地幣別再算。
 */

interface EngineCat { id: string; name: string }
interface EngineResult {
  ok?: boolean; error?: string; unavailable?: string;
  exVat: number; fulfil: number; storage: number; profit: number; margin: number;
  ref: { fee: number; closing: number };
  cls?: { tier?: { name: string }; dimG: number; ship?: number; basis?: string };
}
interface Engine {
  CATS: [string, string, unknown, unknown?][];
  CAT: Record<string, EngineCat>;
  VAT: Record<string, number>;
  FUEL_PCT: number;
  calc: (i: Record<string, unknown>, mode?: string) => EngineResult;
}
const engine = (window as unknown as { EUCALC_ENGINE?: Engine }).EUCALC_ENGINE;

const MARKETS = [
  { code: 'DE', name: '德國', flag: '🇩🇪', sym: '€' },
  { code: 'FR', name: '法國', flag: '🇫🇷', sym: '€' },
  { code: 'IT', name: '義大利', flag: '🇮🇹', sym: '€' },
  { code: 'ES', name: '西班牙', flag: '🇪🇸', sym: '€' },
  { code: 'UK', name: '英國', flag: '🇬🇧', sym: '£' },
];

const CALC_URL = 'https://eu-seller-101.netlify.app/calculator/';
const KEY = 'eu-toolkit-profit-v2';

interface ProductInput {
  priceEur: number;   // 歐盟四站含稅售價（€）
  priceGbp: number;   // 英國含稅售價（£）
  cat: string;
  cost: number;       // 產品成本／件（USD）
  freight: number;    // 頭程／件（USD）
  lengthCm: number; widthCm: number; heightCm: number;
  weightKg: number;
  units: number;      // 月銷量
  months: number;     // 平均在倉月數
  fxUsd: number; fxEur: number; fxGbp: number;   // 1 外幣 = ? 新台幣
}

const defaultInput: ProductInput = {
  priceEur: 25, priceGbp: 22, cat: 'other', cost: 5, freight: 2,
  lengthCm: 25, widthCm: 15, heightCm: 8, weightKg: 0.5,
  units: 100, months: 2, fxUsd: 32, fxEur: 35, fxGbp: 41,
};

function loadInput(): ProductInput {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultInput, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultInput;
}

export default function ProfitCalculator() {
  const [input, setInput] = useState<ProductInput>(loadInput);
  const update = <K extends keyof ProductInput>(key: K, val: ProductInput[K]) => setInput(prev => {
    const next = { ...prev, [key]: val };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  const results = useMemo(() => {
    if (!engine) return [];
    return MARKETS.map(m => {
      const uk = m.code === 'UK';
      const r = engine.calc({
        dest: m.code, inv: '', mode: 'local', cep: false, lithium: false, dgStorage: false,
        price: uk ? input.priceGbp : input.priceEur, vat: engine.VAT[m.code], cat: input.cat,
        l: input.lengthCm, w: input.widthCm, h: input.heightCm, wt: input.weightKg * 1000,
        ccy: 'USD', cost: input.cost, freight: input.freight, duty: 0,
        fxEur: input.fxEur, fxGbp: input.fxGbp, fxUsd: input.fxUsd,
        months: input.months, season: 'avg', units: input.units, sub: 0,
        fuel: engine.FUEL_PCT, ads: 0, otherpct: 0, fbmship: 0,
      }, 'local');
      // 跨站比大小一律換成歐元（利潤率本身與幣別無關）
      const toEur = uk ? input.fxGbp / input.fxEur : 1;
      return { m, r, monthly: r.ok ? r.profit * input.units : 0, monthlyEur: r.ok ? r.profit * input.units * toEur : 0 };
    });
  }, [input]);

  if (!engine) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        計算引擎沒有載入。請改用 <a href={CALC_URL} className="underline" target="_blank" rel="noopener noreferrer">歐洲站成本計算機</a>。
      </div>
    );
  }

  const okRows = results.filter(x => x.r.ok);
  const best = okRows.length ? okRows.reduce((b, x) => x.monthlyEur > b.monthlyEur ? x : b, okRows[0]) : null;
  const firstErr = results.find(x => x.r.error)?.r.error;
  const cls = results.find(x => x.r.cls)?.r.cls;
  const fmt = (v: number, sym: string) => `${v < 0 ? '-' : ''}${sym}${Math.abs(v).toFixed(2)}`;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-amazon-dark flex items-center gap-2">💰 多國利潤比較器</h2>
        <p className="text-gray-500 text-sm mt-1">同一件商品放在五個站的當地倉（Pan-EU／當地 FBA）各賺多少。要比較 EFN、英國↔歐盟遠程配送、自發貨，或看單站完整明細與損益兩平售價，請用 <a href={CALC_URL} target="_blank" rel="noopener noreferrer" className="underline text-amazon-orange">歐洲站成本計算機</a>。</p>
      </div>

      <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm mb-4 animate-fadeIn">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📦 產品資訊</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <InputField label="歐盟四站售價（含 VAT）" value={input.priceEur} onChange={v => update('priceEur', v)} prefix="€" />
          <InputField label="英國售價（含 VAT）" value={input.priceGbp} onChange={v => update('priceGbp', v)} prefix="£" />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">品類（決定佣金）</label>
            <select value={input.cat} onChange={e => update('cat', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-amazon-orange/50">
              {engine.CATS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <InputField label="產品成本／件（USD）" value={input.cost} onChange={v => update('cost', v)} prefix="$" />
          <InputField label="頭程運費／件（USD）" value={input.freight} onChange={v => update('freight', v)} prefix="$" />
          <InputField label="月銷量（件／站）" value={input.units} onChange={v => update('units', v)} />
          <InputField label="平均在倉月數" value={input.months} onChange={v => update('months', v)} suffix="個月" />
        </div>
        <details className="mt-3 text-xs text-gray-500">
          <summary className="cursor-pointer">匯率（1 外幣 = ? 新台幣，可改）</summary>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <InputField label="USD" value={input.fxUsd} onChange={v => update('fxUsd', v)} />
            <InputField label="EUR" value={input.fxEur} onChange={v => update('fxEur', v)} />
            <InputField label="GBP" value={input.fxGbp} onChange={v => update('fxGbp', v)} />
          </div>
        </details>
      </div>

      <div className="bg-white rounded-xl border p-4 sm:p-5 shadow-sm mb-6 animate-fadeIn">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📐 包裝後尺寸與重量（決定 FBA 費用）</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <InputField label="長 (cm)" value={input.lengthCm} onChange={v => update('lengthCm', v)} />
          <InputField label="寬 (cm)" value={input.widthCm} onChange={v => update('widthCm', v)} />
          <InputField label="高 (cm)" value={input.heightCm} onChange={v => update('heightCm', v)} />
          <InputField label="單件重量 (kg)" value={input.weightKg} onChange={v => update('weightKg', v)} />
        </div>
        {cls && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            尺寸分級：<span className="font-semibold text-blue-800">{cls.tier ? cls.tier.name : '特殊超大件（費率另計）'}</span>
            <span className="ml-3">材積重 {(cls.dimG / 1000).toFixed(2)} kg（長×寬×高÷5,000）</span>
            {cls.basis && <span className="ml-3 text-xs text-blue-500">計費依據：{cls.basis}</span>}
          </div>
        )}
      </div>

      {firstErr && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">{firstErr}</div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-700">📊 五國利潤比較（各站當地幣別）</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500">國家</th>
                <th className="text-right px-3 py-2 text-gray-500">不含稅售價</th>
                <th className="text-right px-3 py-2 text-gray-500">佣金</th>
                <th className="text-right px-3 py-2 text-gray-500">FBA 配送費</th>
                <th className="text-right px-3 py-2 text-gray-500">倉儲</th>
                <th className="text-right px-3 py-2 text-gray-500">單件利潤</th>
                <th className="text-right px-3 py-2 text-gray-500">利潤率</th>
                <th className="text-right px-3 py-2 text-gray-500">月利潤</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ m, r, monthly }) => {
                const s = m.sym;
                if (!r.ok) {
                  return (
                    <tr key={m.code} className="border-t">
                      <td className="px-3 py-2.5 font-medium">{m.flag} {m.name}</td>
                      <td colSpan={7} className="px-3 py-2.5 text-gray-400 text-xs">{r.unavailable || '輸入有誤，未計算'}</td>
                    </tr>
                  );
                }
                const isBest = best !== null && best.m.code === m.code;
                const pct = r.margin * 100;
                return (
                  <tr key={m.code} className={`border-t ${isBest ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2.5 font-medium">{m.flag} {m.name}{isBest && <span className="ml-1 text-xs text-green-600">⭐</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmt(r.exVat, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-500">{fmt(r.ref.fee + r.ref.closing, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-orange-600 font-semibold">{fmt(r.fulfil, s)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-gray-400">{fmt(r.storage, s)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${r.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(r.profit, s)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${pct >= 20 ? 'text-green-700' : pct >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>{pct.toFixed(1)}%</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold ${monthly >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(monthly, s)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {best && (
        <div className={`rounded-xl p-4 mb-6 text-center ${best.r.profit >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className="text-sm text-gray-600 mb-1">月利潤最高的站（換成歐元比較）</p>
          <p className="text-2xl font-bold">{best.m.flag} {best.m.name}</p>
          <p className={`text-lg font-semibold mt-1 ${best.r.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            月利潤約 {fmt(best.monthlyEur, '€')} · 利潤率 {(best.r.margin * 100).toFixed(1)}%
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p>💡 這是估算，不是報價；實際費用以 Seller Central 的 Revenue Calculator 與官方費率頁為準。</p>
        <p>💡 FBA 配送費：從當地倉出貨的費率；德國以未參加 CEP 計（每件 +€0.26），另含 1.5% 燃油及物流附加費（2026-04-17 起）。</p>
        <p>💡 佣金依品類、用含稅售價計算，含各站最低佣金。倉儲費以全年平均月費率 × 在倉月數估算。</p>
        <p>💡 未包含：VAT 申報與稅代費、EPR 註冊費、月租（£25／€39）、廣告、退貨、關稅、超齡庫存費。</p>
        <p>📌 費率來源：<a href="https://m.media-amazon.com/images/G/02/sell/images/260114-FBA-Rate-Card-EN.pdf" target="_blank" rel="noopener noreferrer" className="underline">Amazon Rate Card Europe — Effective 1st February 2026 (PDF)</a></p>
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
