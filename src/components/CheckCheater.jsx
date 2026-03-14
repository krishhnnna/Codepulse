import { useState, useMemo } from 'react';
import { fetchCheaterCheck } from '../services/api';
import { PlatformIcon } from '../utils/platformConfig';

/* ───────────────────────────────────────────────
   Platform config — single source of truth
   ─────────────────────────────────────────────── */
const PLATFORMS = [
  { key: 'codeforces', label: 'Codeforces', placeholder: 'tourist', accent: '#318CE7' },
  { key: 'leetcode',   label: 'LeetCode',   placeholder: 'neal_wu', accent: '#F89F1B' },
  { key: 'codechef',   label: 'CodeChef',   placeholder: 'admin',   accent: '#5B4638' },
];

/* ───────────────────────────────────────────────
   Normalise platform-specific response shapes
   into a uniform { total, flagged[], stats[] }
   ─────────────────────────────────────────────── */
function normalise(key, raw) {
  if (!raw || raw.error) return null;

  const flags = [];
  const stats = [];

  if (key === 'codeforces') {
    const plagiarism = raw.skippedContests || [];
    const revoked    = raw.ghostContests || [];
    const anomalies  = raw.anomalies || [];
    const total      = raw.totalRatedContests || 0;

    stats.push({ label: 'Rated Contests', value: total, color: '#318CE7' });
    stats.push({ label: 'Plagiarism Detected', value: plagiarism.length, color: '#ef4444' });
    stats.push({ label: 'Participation Revoked', value: revoked.length, color: '#f59e0b' });
    if (anomalies.length) stats.push({ label: 'Rating Anomalies', value: anomalies.length, color: '#f97316' });

    plagiarism.forEach(c => flags.push({ ...c, tag: 'Plagiarism', tagColor: '#ef4444' }));
    revoked.forEach(c    => flags.push({ ...c, tag: 'Revoked',    tagColor: '#f59e0b' }));
    anomalies.forEach(c  => flags.push({ ...c, tag: `${(c.ratingChange || 0) > 0 ? '+' : ''}${c.ratingChange || 0}`, tagColor: '#f97316' }));

    return {
      total,
      clean: plagiarism.length + revoked.length + anomalies.length,
      segments: [
        { value: total - plagiarism.length - revoked.length, color: '#10b981' },
        { value: plagiarism.length, color: '#ef4444' },
        { value: revoked.length, color: '#f59e0b' },
      ],
      stats, flags,
    };
  }

  if (key === 'leetcode') {
    const penalized  = raw.penalizedContests || [];
    const skipped    = raw.skippedContests || [];
    const anomalies  = raw.anomalies || [];
    const total      = raw.totalContests || 0;
    const attended   = raw.attendedCount || 0;

    stats.push({ label: 'Total Contests', value: total, color: '#F89F1B' });
    stats.push({ label: 'Attended', value: attended, color: '#10b981' });
    stats.push({ label: 'Plagiarism Detected', value: penalized.length, color: '#ef4444' });
    if (skipped.length) stats.push({ label: 'Skipped', value: skipped.length, color: '#f59e0b' });
    if (anomalies.length) stats.push({ label: 'Rating Anomalies', value: anomalies.length, color: '#f97316' });

    penalized.forEach(c => flags.push({ ...c, tag: 'Plagiarism', tagColor: '#ef4444' }));
    skipped.forEach(c   => flags.push({ ...c, tag: 'Skipped',    tagColor: '#f59e0b' }));
    anomalies.forEach(c => flags.push({ ...c, tag: `${(c.ratingChange || 0) > 0 ? '+' : ''}${c.ratingChange || 0}`, tagColor: '#f97316' }));

    return {
      total,
      clean: penalized.length + skipped.length + anomalies.length,
      segments: [
        { value: attended - penalized.length, color: '#10b981' },
        { value: penalized.length, color: '#ef4444' },
        { value: skipped.length, color: '#f59e0b' },
      ],
      stats, flags,
    };
  }

  if (key === 'codechef') {
    const penalized = raw.penalizedContests || [];
    const total     = raw.totalContests || 0;

    stats.push({ label: 'Total Contests', value: total, color: '#5B4638' });
    stats.push({ label: 'Plagiarism Detected', value: penalized.length, color: '#ef4444' });

    penalized.forEach(c => flags.push({ ...c, tag: 'Plagiarism', tagColor: '#ef4444' }));

    return {
      total,
      clean: penalized.length,
      segments: [
        { value: total - penalized.length, color: '#10b981' },
        { value: penalized.length, color: '#ef4444' },
      ],
      stats, flags,
    };
  }

  return null;
}


/* ───────────────────────────────────────────────
   Shared primitives
   ─────────────────────────────────────────────── */

function Donut({ segments, total, label, size = 68, strokeWidth = 6 }) {
  const r = (size - strokeWidth) / 2;
  const C = 2 * Math.PI * r;
  const safe = total > 0 ? total : 1;
  let acc = 0;
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const len = (s.value / safe) * C;
    const gap = 2;
    const dash = Math.max(len - gap, 1);
    const arc = { color: s.color, da: `${dash} ${C - dash}`, off: -(acc + gap / 2) };
    acc += len;
    return arc;
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth}
          className="stroke-zinc-100 dark:stroke-zinc-800" />
        {arcs.map((a, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
            strokeWidth={strokeWidth} stroke={a.color}
            strokeDasharray={a.da} strokeDashoffset={a.off}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray .6s ease, stroke-dashoffset .6s ease' }} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="stat-number text-sm font-bold text-zinc-900 dark:text-white">{label}</span>
      </div>
    </div>
  );
}

const Spin = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);


/* ───────────────────────────────────────────────
   Generic platform result card (replaces
   CFResults + LCResults + CCResults)
   ─────────────────────────────────────────────── */

function PlatformResult({ platformKey, label, data }) {
  const norm = useMemo(() => normalise(platformKey, data), [platformKey, data]);
  if (!norm) return null;

  const isClean = norm.clean === 0;

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <PlatformIcon platform={platformKey} size={20} />
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">{label}</span>
        <span className={`ml-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
          isClean
            ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
            : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
        }`}>
          {isClean ? 'Clean' : `${norm.clean} Issue${norm.clean !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Donut + stat rows */}
      <div className="flex items-center gap-5">
        <Donut segments={norm.segments} total={norm.total || 1} label={norm.total} />
        <div className="flex-1 space-y-1.5">
          {norm.stats.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</span>
              </div>
              <span className="stat-number text-xs font-semibold text-zinc-900 dark:text-white">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Flagged contests list */}
      {norm.flags.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Flagged Contests
          </div>
          <div className="space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800 max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {norm.flags.map((f, i) => {
              const date = f.timestamp
                ? new Date(f.timestamp * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
              return (
                <div key={i} className="flex items-center gap-2.5 py-2.5">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: f.tagColor, backgroundColor: f.tagColor + '14' }}
                  >
                    {f.tag}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 truncate block">
                      {f.contestName}
                    </span>
                    {f.reason && (
                      <span className="text-[11px] text-zinc-400 truncate block">{f.reason}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {f.ratingChange !== undefined && (
                      <span className={`stat-number text-[12px] font-bold ${f.ratingChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {f.ratingChange > 0 ? '+' : ''}{f.ratingChange}
                      </span>
                    )}
                    {date && <span className="text-[11px] text-zinc-400 tabular-nums">{date}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


/* ───────────────────────────────────────────────
   Summary bar
   ─────────────────────────────────────────────── */

function Summary({ results }) {
  const entries = PLATFORMS
    .filter(p => results[p.key] && !results[p.key].error)
    .map(p => {
      const n = normalise(p.key, results[p.key]);
      return { ...p, issues: n ? n.clean : 0, total: n ? n.total : 0 };
    });

  if (!entries.length) return null;

  const totalIssues = entries.reduce((s, e) => s + e.issues, 0);
  const allClean = totalIssues === 0;

  return (
    <div className={`card px-5 py-4 flex flex-wrap items-center gap-3 sm:gap-4 ${
      allClean
        ? 'border-emerald-200/60 dark:border-emerald-500/10'
        : 'border-red-200/60 dark:border-red-500/10'
    }`}>
      {/* Verdict icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        allClean
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
      }`}>
        {allClean ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        )}
      </div>

      {/* Verdict text */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${
          allClean ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
        }`}>
          {allClean ? 'No issues found' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} detected`}
        </div>
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          {entries.map(e => e.label).join(', ')} analysed
        </div>
      </div>

      {/* Per-platform pills */}
      <div className="flex items-center gap-1.5">
        {entries.map(e => (
          <div key={e.key} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${
            e.issues === 0
              ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
              : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
          }`}>
            <PlatformIcon platform={e.key} size={12} />
            {e.issues === 0 ? 'OK' : e.issues}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════
   Main
   ═══════════════════════════════════════ */

export default function CheckCheater() {
  const [handles, setHandles] = useState({ codeforces: '', leetcode: '', codechef: '' });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  function setHandle(key, val) {
    setHandles(prev => ({ ...prev, [key]: val }));
  }

  async function handleCheck() {
    const filled = Object.values(handles).some(h => h.trim());
    if (!filled) { setError('Enter at least one handle'); return; }
    setError('');
    setLoading(true);
    setResults(null);
    try {
      const payload = {};
      PLATFORMS.forEach(p => { if (handles[p.key].trim()) payload[p.key] = handles[p.key].trim(); });
      const data = await fetchCheaterCheck(payload);
      if (!data) setError('Failed to fetch — check handles and try again.');
      else setResults(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) { if (e.key === 'Enter') handleCheck(); }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ── Input card ── */}
      <div className="card p-5">
        <div className="space-y-3">
          {PLATFORMS.map(p => (
            <div key={p.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <PlatformIcon platform={p.key} size={16} />
                <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">{p.label}</span>
              </div>
              <input
                type="text"
                value={handles[p.key]}
                onChange={e => setHandle(p.key, e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={p.placeholder}
                className="flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-700/50 rounded-lg text-[13px] text-zinc-800 dark:text-zinc-200 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 focus:border-zinc-300 dark:focus:border-zinc-600 transition-all"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-[12px] text-red-500 font-medium mt-3">{error}</p>}

        <button
          onClick={handleCheck}
          disabled={loading}
          className="w-full mt-4 py-2.5 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-zinc-900 text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <><Spin /> Analysing…</> : 'Analyse'}
        </button>
      </div>

      {/* ── Results ── */}
      {results && (
        <>
          <Summary results={results} />
          {PLATFORMS.map(p =>
            results[p.key] ? (
              <PlatformResult key={p.key} platformKey={p.key} label={p.label} data={results[p.key]} />
            ) : null
          )}
        </>
      )}
    </div>
  );
}
