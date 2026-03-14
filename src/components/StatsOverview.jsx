import { useData } from '../context/DataContext';
import { PLATFORMS, PlatformIcon } from '../utils/platformConfig';

const platformColors = Object.fromEntries(
  Object.entries(PLATFORMS).map(([k, v]) => [k, v.color])
);

const platformNames = Object.fromEntries(
  Object.entries(PLATFORMS).map(([k, v]) => [k, v.name])
);

export default function StatsOverview() {
  const { platforms, aggregateStats, heatmapData } = useData();

  const activeDays = heatmapData.filter((d) => d.count > 0).length;

  /* Contest breakdown per platform */
  const contestBreakdown = Object.entries(platforms)
    .filter(([, v]) => v && (v.contestsParticipated || v.contestsAttended))
    .map(([k, v]) => ({
      key: k,
      name: platformNames[k] || k,
      count: v.contestsParticipated || v.contestsAttended || 0,
      color: platformColors[k] || '#6366f1',
    }));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Questions */}
      <div className="card p-5 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Total Questions
        </span>
        <span className="stat-number text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
          {aggregateStats.totalSolved.toLocaleString()}
        </span>
      </div>

      {/* Total Active Days */}
      <div className="card p-5 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Total Active Days
        </span>
        <span className="stat-number text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
          {activeDays.toLocaleString()}
        </span>
      </div>

      {/* Total Contests */}
      <div className="card p-5 col-span-2 lg:col-span-1">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Total Contests
            </span>
            <div className="stat-number text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
              {aggregateStats.totalContests}
            </div>
          </div>
          <div className="space-y-1.5 text-right">
            {contestBreakdown.map((c) => (
              <div key={c.key} className="flex items-center justify-end gap-2">
                <PlatformIcon platform={c.key} size={12} />
                <span className="text-[11px] text-zinc-500">{c.name}</span>
                <span
                  className="stat-number text-[11px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: c.color, backgroundColor: c.color + '14' }}
                >
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
