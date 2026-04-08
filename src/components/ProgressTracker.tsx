import { allModules } from '../data/modules';

interface Props {
  checked: Set<string>;
}

export default function ProgressTracker({ checked }: Props) {
  const totalItems = allModules.reduce((sum, mod) => sum + mod.items.length, 0);
  const checkedCount = checked.size;
  const progress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">🎯 整體完成進度</span>
        <span className="text-sm text-gray-500">
          {checkedCount}/{totalItems} 項完成 ({progress}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-gradient-to-r from-amazon-orange to-yellow-400 h-3 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {progress === 100 && (
        <p className="text-sm text-green-600 font-medium mt-2 text-center">
          🎉 恭喜！所有項目都已完成！
        </p>
      )}
    </div>
  );
}
