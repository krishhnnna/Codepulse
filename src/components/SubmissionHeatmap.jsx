import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

const CELL = 13; // px
const GAP = 3;   // px

function getColor(count, dark) {
  if (count === 0) return dark ? '#1c1c20' : '#ebedf0';
  if (count <= 2) return dark ? '#0e4429' : '#9be9a8';
  if (count <= 4) return dark ? '#006d32' : '#40c463';
  if (count <= 6) return dark ? '#26a641' : '#30a14e';
  return dark ? '#39d353' : '#216e39';
}

export default function SubmissionHeatmap() {
  const { darkMode } = useTheme();
  const { heatmapData: rawHeatmap, loading } = useData();
  const heatmapData = rawHeatmap.length > 0 ? rawHeatmap : [];
  const [tooltip, setTooltip] = useState(null);

  const weeks = useMemo(() => {
    const result = [];
    let week = [];
    if (heatmapData.length > 0) {
      const firstDay = new Date(heatmapData[0].date).getDay();
      for (let i = 0; i < firstDay; i++) week.push(null);
    }
    heatmapData.forEach((day) => {
      if (week.length === 7) { result.push(week); week = []; }
      week.push(day);
    });
    if (week.length > 0) result.push(week);
    return result;
  }, [heatmapData]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    let lastYear = -1;
    weeks.forEach((w, i) => {
      const d = w.find((x) => x !== null);
      if (d) {
        const dt = new Date(d.date);
        const m = dt.getMonth();
        const y = dt.getFullYear();
        if (m !== lastMonth) {
          // Show year on first label or when year changes
          const showYear = lastYear === -1 || y !== lastYear;
          labels.push({
            month: showYear ? `${MONTHS[m]} '${String(y).slice(2)}` : MONTHS[m],
            weekIndex: i,
          });
          lastMonth = m;
          lastYear = y;
        }
      }
    });
    return labels;
  }, [weeks]);

  const total = heatmapData.reduce((s, d) => s + d.count, 0);
  const active = heatmapData.filter((d) => d.count > 0).length;

  // Current streak: consecutive days with submissions ending today (or yesterday)
  const currentStreak = useMemo(() => {
    let count = 0;
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) count++;
      else if (count > 0) break; // streak broken
      // Allow today to be 0 (day not over yet) — check from yesterday
      else if (i === heatmapData.length - 1) continue;
      else break;
    }
    return count;
  }, [heatmapData]);

  // Max streak
  const maxStreak = useMemo(() => {
    let max = 0, cur = 0;
    heatmapData.forEach((d) => { if (d.count > 0) { cur++; max = Math.max(max, cur); } else cur = 0; });
    return max;
  }, [heatmapData]);

  if (heatmapData.length === 0 && !loading) return null;

  return (
    <div className="card p-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Submission Activity</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Total Submissions</span>
            <span className="stat-number font-semibold text-zinc-900 dark:text-white">{total}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Active Days</span>
            <span className="stat-number font-semibold text-zinc-900 dark:text-white">{active}<span className="text-zinc-400 font-normal">/365</span></span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Current Streak</span>
            <span className="stat-number font-semibold text-emerald-500">{currentStreak}d</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-400">Max Streak</span>
            <span className="stat-number font-semibold text-zinc-900 dark:text-white">{maxStreak}d</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-block relative min-w-fit">
          {/* Month labels */}
          <div className="flex ml-8 mb-1.5">
            {monthLabels.map((l, i) => (
              <div
                key={i}
                className="text-[10px] text-zinc-400 dark:text-zinc-600"
                style={{ position: 'absolute', left: `${l.weekIndex * (CELL + GAP) + 32}px` }}
              >
                {l.month}
              </div>
            ))}
          </div>

          <div className="flex mt-5" style={{ gap: `${GAP}px` }}>
            {/* Day labels */}
            <div className="flex flex-col mr-1.5" style={{ gap: `${GAP}px` }}>
              {DAYS.map((day, i) => (
                <div
                  key={i}
                  className="text-[9px] text-zinc-400 dark:text-zinc-600 flex items-center justify-end pr-0.5"
                  style={{ width: 20, height: CELL }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: `${GAP}px` }}>
                {w.map((day, di) => (
                  <div
                    key={di}
                    className="heatmap-cell cursor-pointer"
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: day ? getColor(day.count, darkMode) : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (day) {
                        const r = e.target.getBoundingClientRect();
                        setTooltip({ count: day.count, date: day.date, x: r.left + r.width / 2, y: r.top - 8 });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-4">
        <span className="text-[10px] text-zinc-400 mr-0.5">Less</span>
        {[0, 1, 3, 5, 8].map((c) => (
          <div
            key={c}
            className="rounded-sm"
            style={{ width: CELL, height: CELL, backgroundColor: getColor(c, darkMode) }}
          />
        ))}
        <span className="text-[10px] text-zinc-400 ml-0.5">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-zinc-900 dark:bg-zinc-700 text-white rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg text-[11px]"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <span className="font-semibold">{tooltip.count}</span>
          <span className="text-zinc-300 ml-1">submissions on {tooltip.date}</span>
        </div>
      )}
    </div>
  );
}
