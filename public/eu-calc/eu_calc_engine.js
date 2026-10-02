/* 歐洲站成本計算引擎（兩個版本共用，改這一份就好）。
   費率：window.RATECARD_EU（tools/gen_ratecard.py 由 Amazon Rate Card Europe 2026-02-01 PDF 抽出）。
   其餘規則與出處：
   - 佣金與各品類最低佣金：Rate Card p.24–26；最低佣金「不適用」的品類依 sell.amazon.co.uk/pricing、sell.amazon.de/preisgestaltung。
   - 重型超大件 FBA 最低佣金 £20／€20：Rate Card p.24 註 1。
   - 燃油及物流附加費 1.5%（2026-04-17 起，套用在 FBA 配送費）：同上兩個官方 pricing 頁。
   - CEP：未參加 Central Europe Programme、從德國倉出貨，每件 +£0.26／€0.26（Rate Card p.6、p.10 註）。
   - 鋰電池或危險品配送 +£0.10／€0.10：Rate Card p.6、p.10 註 1（危險品倉儲費率另依 Amazon 對 ASIN 的危險品分類）。
   - 月倉儲費：Rate Card p.17。
*/
(function(){
const R = window.RATECARD_EU;
const VAT = {UK:20, DE:19, FR:20, IT:22, ES:21};
const SUB = {UK:25, EU:39};
const FUEL_PCT = 1.5;
const EU5 = ['DE','FR','IT','ES'];

/* flat：固定 %；band：整筆售價落在哪段用哪個 %；portion：分段累進；th＝[英國門檻, 歐盟門檻]；min:false＝沒有每件最低佣金 */
const CATS = [
 ['other','其他所有品類（Everything else）',{flat:15}],
 ['home','居家用品 Home Products',{band:[[[20,20],8]],rest:15}],
 ['kitchen','廚房 Kitchen',{flat:15}],
 ['linen','居家織品、地毯 Home Linen and Rugs',{flat:15},{sel:1}],
 ['furniture','家具 Furniture',{portion:[[[175,200],15]],rest:10}],
 ['furnacc','家具配件 Furniture Accessories',{flat:13},{sel:1}],
 ['tools','工具與居家修繕 Tools and Home Improvement',{flat:13}],
 ['door','門窗衛浴配件 Door, Window and Shower Accessories',{flat:13},{sel:1}],
 ['adhesive','居家黏著劑與束線 Home Adhesives and Cable Ties',{flat:13},{sel:1}],
 ['lawn','庭院園藝 Lawn and Garden',{flat:15}],
 ['sports','運動戶外 Sports and Outdoors',{flat:15}],
 ['cycleacc','自行車配件 Cycling Accessories',{flat:15}],
 ['toys','玩具 Toys and Games',{flat:15}],
 ['baby','嬰兒用品 Baby Products',{band:[[[10,10],8]],rest:15}],
 ['pushchair','嬰兒推車與安全用品 Baby Pushchairs and Safety Equipment',{band:[[[10,10],8]],rest:15},{sel:1}],
 ['beauty','美妝個護 Beauty, Health and Personal Care',{band:[[[10,10],8]],rest:15}],
 ['vitamins','維他命與保健 Vitamins, Minerals & Supplements',{band:[[[10,10],5]],rest:15}],
 ['grocery','食品雜貨 Grocery and Gourmet',{band:[[[10,10],5]],rest:15},{sel:1,noMin:1}],
 ['pet','寵物用品 Pet Supplies',{flat:15}],
 ['petfood','寵物服飾與食品 Pet Clothing and Food',{band:[[[10,10],5]],rest:15},{sel:1}],
 ['clothing','服飾與配件 Clothing and Accessories',{clothing:1},{sel:1,apparel:1}],
 ['footwear','鞋類 Footwear',{flat:15},{sel:1,apparel:1}],
 ['rucksack','背包與手提包 Rucksacks and Handbags',{flat:15},{sel:1,apparel:1}],
 ['eyewear','眼鏡 Eyewear',{flat:15},{apparel:1}],
 ['eyeprot','護目鏡 Eyewear Protection',{flat:15},{sel:1}],
 ['luggage','行李箱 Luggage',{flat:15}],
 ['luggageacc','行李配件 Luggage Accessories',{flat:15},{sel:1}],
 ['jewellery','珠寶 Jewellery',{portion:[[[225,250],20]],rest:5}],
 ['watches','手錶 Watches',{portion:[[[225,250],15]],rest:5}],
 ['ce','消費性電子 Consumer Electronics',{flat:7}],
 ['computers','電腦 Computers',{flat:7}],
 ['elecacc','電子／電腦配件 Electronic Accessories; Computer accessories',{portion:[[[100,100],15]],rest:8}],
 ['printeracc','印表機與掃描器配件 Printer and Scanner Accessories',{portion:[[[100,100],15]],rest:8},{sel:1}],
 ['compactapp','小家電 Compact Appliances',{flat:15}],
 ['fullapp','大家電 Full-Size Appliances',{flat:7}],
 ['auto','汽機車 Automotive and Powersports',{portion:[[[45,50],15]],rest:9}],
 ['tyres','輪胎 Tyres',{flat:7}],
 ['instruments','樂器與影音製作 Musical Instruments and AV Production',{flat:12}],
 ['office','辦公用品 Office Products',{flat:15}],
 ['business','工商與科學用品 Business, Industrial and Scientific Supplies',{flat:15}],
 ['commercial','商用電氣與能源 Commercial Electrical and Energy Supplies',{flat:12}],
 ['packing','包材 Packing Materials',{flat:15},{sel:1}],
 ['mattress','床墊 Mattresses',{flat:15},{sel:1}],
 ['gloves','重複使用工作與安全手套 Reusable Work and Safety Gloves',{band:[[[10,10],8]],rest:15},{sel:1}],
 ['handmade','手工藝 Handmade',{flat:12}],
 ['beer','酒類 Beer, Wine and Spirits',{flat:10}],
 ['device','Amazon 裝置配件 Amazon Device Accessories',{flat:45}],
 ['books','書籍 Books',{flat:15},{media:'books',noMin:1}],
 ['music','音樂、影片與 DVD Music, Video and DVD',{flat:15},{media:'music',noMin:1}],
 ['software','軟體 Software',{flat:15},{media:'other',noMin:1}],
 ['videogames','電玩與周邊 Video Games and Gaming Accessories',{flat:15},{media:'other',noMin:1}],
 ['consoles','遊戲主機 Video Game Consoles',{flat:8},{media:'other',noMin:1}],
];
const CAT = Object.fromEntries(CATS.map(([id,name,rule,flags])=>[id,{id,name,rule,flags:flags||{}}]));

function ruleText(c, uk){
  const s = uk?'£':'€', r=c.rule, k=uk?0:1;
  let t = '';
  if(r.flat!=null) t = `佣金 ${r.flat}%`;
  else if(r.band) t = `售價 ≤ ${s}${r.band[0][0][k]}：${r.band[0][1]}%；以上：${r.rest}%（整筆適用）`;
  else if(r.portion) t = `售價中 ${s}${r.portion[0][0][k]} 以內的部分 ${r.portion[0][1]}%，超過的部分 ${r.rest}%`;
  else if(r.clothing) t = uk ? 'FBA：售價 > £40 時，£40 以內 15%、超過部分 7%；售價 ≤ £40：≤£15 為 5%、£15–20 為 10%、> £20 為 15%（FBM 非 Prime 一律用後者）'
                             : 'FBA：售價 > €45 時，€45 以內 15%、超過部分 7%；售價 ≤ €45：≤€15 為 5%、€15–20 為 10%、> €20 為 15%（FBM 非 Prime 一律用後者）';
  t += c.flags.noMin ? '｜沒有每件最低佣金' : `｜每件最低 ${s}${uk?'0.25':'0.30'}`;
  return t;
}
/* 佣金的轉折點（給損益兩平分段用） */
function referralBreaks(c, uk){
  const r=c.rule, k=uk?0:1, b=[];
  if(r.band) b.push(r.band[0][0][k]);
  if(r.portion) b.push(r.portion[0][0][k]);
  if(r.clothing) b.push(15,20, uk?40:45);
  return b;
}
function referral(c, price, uk, mode, heavyOversize){
  const r=c.rule, k=uk?0:1; let fee;
  if(r.flat!=null) fee = price*r.flat/100;
  else if(r.band) fee = price*(price<=r.band[0][0][k] ? r.band[0][1] : r.rest)/100;
  else if(r.portion){ const t=r.portion[0][0][k]; fee = Math.min(price,t)*r.portion[0][1]/100 + Math.max(0,price-t)*r.rest/100; }
  else if(r.clothing){ const t = uk?40:45;
    fee = (mode!=='fbm' && price>t) ? t*0.15 + (price-t)*0.07 : price*(price<=15?5:price<=20?10:15)/100; }
  let min = c.flags.noMin ? 0 : (uk?0.25:0.30);
  if(heavyOversize && mode!=='fbm') min = Math.max(min, 20);     // 重型超大件 FBA 最低 £20／€20
  fee = Math.max(fee, min);
  let closing = 0; const m=c.flags.media;                        // 媒體結算費（p.24 註 3、4）
  if(m) closing = uk ? 0.50 : (m==='books' ? 1.01 : 0.81);
  return {fee, closing, min};
}
function closingFR(c){ return c.flags.media ? 0.61 : 0; }

const TIERS = [
 {id:'light_envelope', name:'輕型信封', max:[33,23,2.5], unit:100},
 {id:'standard_envelope', name:'標準信封', max:[33,23,2.5], unit:460},
 {id:'large_envelope', name:'大型信封', max:[33,23,4], unit:960},
 {id:'xl_envelope', name:'特大信封', max:[33,23,6], unit:960},
 {id:'small_parcel', name:'小型包裹', max:[35,25,12], unit:3900, dim:2100},
 {id:'standard_parcel', name:'標準包裹', max:[45,34,26], unit:11900, dim:7960},
 {id:'small_oversize', name:'小型超大', max:[61,46,46], unit:1760, dim:25820, over:1},
 {id:'std_oversize_light', name:'標準超大（輕）', max:[101,60,60], unit:15000, dim:72720, over:1},
 {id:'std_oversize_heavy', name:'標準超大（重）', max:[101,60,60], unitMin:15000, unit:23000, dim:72720, over:1},
 {id:'std_oversize_large', name:'標準超大（大）', max:[120,60,60], unit:23000, dim:86400, over:1},
 {id:'bulky_oversize', name:'大型超大', max:[999,999,999], unit:23000, dim:126000, over:1},
 {id:'heavy_oversize', name:'重型超大', max:[999,999,999], unitMin:23000, unit:31500, dim:126000, over:1, heavy:1},
];
const SEL = [
 {id:'small_parcel_1', name:'小型包裹 1', max:[35,25,7], unit:3900}, {id:'small_parcel_2', name:'小型包裹 2', max:[35,25,9], unit:3900},
 {id:'small_parcel_3', name:'小型包裹 3', max:[35,25,12], unit:3900}, {id:'medium_parcel_1', name:'中型包裹 1', max:[40,30,6], unit:11900},
 {id:'medium_parcel_2', name:'中型包裹 2', max:[40,30,20], unit:11900}, {id:'large_parcel_1', name:'大型包裹 1', max:[45,34,10], unit:11900},
 {id:'large_parcel_2', name:'大型包裹 2', max:[45,34,26], unit:11900},
];
const fits = (d,m)=> d[0]<=m[0] && d[1]<=m[1] && d[2]<=m[2];
function classify(L,W,H,g,selected){
  const d=[L,W,H].sort((a,b)=>b-a), dimG = L*W*H/5000*1000;
  if(d[0] > 175 || g > 31500 || 2*(d[1]+d[2])+d[0] > 360) return {special:1, dimG};
  for(const t of TIERS.slice(0,4)) if(fits(d,t.max) && g<=t.unit) return {tier:t, ship:g, dimG, basis:'單件重量'};
  if(selected){
    for(const t of SEL) if(fits(d,t.max) && g<=t.unit) return {tier:t, ship:g, dimG, sel:1, basis:'單件重量（指定品類）'};
  } else {
    for(const t of TIERS.slice(4,6)) if(fits(d,t.max) && g<=t.unit && dimG<=t.dim) return {tier:t, ship:Math.max(g,dimG), dimG, basis:'單件重量與材積重取大'};
  }
  for(const t of TIERS.slice(6)) if(fits(d,t.max) && g<=t.unit && (!t.unitMin || g>t.unitMin) && dimG<=t.dim) return {tier:t, ship:Math.max(g,dimG), dimG, basis:'單件重量與材積重取大'};
  return {special:1, dimG};
}
/* 欄位：依銷售目的地選欄；德國以 CEP 欄為基準，從德國倉出貨且未參加 CEP 時另加 0.26（等於費率表的 DE only 欄） */
function baseColumn(mode, dest, sel){
  if(mode==='local')  return dest==='DE' ? 'CEP' : dest;
  if(mode==='efn')    return sel ? (dest==='DE' ? 'CEP' : dest) : 'CEP_FR_IT_ES';
  if(mode==='remote') return dest==='UK' ? 'EU_to_UK' : 'UK_to_EU';
}
function lookup(cls, mode, dest){
  const t = cls.tier, col = baseColumn(mode, dest, cls.sel);
  const table = cls.sel ? (mode==='local' ? R.localSelected : R.efnSelected) : (mode==='local' ? R.local : R.efn);
  const e = table[t.id] && table[t.id][col];
  if(!e) return null;
  if(cls.sel) return e.base + e.per100g*Math.max(0, Math.ceil((cls.ship-100)/100));
  if(Array.isArray(e)){ const b = e.find(([up])=> cls.ship <= up) || e[e.length-1]; return b[1]; }
  return e.base + e.perKg*Math.max(0, Math.ceil((cls.ship-e.upTo)/1000));   // 未滿 1kg 以 1kg 計（費率表未載明，保守估計）
}
/* 庫存在哪一國出貨 */
function shipFrom(mode, dest, inv){
  if(mode==='local') return dest;
  if(mode==='efn') return inv;
  if(mode==='remote') return dest==='UK' ? inv : 'UK';
  return null;
}
/* 遠程配送售價上限（官方手冊 Remote Fulfilment between the UK and EU：歐盟 €135、英國 £122） */
const REMOTE_CAP = {EU:135, UK:122};
/* 可用性：EFN 只在歐盟站之間；遠程配送是英國↔歐盟 */
function available(mode, dest, inv){
  if(mode==='efn') return dest!=='UK' && EU5.includes(inv) && inv!==dest;
  if(mode==='remote') return dest==='UK' ? EU5.includes(inv) : true;
  return true;
}
const STORE = {UK:{apparel:[0.62,0.82], std:[0.76,1.51], over:[0.55,0.87], dgStd:[0.74,1.30], dgOver:[0.70,1.11]},
               EU:{apparel:[19.99,29.23], std:[27.54,52.20], over:[21.78,34.49], dgStd:[30.00,50.51], dgOver:[27.50,43.89]}};
function storageRate(region, cls, cat, dgStorage, season){
  const o = cls.tier && cls.tier.over;
  const k = dgStorage ? (o?'dgOver':'dgStd') : o ? 'over' : (cat.flags.apparel ? 'apparel' : 'std');
  const [lo,hi] = STORE[region][k];
  return season==='low'?lo : season==='high'?hi : (lo*9+hi*3)/12;
}

/* 主計算：in 為一個純資料物件（不碰 DOM） */
const MAXP = 1e6;
const LIMITS = {price:[MAXP,'售價'], cost:[MAXP,'成本'], freight:[MAXP,'頭程'], fbmship:[MAXP,'FBM 運費'], sub:[MAXP,'月租'],
  l:[1000,'尺寸'], w:[1000,'尺寸'], h:[1000,'尺寸'], wt:[1e6,'重量'], units:[1e7,'月銷量'], months:[120,'在倉月數'],
  vat:[100,'VAT'], duty:[1000,'關稅'], ads:[1000,'廣告比例'], otherpct:[1000,'其他費用比例'], fuel:[100,'附加費'],
  fxEur:[1e4,'EUR 匯率'], fxGbp:[1e4,'GBP 匯率'], fxUsd:[1e4,'USD 匯率']};
/* 匯率下限（1 外幣兌 TWD）：太小會讓成本換算成天文數字、利潤率 ×100 後溢位成無限大 */
const FX_MIN = 0.01;
function validate(i){
  const bad = [];
  if(!Object.hasOwn(CAT, i.cat)) bad.push('品類');                  // 白名單：擋 constructor、__proto__ 等原型鍵
  if(!Object.hasOwn(VAT, i.dest)) bad.push('銷售站');
  if(!['local','efn','remote','fbm'].includes(i.mode)) bad.push('物流方案');
  const pos = (k,label)=>{ if(!(Number.isFinite(i[k]) && i[k]>0)) bad.push(label); };
  const nonneg = (k,label)=>{ if(!(Number.isFinite(i[k]) && i[k]>=0)) bad.push(label); };
  pos('price','售價'); if(Number.isFinite(i.price) && i.price>0 && i.price<0.01) bad.push('售價（至少 0.01）');
  ['l','w','h'].forEach(k=>pos(k,'尺寸')); pos('wt','重量'); pos('units','月銷量');
  // 支援範圍：每個數值欄位都有上限（超出不計算，避免顯示看似有效的結果或無限大）
  Object.entries(LIMITS).forEach(([k,[max,label]])=>{ if(Number.isFinite(i[k]) && i[k] > max) bad.push(label + '超出支援範圍（≤ ' + max.toLocaleString('en') + '）'); });
  ['vat','cost','freight','duty','months','sub','ads','otherpct','fuel'].forEach(k=>nonneg(k,k));
  if(i.mode==='fbm') nonneg('fbmship','FBM 運費');
  const needFx = i.ccy!==(i.dest==='UK'?'GBP':'EUR') || i.mode==='remote' || (i.dest==='UK' && i.mode!=='local');
  const fx = (k,label)=>{ pos(k,label); if(Number.isFinite(i[k]) && i[k]>0 && i[k]<FX_MIN) bad.push(label + '（至少 ' + FX_MIN + '）'); };
  if(needFx){ fx('fxEur','EUR 匯率'); fx('fxGbp','GBP 匯率'); if(i.ccy==='USD') fx('fxUsd','USD 匯率'); }
  return [...new Set(bad)];
}
function calc(i, mode){
  mode = mode || i.mode;
  const uk = i.dest==='UK', cat = CAT[i.cat];
  const errs = validate(Object.assign({}, i, {mode}));
  if(errs.length) return {mode, error: '請檢查：' + errs.join('、')};
  if(!available(mode, i.dest, i.inv)) return {mode, unavailable: mode==='efn' ? (uk ? '英國不適用 EFN（看遠程配送）' : '庫存國要選另一個歐盟國') : '要選庫存國'};
  if(mode==='remote' && i.price > REMOTE_CAP[uk?'UK':'EU']) return {mode, unavailable: `售價超過遠程配送上限（${uk?'£122':'€135'}）`};
  const exVat = i.price/(1+i.vat/100);
  const local = uk ? 'GBP' : 'EUR';
  const toTwd = (x, ccy)=> ccy==='TWD' ? x : ccy==='USD' ? x*i.fxUsd : ccy==='EUR' ? x*i.fxEur : x*i.fxGbp;
  const toLocal = x => i.ccy===local ? x : toTwd(x, i.ccy) / (uk ? i.fxGbp : i.fxEur);
  const cls = classify(i.l, i.w, i.h, i.wt, !!cat.flags.sel);
  let fulfil = 0, fulfilParts = [];
  if(mode==='fbm'){ fulfil = i.fbmship; }
  else {
    if(cls.special) return {mode, unavailable:'特殊超大件：費率另計，請查費率表第 6 頁', cls};
    const base = lookup(cls, mode, i.dest);
    if(base==null) return {mode, unavailable:'這個尺寸級距在此方案沒有費率', cls};
    fulfil = base; fulfilParts.push(['費率表基本費', base]);
    const from = shipFrom(mode, i.dest, i.inv);
    if(from==='DE' && !i.cep){ fulfil += 0.26; fulfilParts.push(['德國倉出貨、未參加 CEP', 0.26]); }
    if(i.lithium){ fulfil += 0.10; fulfilParts.push(['含鋰電池／危險品', 0.10]); }
    const fuel = fulfil * i.fuel/100; fulfil += fuel; fulfilParts.push([`燃油及物流附加費 ${i.fuel}%`, fuel]);
  }
  const ref = referral(cat, i.price, uk, mode, cls.tier && cls.tier.heavy);
  if(i.dest==='FR' && cat.flags.media) ref.closing = closingFR(cat);
  const vol = i.l*i.w*i.h/1e6;
  const region = mode==='remote' ? (uk ? 'EU' : 'UK') : (uk ? 'UK' : 'EU');
  let storage = 0;
  if(mode!=='fbm'){
    const rate = storageRate(region, cls, cat, i.dgStorage, i.season);
    storage = (region==='UK' ? vol*35.3147*rate : vol*rate) * i.months;   // 英國以 ft³、歐盟以 m³ 計價
    if(region==='UK' && !uk) storage = storage * i.fxGbp / i.fxEur;
    if(region==='EU' && uk)  storage = storage * i.fxEur / i.fxGbp;
  }
  const sub = i.sub/Math.max(1,i.units);
  const ads = exVat*i.ads/100, other = exVat*i.otherpct/100;
  const cost = toLocal(i.cost), freight = toLocal(i.freight), duty = (cost+freight)*i.duty/100;
  if(![cost, freight, duty].every(Number.isFinite)) return {mode, error:'請檢查：成本或頭程換算後超出可計算範圍（匯率過小），無法計算'};
  const fees = fulfil + ref.fee + ref.closing + storage + sub + ads + other;
  const profit = exVat - fees - cost - freight - duty;
  const margin = profit/exVat, monthly = profit*i.units;
  // 所有輸出都要是有限值，且 ×100（百分比、四捨五入到分）後仍有限，否則不回傳結果
  const outs = [exVat, i.price-exVat, fulfil, ref.fee, ref.closing, storage, sub, ads, other, cost, freight, duty, fees, profit, margin, monthly, ...fulfilParts.map(p=>p[1])];
  if(!outs.every(x=> Number.isFinite(x) && Number.isFinite(x*100))) return {mode, error:'請檢查：輸入數值超出可計算範圍（售價、成本或匯率過大或過小），無法計算'};
  return {mode, price:i.price, exVat, vatAmt:i.price-exVat, cls, fulfil, fulfilParts, ref, storage, region, sub, ads, other, cost, freight, duty, profit,
          margin, monthly, ok:true};
}
/* 損益兩平：利潤對售價是分段線性（佣金在門檻處跳級），逐段找最低可行售價 */
/* 利潤是否 ≥ 0（容許浮點誤差：£20 − 8% 佣金 − £18.40 理論上剛好 0，浮點會算出 −5e-17） */
function notLoss(r){ return r.profit >= -1e-9*Math.max(1, Math.abs(r.exVat), Math.abs(r.exVat - r.profit)); }
function breakEven(i, mode){
  if(!Object.hasOwn(CAT, i.cat)) return null;
  const uk = i.dest==='UK', cat = CAT[i.cat];
  // P(p)：不虧回傳 ≥ 0 的利潤（誤差內歸 0），虧錢回傳負值，算不出來回 null
  const P = p => { const r = calc(Object.assign({}, i, {price:p}), mode); if(!r.ok) return null; return notLoss(r) ? Math.max(0, r.profit) : Math.min(r.profit, -Number.MIN_VALUE); };
  const pts = [0.01, ...referralBreaks(cat, uk), 100000].sort((a,b)=>a-b);
  // 最低佣金的轉折點：費率 × 售價 = 最低佣金
  const cand = new Set(pts);
  for(const pct of [5,7,8,9,10,12,13,15,20,45]){ cand.add((uk?0.25:0.30)/(pct/100)); cand.add(20/(pct/100)); }
  cand.add(MAXP);                                                 // 最後一段延伸到支援上限（售價 ≤ 1,000,000）
  if(mode==='remote') cand.add(REMOTE_CAP[uk?'UK':'EU']);         // 遠程配送超過上限就不能用，上限本身是一個分段點
  const xs = [...cand].filter(x=>x>0 && x<=MAXP).sort((a,b)=>a-b);
  // 進位到分，並回代確認真的不虧（顯示的價格要是賣得出去的價格）
  const cent = p => { let c = Math.ceil(p*100 - 1e-6)/100; for(let k=0;k<5 && (P(c)==null || P(c)<0);k++) c = Math.round(c*100+1)/100; return (P(c)!=null && P(c)>=0 && Number.isFinite(c)) ? c : null; };
  const p0 = P(0.01); if(p0!=null && p0>=0) return 0.01;          // 最低價 0.01 直接檢查
  for(let s=0; s<xs.length-1; s++){
    let a = xs[s] + 1e-6, b = xs[s+1];
    const pa = P(a), pb = P(b);
    if(pa==null || pb==null) continue;
    if(pa >= 0) return cent(a);
    if(pb >= 0){ for(let k=0;k<80;k++){ const m=(a+b)/2; (P(m)>=0) ? b=m : a=m; } return cent(b); }
  }
  return null;
}
window.EUCALC_ENGINE = {MAXP, REMOTE_CAP, LIMITS, FX_MIN, CATS, CAT, notLoss, VAT, SUB, FUEL_PCT, EU5, ruleText, referral, classify, lookup, storageRate, calc, breakEven, validate, available};
})();
