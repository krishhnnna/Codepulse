import { useState } from 'react';
import { useData } from '../context/DataContext';

/* ── Gradient palette for top topics ── */
const BAR_COLORS = [
  '#6366f1', '#818cf8', '#a78bfa', '#8b5cf6', '#7c3aed',
  '#6d28d9', '#5b21b6', '#4f46e5', '#4338ca', '#3730a3',
  '#6366f1', '#818cf8', '#a78bfa', '#8b5cf6', '#7c3aed',
];

export default function TopicStats() {
  const { topicData } = useData();
  const [expanded, setExpanded] = useState(false);

  if (!topicData) return null;

  const cfTags = topicData.codeforces || [];
  const lcTags = topicData.leetcode || [];

  if (!cfTags.length && !lcTags.length) return null;

  // Merge tags from both platforms
  const map = {};
  for (const t of cfTags) {
    const key = t.tagName.toLowerCase();
    map[key] = (map[key] || 0) + t.problemsSolved;
  }
  for (const t of lcTags) {
    const key = t.tagName.toLowerCase();
    map[key] = (map[key] || 0) + t.problemsSolved;
  }
  const allTopics = Object.entries(map)
    .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
    .sort((a, b) => b.count - a.count);

  if (!allTopics.length) return null;

  const SHOW = expanded ? 20 : 10;
  const displayTopics = allTopics.slice(0, SHOW);
  const maxCount = displayTopics[0].count;
  const totalSolved = allTopics.reduce((s, t) => s + t.count, 0);

  return (
    <div className="card p-5 mt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Topics Solved</h3>
        <span className="stat-number text-xs font-bold text-indigo-500">{allTopics.length} tags</span>
      </div>
      <p className="text-[10px] text-zinc-400 mb-4">Across all platforms</p>

      {/* Topic rows */}
      <div className="space-y-3">
        {displayTopics.map((t, i) => {
          const pct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
          return (
            <div key={t.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 truncate pr-2">
                  {t.name}
                </span>
                <span className="stat-number text-[11px] font-bold text-zinc-800 dark:text-zinc-200 shrink-0">
                  {t.count}
                </span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                    opacity: 1 - i * 0.03,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more / less */}
      {allTopics.length > 10 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 py-1.5 text-[10px] font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          {expanded ? 'Show less' : `+${allTopics.length - 10} more topics`}
        </button>
      )}
    </div>
  );
}
