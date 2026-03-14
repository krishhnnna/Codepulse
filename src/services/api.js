const API_BASE = 'http://localhost:8000/api';

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) return null;
  return resp.json();
}

// ── Auth helpers ──
function getToken() {
  return localStorage.getItem('codepulse_token');
}

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(url, { ...options, headers });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

export async function authSignup(email, username) {
  return authFetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ email, username }),
  });
}

export async function authSignupVerify(email, username, otp) {
  return authFetch(`${API_BASE}/auth/signup/verify`, {
    method: 'POST',
    body: JSON.stringify({ email, username, otp }),
  });
}

export async function authLogin(email) {
  return authFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function authLoginVerify(email, otp) {
  return authFetch(`${API_BASE}/auth/login/verify`, {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function authGetMe() {
  return authFetch(`${API_BASE}/auth/me`);
}

export async function authUpdateMe(handles, profile) {
  const body = {};
  if (handles !== undefined) body.handles = handles;
  if (profile !== undefined) body.profile = profile;
  return authFetch(`${API_BASE}/auth/me`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

// ── Handle Verification ──
export async function startHandleVerification(platform, handle) {
  return authFetch(`${API_BASE}/auth/verify-handle/start`, {
    method: 'POST',
    body: JSON.stringify({ platform, handle }),
  });
}

export async function checkHandleVerification(platform) {
  return authFetch(`${API_BASE}/auth/verify-handle/check`, {
    method: 'POST',
    body: JSON.stringify({ platform }),
  });
}

export async function getVerifiedHandles() {
  return authFetch(`${API_BASE}/auth/verified-handles`);
}

// ── Codeforces ──
export async function fetchCFProfile(handle) {
  return fetchJSON(`${API_BASE}/codeforces/${handle}`);
}

export async function fetchCFContests(handle) {
  return fetchJSON(`${API_BASE}/codeforces/${handle}/contests`);
}

export async function fetchCFSubmissions(handle) {
  return fetchJSON(`${API_BASE}/codeforces/${handle}/submissions`);
}

// ── LeetCode ──
export async function fetchLCProfile(handle) {
  return fetchJSON(`${API_BASE}/leetcode/${handle}`);
}

export async function fetchLCContests(handle) {
  return fetchJSON(`${API_BASE}/leetcode/${handle}/contests`);
}

export async function fetchLCCalendar(handle) {
  return fetchJSON(`${API_BASE}/leetcode/${handle}/calendar`);
}

// ── CodeChef ──
export async function fetchCCProfile(handle) {
  return fetchJSON(`${API_BASE}/codechef/${handle}`);
}

export async function fetchCCContests(handle) {
  return fetchJSON(`${API_BASE}/codechef/${handle}/contests`);
}

export async function fetchCCSubmissions(handle) {
  return fetchJSON(`${API_BASE}/codechef/${handle}/submissions`);
}

// ── AtCoder ──
export async function fetchACProfile(handle) {
  return fetchJSON(`${API_BASE}/atcoder/${handle}`);
}

export async function fetchACContests(handle) {
  return fetchJSON(`${API_BASE}/atcoder/${handle}/contests`);
}

export async function fetchACSubmissions(handle) {
  return fetchJSON(`${API_BASE}/atcoder/${handle}/submissions`);
}

// ── Rating Prediction ──
export async function fetchCFPrediction(handle) {
  return fetchJSON(`${API_BASE}/predict/codeforces/${handle}`);
}

export async function fetchLCPrediction(handle) {
  return fetchJSON(`${API_BASE}/predict/leetcode/${handle}`);
}

// ── Aggregate ──
export async function fetchAggregate(handles) {
  const params = new URLSearchParams();
  if (handles.codeforces) params.set('cf', handles.codeforces);
  if (handles.leetcode) params.set('lc', handles.leetcode);
  if (handles.codechef) params.set('cc', handles.codechef);
  if (handles.atcoder) params.set('ac', handles.atcoder);
  if (!params.toString()) return null;
  return fetchJSON(`${API_BASE}/aggregate?${params}`);
}

// ── Topic Stats ──
export async function fetchTopicStats(handles) {
  const params = new URLSearchParams();
  if (handles.codeforces) params.set('cf', handles.codeforces);
  if (handles.leetcode) params.set('lc', handles.leetcode);
  if (!params.toString()) return null;
  return fetchJSON(`${API_BASE}/topic-stats?${params}`);
}

// ── Upcoming Contests ──
export async function fetchUpcomingContests() {
  return fetchJSON(`${API_BASE}/upcoming-contests`);
}

// ── Check Cheater ──
export async function fetchCheaterCheck(handles) {
  const params = new URLSearchParams();
  if (handles.codeforces) params.set('cf', handles.codeforces);
  if (handles.leetcode) params.set('lc', handles.leetcode);
  if (handles.codechef) params.set('cc', handles.codechef);
  if (!params.toString()) return null;
  return fetchJSON(`${API_BASE}/check-cheater?${params}`);
}
