import { useState, useMemo, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Line,
  ComposedChart,
} from 'recharts';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { PlatformIcon } from '../utils/platformConfig';
import { fetchCFPrediction, fetchLCPrediction } from '../services/api';

const platforms = {
  leetcode: { name: 'LeetCode', color: '#F89F1B', gradient: ['#F89F1B', '#F97316'] },
  codeforces: { name: 'Codeforces', color: '#318CE7', gradient: ['#318CE7', '#6366F1'] },
  codechef: { name: 'CodeChef', color: '#5B4638', gradient: ['#78614F', '#5B4638'] },
  atcoder: { name: 'AtCoder', color: '#2D8CFF', gradient: ['#2D8CFF', '#6366F1'] },
};

// Rank threshold reference lines per platform
const rankLines = {
  codeforces: [
    { y: 1200, label: 'Pupil', color: '#008000' },
    { y: 1400, label: 'Specialist', color: '#03A89E' },
    { y: 1600, label: 'Expert', color: '#0000FF' },
    { y: 1900, label: 'CM', color: '#AA00AA' },
  ],
  leetcode: [
    { y: 1400, label: 'Guardian', color: '#7b61ff' },
    { y: 1600, label: 'Knight', color: '#f89f1b' },
    { y: 1800, label: 'Top 5%', color: '#ff6b6b' },
  ],
  codechef: [
    { y: 1400, label: '3★', color: '#1e7d22' },
    { y: 1600, label: '4★', color: '#684273' },
    { y: 1800, label: '5★', color: '#e7a41f' },
    { y: 2000, label: '6★', color: '#e74f1f' },
  ],
  atcoder: [
    { y: 800, label: 'Green', color: '#008000' },
    { y: 1200, label: 'Cyan', color: '#00C0C0' },
    { y: 1600, label: 'Blue', color: '#0000FF' },
  ],
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const change = d.change;
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const isPredicted = d.predicted;

  const rank = d.ranking || d.rank;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 shadow-xl min-w-[180px]">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-medium text-zinc-900 dark:text-white leading-tight flex-1">{d.contest}</p>
        {isPredicted && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded">
            Predicted
          </span>
        )}
      </div>
      <p className="text-[10px] text-zinc-400 mt-0.5">
        {new Date(d.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
        {rank ? ` · Rank #${rank.toLocaleString()}` : ''}
      </p>
      <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <span className={`stat-number text-base font-bold ${isPredicted ? 'text-amber-500' : 'text-zinc-900 dark:text-white'}`}>
          {d.rating}
        </span>
        {!isNeutral && (
          <span className={`stat-number text-xs font-bold ${
            isPositive ? 'text-emerald-500' : 'text-red-500'
          }`}>
            {isPositive ? '▲' : '▼'} {Math.abs(change)}
          </span>
        )}
      </div>
    </div>
  );
}

function CustomDot({ cx, cy, payload, color }) {
  if (!cx || !cy) return null;

  // Predicted point: pulsing hollow circle
  if (payload.predicted) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 2">
          <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r={2.5} fill="#f59e0b" />
      </g>
    );
  }

  const isUp = payload.change > 0;
  const isDown = payload.change < 0;
  const dotColor = isUp ? '#10b981' : isDown ? '#ef4444' : color;
  return (
    <circle cx={cx} cy={cy} r={3} fill={dotColor} stroke="none" />
  );
}

export default function ContestRatingGraph() {
  const { contestData, handles, loading } = useData();
  const { darkMode } = useTheme();

  // Rating prediction state
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  // Only show platforms that have handles set
  const availablePlatforms = Object.keys(platforms).filter((k) => handles[k]);
  const [selected, setSelected] = useState(availablePlatforms[0] || 'leetcode');

  const rawData = contestData[selected] || [];
  const config = platforms[selected];
  const grid = darkMode ? '#27272a' : '#f4f4f5';
  const text = darkMode ? '#52525b' : '#a1a1aa';
  const refLines = rankLines[selected] || [];

  // Fetch prediction when a supported platform tab is active
  useEffect(() => {
    const predictable = { codeforces: fetchCFPrediction, leetcode: fetchLCPrediction };
    const fetcher = predictable[selected];
    const handle = handles[selected];

    if (!fetcher || !handle || rawData.length === 0) {
      setPrediction(null);
      return;
    }

    let cancelled = false;
    setPrediction(null);  // Clear old prediction immediately on switch
    setPredLoading(true);
    fetcher(handle)
      .then((res) => {
        if (!cancelled && res?.prediction) {
          setPrediction(res.prediction);
        } else if (!cancelled) {
          setPrediction(null);
        }
      })
      .catch(() => { if (!cancelled) setPrediction(null); })
      .finally(() => { if (!cancelled) setPredLoading(false); });

    return () => { cancelled = true; };
  }, [selected, handles, rawData.length]);

  // Merge prediction into data
  const hasPrediction = !!prediction;
  const data = useMemo(() => {
    if (!prediction) return rawData;
    return [
      ...rawData,
      {
        date: new Date().toISOString().split('T')[0],
        rating: prediction.predicted_rating,
        change: prediction.predicted_change,
        contest: prediction.contest_name,
        predicted: true,
        rank: prediction.rank,
      },
    ];
  }, [rawData, prediction]);

  const { current, peak, contests, lastChange } = useMemo(() => {
    if (!rawData || rawData.length === 0) return { current: 0, peak: 0, contests: 0, lastChange: 0 };
    const ratings = rawData.map((d) => d.rating);
    return {
      current: ratings[ratings.length - 1],
      peak: Math.max(...ratings),
      contests: rawData.length,
      lastChange: rawData[rawData.length - 1].change,
    };
  }, [rawData]);

  // Y-axis domain: pad below min and above max (include prediction)
  const [yMin, yMax] = useMemo(() => {
    if (!data || data.length === 0) return [0, 2000];
    const ratings = data.map((d) => d.rating);
    const refYs = refLines.map((r) => r.y);
    const allVals = [...ratings, ...refYs];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const pad = Math.max(80, (max - min) * 0.15);
    return [Math.floor((min - pad) / 50) * 50, Math.ceil((max + pad) / 50) * 50];
  }, [data, refLines]);

  if (availablePlatforms.length === 0 && !loading) return null;

  return (
    <div className="card p-5">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Contest Rating</h2>
          {predLoading && (selected === 'codeforces' || selected === 'leetcode') && (
            <span className="text-[10px] text-zinc-400 animate-pulse">predicting...</span>
          )}
        </div>

        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 flex-wrap">
          {availablePlatforms.map((key) => ({ key, cfg: platforms[key] })).map(({ key, cfg }) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                selected === key
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <PlatformIcon platform={key} size={14} />
              {cfg.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 mb-5 grid-cols-2 sm:grid-cols-4">
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Current</div>
          <div className="stat-number text-xl font-bold text-zinc-900 dark:text-white">{current}</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Peak</div>
          <div className="stat-number text-xl font-bold text-emerald-600 dark:text-emerald-400">{peak}</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Contests</div>
          <div className="stat-number text-xl font-bold text-zinc-900 dark:text-white">{contests}</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Last</div>
          <div className={`stat-number text-xl font-bold ${
            lastChange > 0 ? 'text-emerald-500' : lastChange < 0 ? 'text-red-500' : 'text-zinc-900 dark:text-white'
          }`}>
            {lastChange > 0 ? '+' : ''}{lastChange}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer key={selected} width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${selected}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: text, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
              }}
              interval={Math.max(1, Math.floor(data.length / 7))}
              axisLine={{ stroke: grid }}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: text, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              tickCount={6}
            />
            {/* Rank threshold lines */}
            {refLines.map((rl) => (
              <ReferenceLine
                key={rl.label}
                y={rl.y}
                stroke={rl.color}
                strokeDasharray="6 4"
                strokeOpacity={darkMode ? 0.35 : 0.45}
                label={{
                  value: rl.label,
                  position: 'right',
                  fontSize: 9,
                  fill: rl.color,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  opacity: darkMode ? 0.7 : 0.8,
                }}
              />
            ))}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: config.color, strokeOpacity: 0.2, strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="rating"
              stroke={config.color}
              strokeWidth={2.5}
              fill={`url(#grad-${selected})`}
              dot={<CustomDot color={config.color} />}
              activeDot={{
                r: 5.5,
                strokeWidth: 2.5,
                fill: darkMode ? '#18181b' : '#ffffff',
                stroke: config.color,
              }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
