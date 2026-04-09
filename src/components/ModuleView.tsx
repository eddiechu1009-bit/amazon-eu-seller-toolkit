import { Module } from '../data/types';
import TaskCard from './TaskCard';

interface Props {
  module: Module;
  checked: Set<string>;
  onToggle: (id: string) => void;
}

export default function ModuleView({ module, checked, onToggle }: Props) {
  const doneCount = module.items.filter((item) => checked.has(item.id)).length;
  const totalCount = module.items.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* Module header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-amazon-dark flex items-center gap-2">
          <span className="text-2xl">{module.icon}</span>
          {module.title}
        </h2>
        <p className="text-gray-500 text-sm mt-1">{module.description}</p>
      </div>

      {/* Module progress */}
      <div className="mb-6 bg-white rounded-xl p-4 shadow-sm animate-fadeIn">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-700">模組進度</span>
          <span className="text-sm text-gray-500">
            {doneCount}/{totalCount} 項完成 ({progress}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-amazon-orange to-yellow-400 h-3 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {progress === 100 && (
          <p className="text-sm text-green-600 font-semibold mt-2 text-center animate-fadeInScale">
            🎉 此模組已全部完成！
          </p>
        )}
      </div>

      {/* Task cards */}
      <div className="space-y-4">
        {module.items.map((item) => (
          <TaskCard key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => onToggle(item.id)} />
        ))}
      </div>
    </div>
  );
}
