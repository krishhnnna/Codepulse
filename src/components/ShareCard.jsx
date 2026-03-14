import { useRef, useState, useCallback, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS } from '../utils/platformConfig';

/* ── Inline SVG icon factories ── */
const PLATFORM_SVGS = {
  leetcode: (s) => <svg viewBox="0 0 24 24" width={s} height={s} fill="#F89F1B"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/></svg>,
  codeforces: (s) => <svg viewBox="0 0 24 24" width={s} height={s} fill="#318CE7"><path d="M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.673 21 0 20.328 0 19.5V9c0-.828.673-1.5 1.5-1.5h3zm9-4.5c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.827 0-1.5-.672-1.5-1.5v-15c0-.828.673-1.5 1.5-1.5h3zm9 7.5c.828 0 1.5.672 1.5 1.5v7.5c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V12c0-.828.672-1.5 1.5-1.5h3z"/></svg>,
  codechef: (s) => <svg viewBox="0 0 24 24" width={s} height={s} fill="#5B4638"><path d="M11.2574.0039c-.37.0101-.7353.041-1.1003.095C9.6164.153 9.0766.4236 8.482.694c-.757.3244-1.5147.6486-2.2176.7027-1.1896.3785-1.568.919-1.8925 1.3516 0 .054-.054.1079-.054.1079-.4325.865-.4873 1.73-.325 2.5952.1621.5407.3786 1.0282.5408 1.5148.3785 1.0274.7578 2.0007.92 3.1362.1622.3244.3235.7571.4316 1.1897.2704.8651.542 1.8383 1.353 2.5952l.0057-.0028c.0175.0183.0301.0387.0482.0568.0072-.0036.0141-.0063.0213-.0099l-.0213-.5849c.6489-.9733 1.5673-1.6221 2.865-1.8925.5195-.1093 1.081-.1497 1.6625-.1278a8.7733 8.7733 0 0 1 1.7988.2357c1.4599.3785 2.595 1.1358 2.6492 1.7846.0273.3549.0398.6952.0326 1.0364-.001.064-.0046.1285-.007.193l.1362.0682c.075-.0375.1424-.107.2059-.1902.0008-.001.002-.002.0028-.0028.0018-.0023.0039-.0061.0057-.0085.0396-.0536.0747-.1236.1107-.1931.0188-.0377.0372-.0866.0554-.1292.2048-.4622.362-1.1536.538-1.9635.0541-.2703.1092-.4864.1633-.7027.4326-.9733 1.0266-1.8382 1.6213-2.6492.9733-1.3518 1.8928-2.5962 1.7846-4.0561-1.784-3.4608-4.2718-4.0017-5.5695-4.272-.2163-.0541-.3233-.0539-.4856-.108-1.3382-.2433-2.4945-.3953-3.6046-.3648z"/></svg>,
  atcoder: (s) => <svg viewBox="0 0 24 24" width={s} height={s} fill="#1ABC9C"><path d="M12 1.5L2.5 21.5h4.3l1.5-3.8h7.4l1.5 3.8h4.3L12 1.5zm0 7.2l2.6 6.5H9.4L12 8.7z"/></svg>,
};

const SOCIAL_SVGS = {
  github: (s, c) => <svg viewBox="0 0 24 24" width={s} height={s} fill={c}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
  linkedin: (s, c) => <svg viewBox="0 0 24 24" width={s} height={s} fill={c}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  twitter: (s, c) => <svg viewBox="0 0 24 24" width={s} height={s} fill={c}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  portfolio: (s, c) => <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

/* ── Themes ── */
const THEMES = [
  { id: 'light', label: 'Light', bg: '#ffffff', cardBg: '#f5f5f5', text: '#1a1a1a', sub: '#6b7280', accent: '#e8885c', border: '#e5e7eb', iconColor: '#6b7280', barBg: '#e5e7eb' },
  { id: 'dark', label: 'Dark', bg: '#111111', cardBg: '#1a1a1a', text: '#ffffff', sub: '#9ca3af', accent: '#6366f1', border: '#2a2a2a', iconColor: '#9ca3af', barBg: '#2a2a2a' },
  { id: 'midnight', label: 'Midnight', bg: '#0f172a', cardBg: '#1e293b', text: '#f1f5f9', sub: '#94a3b8', accent: '#38bdf8', border: '#334155', iconColor: '#94a3b8', barBg: '#334155' },
  { id: 'purple', label: 'Purple', bg: '#1a0a2e', cardBg: '#261242', text: '#f5f3ff', sub: '#a78bfa', accent: '#a78bfa', border: '#3b1f6e', iconColor: '#a78bfa', barBg: '#3b1f6e' },
  { id: 'ocean', label: 'Ocean', bg: '#0a1628', cardBg: '#0e2a47', text: '#e0f2fe', sub: '#7dd3fc', accent: '#06b6d4', border: '#164e63', iconColor: '#7dd3fc', barBg: '#164e63' },
];

const CARD_W = 360;

/* ── Shared card face style ── */
const faceStyle = (theme) => ({
  background: theme.bg,
  color: theme.text,
  width: CARD_W,
  padding: '22px 20px 18px',
  borderRadius: 20,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  boxSizing: 'border-box',
  boxShadow: theme.id === 'light' ? '0 2px 24px rgba(0,0,0,0.07)' : 'none',
  border: theme.id === 'light' ? 'none' : `1px solid ${theme.border}`,
});

/* ── Branding row ── */
function LogoRow({ theme, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 18, height: 18, background: '#6366f1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 8L3 12l5 4"/><path d="M16 8l5 4-5 4"/><polyline points="9 15 11 11 13 14 15 9"/>
          </svg>
        </div>
        <span style={{ fontSize: 13, fontWeight: 800 }}>Code<span style={{ color: '#6366f1' }}>Pulse</span></span>
        <span style={{ fontSize: 10, fontWeight: 500, color: theme.sub, marginLeft: 2 }}>CARD</span>
      </div>
      {right && <span style={{ fontSize: 9, fontWeight: 600, color: theme.sub, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{right}</span>}
    </div>
  );
}

/* ══════════════════════════════════
   COMPONENT
   ══════════════════════════════════ */
export default function ShareCard() {
  const frontRef = useRef(null);
  const backRef = useRef(null);

  const { profile, handles, platforms, aggregateStats, heatmapData, contestData, topicData } = useData();
  const { user } = useAuth();
  const [theme] = useState(THEMES[0]);
  const [flipped, setFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const name = profile.name || Object.values(handles).find(Boolean) || 'User';
  const username = user?.username || name.replace(/\s+/g, '_').toLowerCase();
  const avatar = profile.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${name}`;
  const activeDays = heatmapData.filter((d) => d.count > 0).length;

  /* ── Front data ── */
  const connectedPlatforms = Object.entries(PLATFORMS).filter(([k]) => handles[k]).map(([k, cfg]) => ({ key: k, ...cfg, profileUrl: cfg.url + handles[k] }));

  /* Ensure URLs have protocol prefix */
  const normalizeUrl = (url) => {
    if (!url) return '';
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) return 'https://' + url;
    return url;
  };

  const socialLinks = [
    { key: 'github', url: normalizeUrl(profile.github), label: 'GitHub' },
    { key: 'linkedin', url: normalizeUrl(profile.linkedin), label: 'LinkedIn' },
    { key: 'twitter', url: normalizeUrl(profile.twitter), label: 'X' },
    { key: 'portfolio', url: normalizeUrl(profile.portfolio), label: 'Website' },
  ].filter((l) => l.url);

  /* ── Back data ── */
  const platformStats = useMemo(() =>
    Object.entries(PLATFORMS).filter(([k]) => handles[k] && platforms[k]).map(([k, cfg]) => {
      const p = platforms[k];
      return { key: k, name: cfg.name, color: cfg.color, handle: handles[k], rating: p.contestRating || p.maxRating || 0, maxRating: p.maxRating || p.contestRating || 0, solved: p.totalSolved || 0, contests: p.contestsParticipated || p.contestsAttended || 0 };
    }), [handles, platforms]);

  const topTags = useMemo(() => {
    if (!topicData) return [];
    const map = {};
    for (const t of (topicData.codeforces || [])) { const k = t.tagName.toLowerCase(); map[k] = (map[k] || 0) + t.problemsSolved; }
    for (const t of (topicData.leetcode || [])) { const k = t.tagName.toLowerCase(); map[k] = (map[k] || 0) + t.problemsSolved; }
    return Object.entries(map).map(([n, c]) => ({ name: n.charAt(0).toUpperCase() + n.slice(1), count: c })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [topicData]);

  const recentContests = useMemo(() =>
    Object.entries(contestData)
      .flatMap(([plat, arr]) => (arr || []).slice(-4).map((c) => ({ ...c, platform: plat })))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4),
    [contestData]);

  const maxPlatRating = Math.max(1, ...platformStats.map((p) => p.maxRating));



  /* ── SVG path data for HTML export ── */
  const PLATFORM_SVG_PATHS = {
    leetcode: { fill: '#F89F1B', d: 'M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z' },
    codeforces: { fill: '#318CE7', d: 'M4.5 7.5C5.328 7.5 6 8.172 6 9v10.5c0 .828-.672 1.5-1.5 1.5h-3C.673 21 0 20.328 0 19.5V9c0-.828.673-1.5 1.5-1.5h3zm9-4.5c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-3c-.827 0-1.5-.672-1.5-1.5v-15c0-.828.673-1.5 1.5-1.5h3zm9 7.5c.828 0 1.5.672 1.5 1.5v7.5c0 .828-.672 1.5-1.5 1.5h-3c-.828 0-1.5-.672-1.5-1.5V12c0-.828.672-1.5 1.5-1.5h3z' },
    codechef: { fill: '#5B4638', d: 'M11.2574.0039c-.37.0101-.7353.041-1.1003.095C9.6164.153 9.0766.4236 8.482.694c-.757.3244-1.5147.6486-2.2176.7027-1.1896.3785-1.568.919-1.8925 1.3516 0 .054-.054.1079-.054.1079-.4325.865-.4873 1.73-.325 2.5952.1621.5407.3786 1.0282.5408 1.5148.3785 1.0274.7578 2.0007.92 3.1362.1622.3244.3235.7571.4316 1.1897.2704.8651.542 1.8383 1.353 2.5952l.0057-.0028c.0175.0183.0301.0387.0482.0568.0072-.0036.0141-.0063.0213-.0099l-.0213-.5849c.6489-.9733 1.5673-1.6221 2.865-1.8925.5195-.1093 1.081-.1497 1.6625-.1278a8.7733 8.7733 0 0 1 1.7988.2357c1.4599.3785 2.595 1.1358 2.6492 1.7846.0273.3549.0398.6952.0326 1.0364-.001.064-.0046.1285-.007.193l.1362.0682c.075-.0375.1424-.107.2059-.1902.0008-.001.002-.002.0028-.0028.0018-.0023.0039-.0061.0057-.0085.0396-.0536.0747-.1236.1107-.1931.0188-.0377.0372-.0866.0554-.1292.2048-.4622.362-1.1536.538-1.9635.0541-.2703.1092-.4864.1633-.7027.4326-.9733 1.0266-1.8382 1.6213-2.6492.9733-1.3518 1.8928-2.5962 1.7846-4.0561-1.784-3.4608-4.2718-4.0017-5.5695-4.272-.2163-.0541-.3233-.0539-.4856-.108-1.3382-.2433-2.4945-.3953-3.6046-.3648z' },
    atcoder: { fill: '#1ABC9C', d: 'M12 1.5L2.5 21.5h4.3l1.5-3.8h7.4l1.5 3.8h4.3L12 1.5zm0 7.2l2.6 6.5H9.4L12 8.7z' },
  };

  const SOCIAL_SVG_PATHS = {
    github: { d: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' },
    linkedin: { d: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
    twitter: { d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
    portfolio: { d: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z', stroke: true },
  };

  /* ── Generate HTML for SVG icon ── */
  const svgIconHtml = (pathData, size, fillColor) => {
    if (pathData.stroke) {
      return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${fillColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathData.d}"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fillColor}"><path d="${pathData.d}"/></svg>`;
  };

  /* ── Download as self-contained HTML ── */
  const downloadCard = useCallback(() => {
    setDownloading(true);
    try {
      const t = theme;
      const cardStyle = `background:${t.bg};color:${t.text};width:360px;padding:22px 20px 18px;border-radius:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;${t.id === 'light' ? 'box-shadow:0 2px 24px rgba(0,0,0,0.07);' : `border:1px solid ${t.border};`}`;

      const logoRowHtml = (rightText) => `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:5px">
            <div style="width:18px;height:18px;background:#6366f1;border-radius:4px;display:flex;align-items:center;justify-content:center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8L3 12l5 4"/><path d="M16 8l5 4-5 4"/><polyline points="9 15 11 11 13 14 15 9"/></svg>
            </div>
            <span style="font-size:13px;font-weight:800">Code<span style="color:#6366f1">Pulse</span></span>
            <span style="font-size:10px;font-weight:500;color:${t.sub};margin-left:2px">CARD</span>
          </div>
          ${rightText ? `<span style="font-size:9px;font-weight:600;color:${t.sub};text-transform:uppercase;letter-spacing:0.08em">${rightText}</span>` : ''}
        </div>`;

      // Front side platform icons
      const platformIconsHtml = connectedPlatforms.length > 0 ? `
        <div style="background:${t.cardBg};border-radius:12px;padding:10px 14px;text-align:center;margin-bottom:8px;border:1px solid ${t.border}">
          <div style="font-size:11px;font-weight:600;color:${t.sub};font-style:italic;margin-bottom:8px">You can find me on ...</div>
          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
            ${connectedPlatforms.map(p => {
              const svg = PLATFORM_SVG_PATHS[p.key];
              return svg ? `<a href="${p.profileUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">${svgIconHtml(svg, 20, svg.fill)}</a>` : '';
            }).join('')}
          </div>
        </div>` : '';

      // Front side social links
      const socialLinksHtml = socialLinks.length > 0 ? `
        <div style="background:${t.cardBg};border-radius:12px;padding:8px 14px;border:1px solid ${t.border}">
          <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap">
            ${socialLinks.map(l => {
              const svg = SOCIAL_SVG_PATHS[l.key];
              const iconHtml = svg ? svgIconHtml(svg, 14, t.iconColor) : '';
              return `<a href="${l.url}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:4px;text-decoration:none">${iconHtml}<span style="font-size:10px;font-weight:600;color:${t.sub}">${l.label}</span></a>`;
            }).join('')}
          </div>
        </div>` : '';

      // Stats cards
      const statsHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
          ${[{ label: 'Questions Solved', value: aggregateStats.totalSolved.toLocaleString() }, { label: 'Active Days', value: activeDays }].map(s => `
            <div style="background:${t.cardBg};border-radius:12px;padding:10px 8px;text-align:center;border:1px solid ${t.border}">
              <div style="font-size:10px;font-weight:600;color:${t.accent};margin-bottom:4px">${s.label}</div>
              <div style="font-size:24px;font-weight:800;line-height:1;font-feature-settings:'tnum'">${s.value}</div>
            </div>`).join('')}
        </div>`;

      // Back side summary
      const summaryHtml = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:12px">
          ${[{ label: 'Contests', value: aggregateStats.totalContests }, { label: 'Best Rating', value: aggregateStats.bestRating || '—' }, { label: 'Streak', value: `${aggregateStats.streak}d` }].map(s => `
            <div style="background:${t.cardBg};border-radius:10px;padding:8px 4px;text-align:center;border:1px solid ${t.border}">
              <div style="font-size:18px;font-weight:800;line-height:1;font-feature-settings:'tnum'">${s.value}</div>
              <div style="font-size:8px;font-weight:600;color:${t.sub};text-transform:uppercase;letter-spacing:0.05em;margin-top:3px">${s.label}</div>
            </div>`).join('')}
        </div>`;

      // Platform rating bars
      const ratingsHtml = platformStats.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:9px;font-weight:700;color:${t.sub};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Platform Ratings</div>
          <div style="display:flex;flex-direction:column;gap:7px">
            ${platformStats.map(p => {
              const pct = Math.max(10, (p.maxRating / maxPlatRating) * 100);
              const svg = PLATFORM_SVG_PATHS[p.key];
              const iconHtml = svg ? svgIconHtml(svg, 13, svg.fill) : '';
              return `<div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
                  <div style="display:flex;align-items:center;gap:5px">${iconHtml}<span style="font-size:11px;font-weight:700">${p.name}</span></div>
                  <div style="display:flex;align-items:center;gap:6px"><span style="font-size:9px;color:${t.sub}">${p.solved} solved</span><span style="font-size:12px;font-weight:800;font-feature-settings:'tnum'">${p.maxRating}</span></div>
                </div>
                <div style="height:5px;border-radius:3px;background:${t.barBg};overflow:hidden"><div style="height:100%;width:${pct}%;border-radius:3px;background:${p.color}"></div></div>
              </div>`;
            }).join('')}
          </div>
        </div>` : '';

      // Recent contests
      const contestsHtml = recentContests.length > 0 ? `
        <div style="margin-bottom:12px">
          <div style="font-size:9px;font-weight:700;color:${t.sub};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Recent Contests</div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${recentContests.map(c => {
              const svg = PLATFORM_SVG_PATHS[c.platform];
              const iconHtml = svg ? svgIconHtml(svg, 11, svg.fill) : '';
              const changeColor = c.change >= 0 ? '#22c55e' : '#ef4444';
              const changePrefix = c.change >= 0 ? '+' : '';
              return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;background:${t.cardBg};border-radius:8px;border:1px solid ${t.border}">
                <div style="display:flex;align-items:center;gap:5px;flex:1;min-width:0">${iconHtml}<span style="font-size:10px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.contest}</span></div>
                <div style="display:flex;align-items:center;gap:5px;flex-shrink:0"><span style="font-size:11px;font-weight:800;font-feature-settings:'tnum'">${c.rating}</span><span style="font-size:10px;font-weight:700;color:${changeColor};font-feature-settings:'tnum'">${changePrefix}${c.change}</span></div>
              </div>`;
            }).join('')}
          </div>
        </div>` : '';

      // Topics
      const topicsHtml = topTags.length > 0 ? `
        <div>
          <div style="font-size:9px;font-weight:700;color:${t.sub};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Top Topics</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${topTags.map(tag => `<span style="display:inline-block;padding:3px 9px;border-radius:12px;background:${t.cardBg};color:${t.accent};font-size:10px;font-weight:700;border:1px solid ${t.border}">${tag.name}</span>`).join('')}
          </div>
        </div>` : '';

      const flipHintSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="${t.sub}" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>`;

      const usernameTagBg = t.id === 'light' ? '#fef3c7' : 'rgba(251,191,36,0.15)';
      const usernameTagColor = t.id === 'light' ? '#92400e' : '#fbbf24';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CodePulse Card - ${name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #18181b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .scene { perspective: 1200px; }
  .card { width: 360px; position: relative; transform-style: preserve-3d; transition: transform 0.55s cubic-bezier(.4,.2,.2,1); cursor: pointer; }
  .card.flipped { transform: rotateY(180deg); }
  .face { ${cardStyle} backface-visibility: hidden; }
  .front { position: relative; }
  .back { position: absolute; top: 0; left: 0; transform: rotateY(180deg); }
  a { color: inherit; }
  a:hover { opacity: 0.8; }
</style>
</head>
<body>
<div class="scene">
  <div class="card" onclick="this.classList.toggle('flipped')">
    <div class="face front">
      ${logoRowHtml('')}
      <div style="display:flex;justify-content:center;margin-bottom:10px;position:relative">
        <div style="width:96px;height:96px;border-radius:50%;background:conic-gradient(${t.accent},${t.accent}88,${t.accent});padding:3px;display:flex;align-items:center;justify-content:center">
          <img src="${avatar}" alt="${name}" crossorigin="anonymous" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid ${t.bg}" />
        </div>
        <div style="position:absolute;bottom:-2px;right:calc(50% - 58px);width:24px;height:24px;background:#6366f1;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid ${t.bg}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8L3 12l5 4"/><path d="M16 8l5 4-5 4"/></svg>
        </div>
      </div>
      <div style="text-align:center;margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:center;gap:4px">
          <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em">${name}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 1l2.39 1.68h2.93l.96 2.76L21 7.61v2.93l1.68 2.39L21 15.32v2.93l-2.76.96-1.68 2.39h-2.93L12 23l-2.39-1.68H6.68l-.96-2.76L3 16.39v-2.93L1.32 11.07 3 8.68V5.75l2.76-.96L7.44 2.4h2.93L12 1z" fill="#10B981"/><path d="M9.5 12.5l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div style="display:inline-block;margin-top:3px;padding:2px 10px;border-radius:12px;background:${usernameTagBg};color:${usernameTagColor};font-size:11px;font-weight:600">@${username}</div>
      </div>
      ${statsHtml}
      ${platformIconsHtml}
      ${socialLinksHtml}
      <div style="text-align:center;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:4px">
        ${flipHintSvg}
        <span style="font-size:8px;color:${t.sub};font-weight:600;text-transform:uppercase;letter-spacing:0.08em">Click to flip</span>
      </div>
    </div>
    <div class="face back">
      ${logoRowHtml('Stats')}
      ${summaryHtml}
      ${ratingsHtml}
      ${contestsHtml}
      ${topicsHtml}
      <div style="text-align:center;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:4px">
        ${flipHintSvg}
        <span style="font-size:8px;color:${t.sub};font-weight:600;text-transform:uppercase;letter-spacing:0.08em">Click to flip back</span>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { download: `codepulse-${username}-card.html`, href: url }).click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); } finally { setDownloading(false); }
  }, [username, theme, name, avatar, connectedPlatforms, socialLinks, aggregateStats, activeDays, platformStats, maxPlatRating, recentContests, topTags]);

  return (
    <div className="max-w-md mx-auto space-y-4">

      {/* ── Flip Card ── */}
      <div className="flex justify-center" style={{ perspective: 1200 }}>
        <div
          onClick={() => setFlipped(!flipped)}
          className="cursor-pointer select-none"
          style={{
            width: CARD_W,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(.4,.2,.2,1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >

          {/* ═══════════ FRONT ═══════════ */}
          <div ref={frontRef} style={{ ...faceStyle(theme), backfaceVisibility: 'hidden', position: 'relative' }}>
            <LogoRow theme={theme} />

            {/* Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, position: 'relative' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: `conic-gradient(${theme.accent}, ${theme.accent}88, ${theme.accent})`, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={avatar} alt={name} crossOrigin="anonymous" style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${theme.bg}` }} />
              </div>
              <div style={{ position: 'absolute', bottom: -2, right: 'calc(50% - 58px)', width: 24, height: 24, background: '#6366f1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${theme.bg}` }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 8L3 12l5 4"/><path d="M16 8l5 4-5 4"/></svg>
              </div>
            </div>

            {/* Name */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{name}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M12 1l2.39 1.68h2.93l.96 2.76L21 7.61v2.93l1.68 2.39L21 15.32v2.93l-2.76.96-1.68 2.39h-2.93L12 23l-2.39-1.68H6.68l-.96-2.76L3 16.39v-2.93L1.32 11.07 3 8.68V5.75l2.76-.96L7.44 2.4h2.93L12 1z" fill="#10B981"/>
                  <path d="M9.5 12.5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ display: 'inline-block', marginTop: 3, padding: '2px 10px', borderRadius: 12, background: theme.id === 'light' ? '#fef3c7' : 'rgba(251,191,36,0.15)', color: theme.id === 'light' ? '#92400e' : '#fbbf24', fontSize: 11, fontWeight: 600 }}>@{username}</div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[{ label: 'Questions Solved', value: aggregateStats.totalSolved.toLocaleString() }, { label: 'Active Days', value: activeDays }].map((s) => (
                <div key={s.label} style={{ background: theme.cardBg, borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: theme.accent, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Platforms */}
            {connectedPlatforms.length > 0 && (
              <div style={{ background: theme.cardBg, borderRadius: 12, padding: '10px 14px', textAlign: 'center', marginBottom: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme.sub, fontStyle: 'italic', marginBottom: 8 }}>You can find me on ...</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {connectedPlatforms.map((p) => <a key={p.key} href={p.profileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: 'none' }}>{PLATFORM_SVGS[p.key](20)}</a>)}
                </div>
              </div>
            )}

            {/* Social links with labels */}
            {socialLinks.length > 0 && (
              <div style={{ background: theme.cardBg, borderRadius: 12, padding: '8px 14px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                  {socialLinks.map((l) => (
                    <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                      {SOCIAL_SVGS[l.key](14, theme.iconColor)}
                      <span style={{ fontSize: 10, fontWeight: 600, color: theme.sub }}>{l.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Flip hint */}
            <div style={{ textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={theme.sub} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
              <span style={{ fontSize: 8, color: theme.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tap to flip</span>
            </div>
          </div>

          {/* ═══════════ BACK ═══════════ */}
          <div ref={backRef} style={{ ...faceStyle(theme), backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', position: 'absolute', top: 0, left: 0 }}>
            <LogoRow theme={theme} right="Stats" />

            {/* Summary row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
              {[
                { label: 'Contests', value: aggregateStats.totalContests },
                { label: 'Best Rating', value: aggregateStats.bestRating || '—' },
                { label: 'Streak', value: `${aggregateStats.streak}d` },
              ].map((s) => (
                <div key={s.label} style={{ background: theme.cardBg, borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: `1px solid ${theme.border}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{s.value}</div>
                  <div style={{ fontSize: 8, fontWeight: 600, color: theme.sub, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Platform rating bars */}
            {platformStats.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Platform Ratings</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {platformStats.map((p) => {
                    const pct = Math.max(10, (p.maxRating / maxPlatRating) * 100);
                    return (
                      <div key={p.key}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {PLATFORM_SVGS[p.key](13)}
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{p.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 9, color: theme.sub }}>{p.solved} solved</span>
                            <span style={{ fontSize: 12, fontWeight: 800, fontFeatureSettings: '"tnum"' }}>{p.maxRating}</span>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: theme.barBg, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent contests */}
            {recentContests.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Recent Contests</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {recentContests.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: theme.cardBg, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                        {PLATFORM_SVGS[c.platform](11)}
                        <span style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contest}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, fontFeatureSettings: '"tnum"' }}>{c.rating}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: c.change >= 0 ? '#22c55e' : '#ef4444', fontFeatureSettings: '"tnum"' }}>{c.change >= 0 ? '+' : ''}{c.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Topics */}
            {topTags.length > 0 && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Top Topics</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {topTags.map((t) => (
                    <span key={t.name} style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 12, background: theme.cardBg, color: theme.accent, fontSize: 10, fontWeight: 700, border: `1px solid ${theme.border}` }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Flip hint */}
            <div style={{ textAlign: 'center', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={theme.sub} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>
              <span style={{ fontSize: 8, color: theme.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tap to flip back</span>
            </div>
          </div>
        </div>
      </div>



      {/* ── Download button ── */}
      <div className="flex justify-center" style={{ marginTop: 8 }}>
        <button onClick={(e) => { e.stopPropagation(); downloadCard(); }} disabled={downloading}
          className="h-8 px-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40">
          {downloading
            ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          }
          Download Card
        </button>
      </div>
    </div>
  );
}
