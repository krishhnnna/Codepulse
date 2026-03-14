import { useState, useEffect, useMemo } from 'react';
import { PlatformIcon } from '../utils/platformConfig';
import { fetchUpcomingContests } from '../services/api';

const PLATFORM_COLORS = {
  leetcode: '#F89F1B',
  codeforces: '#318CE7',
  codechef: '#5B4638',
  atcoder: '#1ABC9C',
};

const PLATFORM_NAMES = {
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  codechef: 'CodeChef',
  atcoder: 'AtCoder',
};

/* ── Countdown hook ── */
function useCountdown(targetTs) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = targetTs - now;
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };

  return {
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    mins: Math.floor((diff % 3600) / 60),
    secs: diff % 60,
    expired: false,
  };
}

/* ── Format duration in seconds to human readable ── */
function formatDuration(secs) {
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

/* ── Single contest card ── */
function ContestCard({ contest }) {
  const { platform, name, startTime, duration, url } = contest;
  const color = PLATFORM_COLORS[platform] || '#6366F1';
  const { days, hours, mins, secs, expired } = useCountdown(startTime);

  const startDate = new Date(startTime * 1000);
  const dateStr = startDate.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = startDate.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });

  /* Build platform-specific register URL */
  function getRegisterUrl() {
    // Codeforces: registration URL is /contestRegistration/{id}
    if (platform === 'codeforces') {
      const id = url.split('/').pop();
      return `https://codeforces.com/contestRegistration/${id}`;
    }
    // LeetCode: contest page has register
    if (platform === 'leetcode') return url;
    // CodeChef: contest page has register
    if (platform === 'codechef') return url;
    // AtCoder: contest page has register
    if (platform === 'atcoder') return url;
    return url;
  }

  return (
    <div className="group relative bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">
      {/* Color accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: color }} />

      <div className="pl-3">
        {/* Top: Platform + Duration */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={platform} size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>
              {PLATFORM_NAMES[platform]}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Contest name */}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-[14px] font-semibold text-zinc-900 dark:text-white leading-tight hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors line-clamp-2"
        >
          {name}
        </a>

        {/* Date + Time */}
        <div className="flex items-center gap-1.5 mt-2">
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
            {dateStr} &middot; {timeStr}
          </span>
        </div>

        {/* Countdown + Register link */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/50">
          {/* Countdown */}
          {!expired ? (
            <div className="flex items-center gap-1">
              {days > 0 && (
                <CountdownUnit value={days} label="d" />
              )}
              <CountdownUnit value={hours} label="h" />
              <CountdownUnit value={mins} label="m" />
              <CountdownUnit value={secs} label="s" />
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Live Now</span>
          )}

          {/* Register → redirects to platform */}
          <a
            href={getRegisterUrl()}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-semibold px-3 py-1 rounded-lg transition-all bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Register
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── Countdown unit ── */
function CountdownUnit({ value, label }) {
  return (
    <span className="inline-flex items-baseline gap-[1px]">
      <span className="stat-number text-[13px] font-bold text-zinc-900 dark:text-white">{String(value).padStart(2, '0')}</span>
      <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
    </span>
  );
}

/* ── Filter tabs ── */
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'leetcode', label: 'LC' },
  { key: 'codeforces', label: 'CF' },
  { key: 'codechef', label: 'CC' },
  { key: 'atcoder', label: 'AC' },
];

export default function UpcomingContests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialDone, setInitialDone] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load(isInitial = false) {
      setLoading(true);
      const data = await fetchUpcomingContests();
      if (!cancelled) {
        if (data) setContests(data);
        setLoading(false);
        if (isInitial) setInitialDone(true);
      }
    }
    load(true);
    // Refresh every 5 minutes
    const id = setInterval(() => load(false), 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return contests;
    return contests.filter((c) => c.platform === filter);
  }, [contests, filter]);

  const availablePlatforms = useMemo(() => {
    const set = new Set(contests.map((c) => c.platform));
    return FILTERS.filter((f) => f.key === 'all' || set.has(f.key));
  }, [contests]);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Upcoming Contests</h2>
          <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>

        {/* Platform filter tabs */}
        {availablePlatforms.length > 1 && (
          <div className="flex items-center bg-zinc-100/80 dark:bg-zinc-800/60 rounded-lg p-0.5 gap-0.5">
            {availablePlatforms.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  filter === f.key
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading skeleton — show until first fetch completes */}
      {(!initialDone || (loading && contests.length === 0)) && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-20 mb-3" />
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-48 mb-2" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state — only after initial fetch done */}
      {initialDone && !loading && filtered.length === 0 && (
        <div className="text-center py-8">
          <svg className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <p className="text-sm text-zinc-400">No upcoming contests found</p>
        </div>
      )}

      {/* Contest list */}
      {filtered.length > 0 && (
        <div className="space-y-2.5">
          {filtered.map((c, i) => (
            <ContestCard key={`${c.platform}-${c.startTime}-${i}`} contest={c} />
          ))}
        </div>
      )}
    </div>
  );
}
