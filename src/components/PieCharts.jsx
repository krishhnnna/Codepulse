import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';

function ChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
          <span className="text-xs font-medium text-zinc-900 dark:text-white">{payload[0].name}</span>
        </div>
        <p className="text-[11px] text-zinc-500 ml-4">{payload[0].value} ({payload[0].payload.pct}%)</p>
      </div>
    );
  }
  return null;
}

function ChartCard({ title, data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const enriched = data.map((d) => ({ ...d, pct: Math.round((d.value / total) * 100) }));

  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">{title}</h3>

      <div className="flex items-center gap-5">
        {/* Donut */}
        <div className="w-32 h-32 shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={enriched}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                cornerRadius={2}
              >
                {enriched.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="stat-number text-base font-bold text-zinc-900 dark:text-white">{total}</span>
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Total</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {enriched.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="stat-number text-xs font-semibold text-zinc-900 dark:text-white">{item.value}</span>
                <span className="text-[11px] text-zinc-400 w-9 text-right">{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PieCharts() {
  const { platforms, loading } = useData();

  // Build difficulty data from LeetCode if available
  const lc = platforms.leetcode;
  const difficultyStats = lc ? [
    { name: 'Easy', value: lc.easySolved || 0, color: '#00b8a3' },
    { name: 'Medium', value: lc.mediumSolved || 0, color: '#ffc01e' },
    { name: 'Hard', value: lc.hardSolved || 0, color: '#ff375f' },
  ] : [];

  // Language stats aren't available from APIs — show difficulty only if we have LC data
  if (!lc && !loading) return null;

  const hasData = difficultyStats.some((d) => d.value > 0);
  if (!hasData && !loading) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartCard title="Difficulty Breakdown (LeetCode)" data={difficultyStats} />
    </div>
  );
}
