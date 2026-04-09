import { allModules } from '../data/modules';

interface Props {
  checked: Set<string>;
}

function DonutChart({ progress, size = 80 }: { progress: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#progressGradient)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF9900" />
            <stop offset="100%" stopColor="#FACC15" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-amazon-dark">{progress}%</span>
      </div>
    </div>
  );
}

export default function ProgressTracker({ checked }: Props) {
  const totalItems = allModules.reduce((sum, mod) => sum + mod.items.length, 0);
  const checkedCount = checked.size;
  const progress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm mb-6 animate-fadeIn">
      <div className="flex items-center gap-5">
        <DonutChart progress={progress} />
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">🎯 整體完成進度</span>
            <span className="text-sm text-gray-500">
              {checkedCount}/{totalItems} 項完成
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
          {/* Mini module progress */}
          <div className="flex gap-2 mt-3">
            {allModules.map((mod) => {
              const modDone = mod.items.filter((item) => checked.has(item.id)).length;
              const modTotal = mod.items.length;
              const modPct = modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 0;
              const allDone = modTotal > 0 && modDone === modTotal;
              return (
                <div key={mod.id} className="flex-1 min-w-0" title={`${mod.title}: ${modDone}/${modTotal}`}>
                  <div className="text-xs text-center mb-0.5">
                    {allDone ? '✅' : mod.icon}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        allDone ? 'bg-green-500' : 'bg-amazon-orange/70'
                      }`}
                      style={{ width: `${modPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {progress === 100 && (
        <p className="text-sm text-green-600 font-semibold mt-3 text-center animate-fadeInScale">
          🎉 恭喜！所有項目都已完成！
        </p>
      )}
    </div>
  );
}
