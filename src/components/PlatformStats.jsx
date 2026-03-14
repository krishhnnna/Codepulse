import { useData } from '../context/DataContext';
import { PlatformIcon, PLATFORMS } from '../utils/platformConfig';

/* ── Multi-segment donut chart ──
   segments = [{ value, color }, …]
   total    = denominator (sum or totalQuestions)
   label    = center text                                      */
function Donut({ segments, total, label, size = 80, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = total > 0 ? total : 1;

  // build cumulative offsets so segments sit end-to-end
  let accumulated = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / safeTotal) * circumference;
      const gap = 2;                           // small gap between arcs
      const dashLen = Math.max(len - gap, 1);  // visible portion minus gap
      const arc = {
        color: s.color,
        dasharray: `${dashLen} ${circumference - dashLen}`,
        offset: -(accumulated + gap / 2), // rotate to correct start
      };
      accumulated += len;
      return arc;
    });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* background track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth}
          className="stroke-zinc-100 dark:stroke-zinc-800" />
        {/* coloured arcs */}
        {arcs.map((a, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
            strokeWidth={strokeWidth} stroke={a.color}
            strokeDasharray={a.dasharray} strokeDashoffset={a.offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }} />
        ))}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="stat-number text-lg font-bold text-zinc-900 dark:text-white">{label}</span>
      </div>
    </div>
  );
}

/* ── Stat row for donut breakdown ── */
function StatRow({ label, value, color, icon }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon || <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <span className="stat-number text-xs font-semibold text-zinc-900 dark:text-white">{value}</span>
    </div>
  );
}

/* ── Codeforces rank colors ── */
const cfRankColors = {
  'Newbie': '#808080', 'Pupil': '#008000', 'Specialist': '#03A89E',
  'Expert': '#0000FF', 'Candidate Master': '#AA00AA',
  'Master': '#FF8C00', 'International Master': '#FF8C00',
  'Grandmaster': '#FF0000', 'International Grandmaster': '#FF0000',
  'Legendary Grandmaster': '#FF0000',
};

/* ── LeetCode badge color from API badge name ── */
const lcBadgeColors = {
  'Knight': '#FF8C00',
  'Guardian': '#E8403A',
};

function lcBadge(badgeName) {
  if (!badgeName) return null;
  return { title: badgeName, color: lcBadgeColors[badgeName] || '#6366f1' };
}

/* ── AtCoder color rank from rating ── */
function acBadge(rating) {
  if (rating >= 2800) return { title: 'Red',    color: '#FF0000' };
  if (rating >= 2400) return { title: 'Orange', color: '#FF8000' };
  if (rating >= 2000) return { title: 'Yellow', color: '#C0C000' };
  if (rating >= 1600) return { title: 'Blue',   color: '#0000FF' };
  if (rating >= 1200) return { title: 'Cyan',   color: '#00C0C0' };
  if (rating >= 800)  return { title: 'Green',  color: '#008000' };
  if (rating >= 400)  return { title: 'Brown',  color: '#804000' };
  if (rating > 0)     return { title: 'Gray',   color: '#808080' };
  return null;
}

/* ── Ranking item for each platform ── */
function RankingItem({ platform, rating, maxRating, rank, stars, badge }) {
  const platformKey = platform.toLowerCase();

  // Determine badge color
  let badgeColor = null;
  let badgeLabel = null;

  if (badge) {
    badgeColor = badge.color;
    badgeLabel = badge.title;
  } else if (rank && stars === undefined) {
    // Codeforces — use rank name for color lookup
    badgeColor = cfRankColors[rank] || '#808080';
    badgeLabel = rank;
  }

  return (
    <div className="text-center py-3">
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <PlatformIcon platform={platformKey} size={14} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{platform}</span>
      </div>
      {stars > 0 && (
        <div className="flex items-center justify-center gap-0.5 mb-1">
          {Array.from({ length: stars }).map((_, i) => (
            <span key={i} className="text-amber-400 text-sm">★</span>
          ))}
        </div>
      )}
      {badgeLabel && !stars && (
        <div className="mb-1">
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
            style={{ color: badgeColor, backgroundColor: badgeColor + '18' }}
          >
            {badgeLabel}
          </span>
        </div>
      )}
      <div className="stat-number text-2xl font-extrabold" style={{ color: badgeColor || undefined }}>
        {rating}
      </div>
      {maxRating > 0 && (
        <div className="text-[11px] text-zinc-400 mt-0.5">(max: {maxRating})</div>
      )}
    </div>
  );
}

export default function PlatformStats() {
  const { platforms, loading } = useData();

  const lc = platforms.leetcode;
  const cf = platforms.codeforces;
  const cc = platforms.codechef;
  const ac = platforms.atcoder;

  /* CP aggregation */
  const cpPlatforms = [
    cf && { key: 'codeforces', name: 'Codeforces', solved: cf.totalSolved, color: PLATFORMS.codeforces.color },
    cc && { key: 'codechef', name: 'CodeChef', solved: cc.totalSolved, color: PLATFORMS.codechef.color },
    ac && { key: 'atcoder', name: 'AtCoder', solved: ac.totalSolved, color: PLATFORMS.atcoder.color },
  ].filter(Boolean);
  const cpTotal = cpPlatforms.reduce((s, p) => s + p.solved, 0);

  /* Rating items */
  const ratingItems = [
    lc && lc.contestRating > 0 && { platform: 'LEETCODE', rating: Math.round(lc.contestRating), maxRating: null, badge: lcBadge(lc.contestBadge) },
    cf && { platform: 'CODEFORCES', rating: cf.rating, maxRating: cf.maxRating, rank: cf.rank ? cf.rank.charAt(0).toUpperCase() + cf.rank.slice(1) : '' },
    cc && { platform: 'CODECHEF', rating: cc.rating, maxRating: cc.maxRating, stars: cc.stars },
    ac && ac.rating > 0 && { platform: 'ATCODER', rating: ac.rating, maxRating: ac.maxRating, badge: acBadge(ac.rating) },
  ].filter(Boolean);

  const hasAnything = lc || cf || cc || ac;
  if (!hasAnything && !loading) return null;

  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2 mb-4" />
            <div className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Problems Solved ── */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-5">Problems Solved</h3>

        {/* LeetCode — DSA */}
        {lc && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">DSA</div>
            <div className="flex items-center gap-5">
              <Donut
                segments={[
                  { value: lc.easySolved, color: '#00b8a3' },
                  { value: lc.mediumSolved, color: '#ffc01e' },
                  { value: lc.hardSolved, color: '#ff375f' },
                ]}
                total={lc.totalSolved}
                label={lc.totalSolved}
                size={80}
              />
              <div className="flex-1 space-y-2">
                <StatRow label="Easy" value={lc.easySolved} color="#00b8a3" />
                <StatRow label="Medium" value={lc.mediumSolved} color="#ffc01e" />
                <StatRow label="Hard" value={lc.hardSolved} color="#ff375f" />
              </div>
            </div>
          </div>
        )}

        {/* Competitive Programming */}
        {cpPlatforms.length > 0 && (
          <div className={lc ? 'mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800' : ''}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Competitive Programming
            </div>
            <div className="flex items-center gap-5">
              <Donut
                segments={cpPlatforms.map((p) => ({ value: p.solved, color: p.color }))}
                total={cpTotal || 1}
                label={cpTotal}
                size={80}
              />
              <div className="flex-1 space-y-2">
                {cpPlatforms.map((p) => (
                  <StatRow key={p.name} label={p.name} value={p.solved} color={p.color} icon={<PlatformIcon platform={p.key} size={12} />} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Contest Rankings ── */}
      {ratingItems.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">Contest Rankings</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {ratingItems.map((item) => (
              <RankingItem key={item.platform} {...item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
