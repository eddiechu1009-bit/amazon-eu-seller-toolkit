import { useState, useCallback, useEffect } from 'react';
import TabNav from './components/TabNav';
import ModuleView from './components/ModuleView';
import ProgressTracker from './components/ProgressTracker';
import { ModuleId } from './data/types';
import { allModules, moduleMap } from './data/modules';

const STORAGE_KEY = 'seller-toolkit-checked';

function loadChecked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveChecked(checked: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked]));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ModuleId>('brand');
  const [checked, setChecked] = useState<Set<string>>(loadChecked);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    saveChecked(checked);
  }, [checked]);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const completedCounts: Record<string, number> = {};
  const totalCounts: Record<string, number> = {};
  allModules.forEach((mod) => {
    totalCounts[mod.id] = mod.items.length;
    completedCounts[mod.id] = mod.items.filter((item) => checked.has(item.id)).length;
  });

  const currentModule = moduleMap[activeTab];

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amazon-dark to-amazon-light p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 text-center animate-fadeInScale">
          <div className="text-5xl mb-3 animate-bounce">🛠️</div>
          <h1 className="text-3xl font-bold text-amazon-dark mb-2">Amazon 歐洲賣家營運工具箱</h1>
          <p className="text-gray-500 mb-6">註冊完成後的六大必修課，從品牌註冊到廣告投放一站搞定</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 text-left">
            {allModules.map((mod) => {
              const done = completedCounts[mod.id] || 0;
              const total = mod.items.length;
              return (
                <button
                  key={mod.id}
                  onClick={() => { setActiveTab(mod.id as ModuleId); setStarted(true); }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-left
                    hover:border-amazon-orange hover:shadow-lg hover:-translate-y-1
                    transition-all duration-200 group cursor-pointer"
                >
                  <div className="text-2xl mb-1.5 group-hover:scale-110 transition-transform duration-200">{mod.icon}</div>
                  <div className="text-sm font-semibold text-gray-800 group-hover:text-amazon-orange transition-colors">{mod.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{total} 個項目</div>
                  {done > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-gradient-to-r from-amazon-orange to-yellow-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.round((done / total) * 100)}%` }} />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{done}/{total} 完成</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="px-8 py-3 bg-amazon-orange text-white font-semibold rounded-lg
              hover:bg-orange-500 hover:shadow-lg hover:-translate-y-0.5
              transition-all duration-200 text-lg"
          >
            從頭開始 →
          </button>

          <p className="text-xs text-gray-400 mt-6">
            本工具適用於已完成 Amazon 歐洲站帳號註冊的賣家。
            <br />
            內容基於 Amazon Seller Central 官方資料與實務經驗整理，僅供參考。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-amazon-dark text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛠️</span>
          <div>
            <h1 className="text-lg font-semibold">Amazon 歐洲賣家營運工具箱</h1>
            <p className="text-xs text-gray-400">品牌註冊 · Listing · FBA · PPC · 促銷</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (confirm('確定要清除所有進度嗎？')) {
                setChecked(new Set());
              }
            }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            清除進度
          </button>
          <button
            onClick={() => {
              setStarted(false);
              setActiveTab('brand');
            }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            回首頁
          </button>
        </div>
      </header>

      <TabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        completedCounts={completedCounts}
        totalCounts={totalCounts}
      />

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <ProgressTracker checked={checked} />
        <ModuleView module={currentModule} checked={checked} onToggle={toggleCheck} />
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t">
        資料來源：Amazon Seller Central、EUIPO、各國稅務機關等公開資料。內容僅供參考。
        <br />
        最後更新：2026年4月
      </footer>
    </div>
  );
}
