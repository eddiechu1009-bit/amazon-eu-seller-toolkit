import { ModuleId } from '../data/types';
import { allModules } from '../data/modules';

interface Props {
  activeTab: ModuleId;
  onTabChange: (tab: ModuleId) => void;
  completedCounts: Record<string, number>;
  totalCounts: Record<string, number>;
}

export default function TabNav({ activeTab, onTabChange, completedCounts, totalCounts }: Props) {
  return (
    <nav className="bg-white border-b sticky top-[52px] z-40 overflow-x-auto shadow-sm" role="tablist">
      <div className="max-w-6xl mx-auto flex min-w-max">
        {allModules.map((mod) => {
          const done = completedCounts[mod.id] || 0;
          const total = totalCounts[mod.id] || 0;
          const allDone = total > 0 && done === total;
          return (
            <button
              key={mod.id}
              role="tab"
              aria-selected={activeTab === mod.id}
              onClick={() => onTabChange(mod.id as ModuleId)}
              className={`flex-1 px-3 py-3 text-center transition-all duration-200 border-b-3 min-w-[120px] ${
                activeTab === mod.id
                  ? 'border-amazon-orange text-amazon-dark font-semibold bg-orange-50/50'
                  : allDone
                  ? 'border-green-400 text-green-700 bg-green-50/30'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg mr-1">{allDone ? '✅' : mod.icon}</span>
              <span className="text-sm">{mod.title}</span>
              {total > 0 && (
                <div className={`text-xs mt-0.5 ${allDone ? 'text-green-500 font-medium' : 'text-gray-400'}`}>
                  {done}/{total}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
