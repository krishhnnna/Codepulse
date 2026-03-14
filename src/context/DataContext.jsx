import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  fetchCFProfile, fetchCFContests, fetchCFSubmissions,
  fetchLCProfile, fetchLCContests, fetchLCCalendar,
  fetchCCProfile, fetchCCContests, fetchCCSubmissions,
  fetchACProfile, fetchACContests, fetchACSubmissions,
  fetchTopicStats,
} from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const HANDLES_KEY = 'codepulse_handles';
const PROFILE_KEY = 'codepulse_profile';

function loadHandles() {
  try {
    const raw = localStorage.getItem(HANDLES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveHandles(handles) {
  localStorage.setItem(HANDLES_KEY, JSON.stringify(handles));
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function DataProvider({ children }) {
  const { user, isAuthenticated, syncToServer } = useAuth();

  const [handles, setHandlesState] = useState({});
  const [profile, setProfile] = useState({});
  const [platforms, setPlatforms] = useState({});
  const [contestData, setContestData] = useState({});
  const [heatmapData, setHeatmapData] = useState([]);
  const [topicData, setTopicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);

  // When user changes (login/logout/switch), load correct data
  useEffect(() => {
    if (isAuthenticated && user) {
      // Authenticated: use server data, also save to localStorage
      const h = user.handles && Object.keys(user.handles).length > 0 ? user.handles : {};
      const p = user.profile && Object.keys(user.profile).length > 0 ? user.profile : {};
      setHandlesState(h);
      setProfile(p);
      saveHandles(h);
      saveProfile(p);
    } else {
      // Not authenticated: use localStorage
      setHandlesState(loadHandles());
      setProfile(loadProfile());
    }
    // Reset fetched data when user changes
    setPlatforms({});
    setContestData({});
    setHeatmapData([]);
    setTopicData(null);
  }, [user?.email, isAuthenticated]);

  const hasHandles = Object.values(handles).some((h) => h?.trim());

  const setHandles = useCallback((newHandles) => {
    setHandlesState(newHandles);
    saveHandles(newHandles);
    if (isAuthenticated) syncToServer(newHandles, undefined);
  }, [isAuthenticated, syncToServer]);

  const updateProfile = useCallback((newProfile) => {
    setProfile((prev) => {
      const merged = { ...prev, ...newProfile };
      saveProfile(merged);
      if (isAuthenticated) syncToServer(undefined, merged);
      return merged;
    });
  }, [isAuthenticated, syncToServer]);

  // Fetch all platform data
  const fetchAllData = useCallback(async () => {
    if (!hasHandles) return;
    setLoading(true);
    setError(null);
    const isFirstLoad = initialLoad;

    try {
      const results = {};
      const contests = {};
      const submissions = [];

      // Fetch all profiles in parallel
      const profilePromises = [];

      if (handles.codeforces) {
        profilePromises.push(
          fetchCFProfile(handles.codeforces).then((d) => { if (d) results.codeforces = d; })
        );
        profilePromises.push(
          fetchCFContests(handles.codeforces).then((d) => {
            if (d) contests.codeforces = d.map((c) => ({
              date: new Date(c.timestamp * 1000).toISOString().split('T')[0],
              rating: c.newRating,
              change: c.newRating - c.oldRating,
              contest: c.contestName,
              ranking: c.rank || 0,
            }));
          })
        );
        profilePromises.push(
          fetchCFSubmissions(handles.codeforces).then((d) => { if (d) submissions.push(...d); })
        );
      }

      if (handles.leetcode) {
        profilePromises.push(
          fetchLCProfile(handles.leetcode).then((d) => { if (d) results.leetcode = d; })
        );
        profilePromises.push(
          fetchLCContests(handles.leetcode).then((d) => {
            if (d) contests.leetcode = d.map((c, i) => ({
              date: new Date(c.timestamp * 1000).toISOString().split('T')[0],
              rating: c.rating,
              change: i > 0 ? c.rating - d[i - 1].rating : 0,
              contest: c.contestName,
              ranking: c.ranking || 0,
            }));
          })
        );
        profilePromises.push(
          fetchLCCalendar(handles.leetcode).then((d) => {
            if (d && typeof d === 'object') {
              Object.entries(d).forEach(([ts, count]) => {
                submissions.push({ timestamp: Number(ts), count: Number(count) });
              });
            }
          })
        );
      }

      if (handles.codechef) {
        profilePromises.push(
          fetchCCProfile(handles.codechef).then((d) => { if (d) results.codechef = d; })
        );
        profilePromises.push(
          fetchCCContests(handles.codechef).then((d) => {
            if (d && d.length > 0) contests.codechef = d.map((c) => ({
              date: c.timestamp ? new Date(c.timestamp * 1000).toISOString().split('T')[0] : '',
              rating: c.rating,
              change: c.change || 0,
              contest: c.contestName,
              ranking: c.rank || 0,
            }));
          })
        );
        profilePromises.push(
          fetchCCSubmissions(handles.codechef).then((d) => { if (d) submissions.push(...d); })
        );
      }

      if (handles.atcoder) {
        profilePromises.push(
          fetchACProfile(handles.atcoder).then((d) => { if (d) results.atcoder = d; })
        );
        profilePromises.push(
          fetchACContests(handles.atcoder).then((d) => {
            if (d) contests.atcoder = d.map((c) => ({
              date: c.timestamp ? c.timestamp.split('T')[0] : '',
              rating: c.newRating,
              change: c.newRating - c.oldRating,
              contest: c.contestName,
              ranking: c.rank || 0,
            }));
          })
        );
        profilePromises.push(
          fetchACSubmissions(handles.atcoder).then((d) => { if (d) submissions.push(...d); })
        );
      }

      await Promise.all(profilePromises);

      setPlatforms(results);
      setContestData(contests);

      // Build heatmap from submissions
      const heatmap = buildHeatmap(submissions);
      setHeatmapData(heatmap);

      // Fetch topic/tag stats (non-blocking)
      if (handles.codeforces || handles.leetcode) {
        fetchTopicStats({
          codeforces: handles.codeforces,
          leetcode: handles.leetcode,
        }).then((d) => { if (d) setTopicData(d); }).catch(() => {});
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (isFirstLoad) setInitialLoad(false);
    }
  }, [handles, hasHandles]);

  // Build heatmap: last 365 days from submission timestamps
  function buildHeatmap(submissions) {
    const countsMap = {};
    const today = new Date();
    // Init last 365 days with 0
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      countsMap[d.toISOString().split('T')[0]] = 0;
    }

    submissions.forEach((s) => {
      let dateStr;
      if (s.timestamp) {
        const d = new Date(s.timestamp * 1000);
        dateStr = d.toISOString().split('T')[0];
      }
      if (dateStr && dateStr in countsMap) {
        countsMap[dateStr] += (s.count || 1);
      }
    });

    return Object.entries(countsMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  // Auto-fetch when handles change
  useEffect(() => {
    if (hasHandles) fetchAllData();
  }, [handles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute aggregate stats
  const aggregateStats = {
    totalSolved: Object.values(platforms).reduce((s, p) => s + (p.totalSolved || 0), 0),
    totalContests: Object.values(platforms).reduce((s, p) =>
      s + (p.contestsParticipated || p.contestsAttended || 0), 0),
    bestRating: Math.max(0, ...Object.values(platforms).map((p) => p.maxRating || p.contestRating || 0)),
    streak: 0,
  };

  // Compute streak from heatmap
  if (heatmapData.length > 0) {
    let cur = 0;
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) cur++;
      else break;
    }
    aggregateStats.streak = cur;
  }

  return (
    <DataContext.Provider value={{
      handles, setHandles, hasHandles,
      profile, updateProfile,
      platforms, contestData, heatmapData, topicData,
      aggregateStats,
      loading, initialLoad, error,
      refetch: fetchAllData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
