// ── Mock data for all platforms ──

export const userProfile = {
  name: 'Krishna Kumar',
  username: 'krishna_dev',
  avatar: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Krishna',
  bio: 'Competitive Programmer | Full Stack Developer | Open Source Enthusiast',
  location: 'India',
  joinedDate: 'January 2023',
  links: {
    github: 'https://github.com/krishna',
    linkedin: 'https://linkedin.com/in/krishna',
    twitter: 'https://twitter.com/krishna',
    portfolio: 'https://krishna.dev',
  },
};

export const platformStats = {
  leetcode: {
    platform: 'LeetCode',
    handle: 'krishna_lc',
    color: '#FFA116',
    totalSolved: 847,
    totalQuestions: 3150,
    easySolved: 280,
    easyTotal: 800,
    mediumSolved: 430,
    mediumTotal: 1650,
    hardSolved: 137,
    hardTotal: 700,
    ranking: 12453,
    contestRating: 1876,
    maxRating: 1923,
    streak: 45,
    badges: 12,
  },
  codeforces: {
    platform: 'Codeforces',
    handle: 'krishna_cf',
    color: '#1890FF',
    totalSolved: 623,
    rating: 1654,
    maxRating: 1720,
    rank: 'Expert',
    contestsParticipated: 87,
    contributions: 15,
  },
  codechef: {
    platform: 'CodeChef',
    handle: 'krishna_cc',
    color: '#5B4638',
    totalSolved: 412,
    rating: 1892,
    maxRating: 1945,
    stars: 5,
    contestsParticipated: 52,
    globalRank: 3421,
    countryRank: 876,
  },
  atcoder: {
    platform: 'AtCoder',
    handle: 'krishna_ac',
    color: '#222222',
    totalSolved: 198,
    rating: 1234,
    maxRating: 1298,
    rank: '水色 (Light Blue)',
    contestsParticipated: 34,
  },
};

// Generate contest rating history
// Seeded pseudo-random for deterministic data
function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

const contestNames = {
  leetcode: (i) => {
    const types = ['Weekly Contest', 'Biweekly Contest'];
    return i % 3 === 0 ? `${types[1]} ${130 + Math.floor(i / 3)}` : `${types[0]} ${380 + i}`;
  },
  codeforces: (i) => {
    const types = ['Codeforces Round', 'Educational Codeforces Round', 'Div. 2 Round'];
    return `${types[i % 3]} #${900 + i}`;
  },
  codechef: (i) => {
    const types = ['Starters', 'Long Challenge', 'Cook-Off'];
    return `${types[i % 3]} ${140 + i}`;
  },
  atcoder: (i) => {
    const types = ['ABC', 'ARC', 'AGC'];
    return `${types[i % 3]} ${300 + i}`;
  },
};

function generateRatingHistory(platform, months = 14) {
  const history = [];
  const rng = seededRandom(platform.length * 1000 + 42);
  const baseDate = new Date(2024, 10, 1);
  const configs = {
    leetcode: { base: 1520, variance: 65, trend: 18, count: 28 },
    codeforces: { base: 1380, variance: 90, trend: 14, count: 24 },
    codechef: { base: 1650, variance: 55, trend: 12, count: 20 },
    atcoder: { base: 980, variance: 50, trend: 15, count: 18 },
  };
  const { base, variance, trend, count } = configs[platform];
  const getName = contestNames[platform];

  let prevRating = base;
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + Math.round(i * (months * 30 / count)));
    const noise = (rng() - 0.4) * variance;
    const rating = Math.round(base + trend * (i * 0.6) + noise);
    const clampedRating = Math.max(0, rating);
    const change = clampedRating - prevRating;
    prevRating = clampedRating;
    history.push({
      date: date.toISOString().split('T')[0],
      rating: clampedRating,
      change: i === 0 ? 0 : change,
      contest: getName(i),
    });
  }
  return history;
}

export const contestHistory = {
  leetcode: generateRatingHistory('leetcode'),
  codeforces: generateRatingHistory('codeforces'),
  codechef: generateRatingHistory('codechef'),
  atcoder: generateRatingHistory('atcoder'),
};

// Generate heatmap data (last 365 days)
export function generateHeatmapData() {
  const data = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    // More activity on weekdays
    const isWeekday = dayOfWeek > 0 && dayOfWeek < 6;
    const rand = Math.random();
    let count = 0;
    if (rand > 0.3) count = Math.floor(Math.random() * 3) + 1;
    if (rand > 0.6 && isWeekday) count = Math.floor(Math.random() * 5) + 3;
    if (rand > 0.85) count = Math.floor(Math.random() * 8) + 5;
    if (rand < 0.15) count = 0;

    data.push({
      date: date.toISOString().split('T')[0],
      count,
    });
  }
  return data;
}

export const languageStats = [
  { name: 'C++', value: 45, color: '#00599C' },
  { name: 'Python', value: 28, color: '#3776AB' },
  { name: 'Java', value: 15, color: '#ED8B00' },
  { name: 'JavaScript', value: 8, color: '#F7DF1E' },
  { name: 'Go', value: 4, color: '#00ADD8' },
];

export const difficultyStats = [
  { name: 'Easy', value: 280, color: '#00b8a3' },
  { name: 'Medium', value: 430, color: '#ffc01e' },
  { name: 'Hard', value: 137, color: '#ff375f' },
];
