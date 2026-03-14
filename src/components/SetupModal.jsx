import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS, PlatformIcon } from '../utils/platformConfig';
import { startHandleVerification, checkHandleVerification, getVerifiedHandles } from '../services/api';

const platforms = [
  { key: 'leetcode', label: 'LeetCode', placeholder: 'neal_wu' },
  { key: 'codeforces', label: 'Codeforces', placeholder: 'tourist' },
  { key: 'codechef', label: 'CodeChef', placeholder: 'admin' },
  { key: 'atcoder', label: 'AtCoder', placeholder: 'tourist' },
];

/* ── Spinner ── */
const Spin = ({ className = '' }) => (
  <svg className={`w-3.5 h-3.5 animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── Section wrapper ── */
function Section({ title, description, children }) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {description && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── Handle row with verification ── */
function HandleRow({ platform, verified, onVerified }) {
  const { key, label, placeholder } = platform;
  const [handle, setHandle] = useState(verified || '');
  const [state, setState] = useState(verified ? 'verified' : 'idle');
  const [code, setCode] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [instructions, setInstructions] = useState(null);
  const [error, setError] = useState('');

  // Sync when parent verified prop changes (e.g. user loads after mount)
  useEffect(() => {
    setHandle(verified || '');
    setState(verified ? 'verified' : 'idle');
  }, [verified]);

  const isVerified = state === 'verified';

  async function startVerify() {
    if (!handle.trim()) return;
    setState('loading');
    setError('');
    try {
      const res = await startHandleVerification(key, handle.trim());
      setCode(res.code);
      setDisplayCode(res.display_code || res.code);
      setInstructions(res);
      setState('code');
    } catch (e) {
      setError(e.message);
      setState('error');
    }
  }

  async function checkVerify() {
    setState('checking');
    setError('');
    try {
      const res = await checkHandleVerification(key);
      if (res.success) {
        setState('verified');
        onVerified(key, handle.trim());
      } else {
        setError(res.message);
        setState('code');
      }
    } catch (e) {
      setError(e.message);
      setState('code');
    }
  }

  function handleRemove() {
    setHandle('');
    setCode('');
    setInstructions(null);
    setError('');
    setState('idle');
    onVerified(key, '');
  }

  return (
    <div className="group">
      <div className="flex items-center gap-3 py-2.5">
        {/* Platform icon + label */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-[90px] sm:w-[110px] shrink-0">
          <PlatformIcon platform={key} size={18} />
          <span className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={handle}
            onChange={(e) => { setHandle(e.target.value); if (isVerified && e.target.value !== verified) { setState('idle'); setError(''); } }}
            placeholder={placeholder}
            disabled={isVerified || state === 'loading' || state === 'checking'}
            className="w-full h-8 px-2.5 text-[13px] rounded-md border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-500 disabled:opacity-50 transition-[border-color,box-shadow] duration-150"
          />
        </div>

        {/* Action */}
        <div className="w-[66px] sm:w-[80px] shrink-0 flex justify-end">
          {isVerified ? (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <button onClick={handleRemove} className="text-[11px] text-zinc-400 hover:text-red-500 transition-colors">Remove</button>
            </div>
          ) : state === 'code' || state === 'checking' ? (
            <button
              onClick={checkVerify}
              disabled={state === 'checking'}
              className="h-7 px-2.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-md hover:bg-amber-100 dark:hover:bg-amber-500/15 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {state === 'checking' ? <><Spin /> Check</> : 'Check'}
            </button>
          ) : (
            <button
              onClick={startVerify}
              disabled={!handle.trim() || state === 'loading'}
              className="h-7 px-2.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-25 transition-colors flex items-center gap-1"
            >
              {state === 'loading' ? <Spin /> : 'Verify'}
            </button>
          )}
        </div>
      </div>

      {/* Verification instructions (inline expand) */}
      {state === 'code' && instructions && (
        <div className="ml-0 sm:ml-[110px] pl-2.5 mb-2 pb-3 border-l-2 border-amber-300 dark:border-amber-600/40">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5">
            Paste in <span className="font-semibold text-zinc-700 dark:text-zinc-300">{instructions.field}</span>
          </p>
          <div className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-1">
            <code className="text-[12px] font-mono text-zinc-800 dark:text-zinc-200 select-all break-all">{displayCode}</code>
            <button
              onClick={() => navigator.clipboard.writeText(displayCode)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Copy"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <ol className="mt-2 space-y-0.5">
            {instructions.steps.map((step, i) => (
              <li key={i} className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
          {instructions.url && (
            <a
              href={instructions.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              Open settings
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </a>
          )}
        </div>
      )}

      {error && (
        <p className="ml-0 sm:ml-[110px] pl-2.5 mb-2 text-[11px] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

/* ── Field input ── */
function FieldInput({ label, value, onChange, placeholder, type = 'text', icon }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400 w-[70px] sm:w-[90px] shrink-0 text-right">{label}</label>
      <div className="flex-1 relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-600">{icon}</span>}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={2}
            className="w-full px-2.5 py-1.5 text-[13px] rounded-md border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-500 transition-[border-color,box-shadow] duration-150 resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full h-8 text-[13px] rounded-md border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-500 transition-[border-color,box-shadow] duration-150 ${icon ? 'pl-8 pr-2.5' : 'px-2.5'}`}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────── Icons for social fields ─────────── */
const GithubIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const TwitterIcon = () => (
  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const GlobeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
);

export default function SetupModal({ open, onClose }) {
  const { handles, setHandles, profile, updateProfile } = useData();
  const { user } = useAuth();
  const [verified, setVerified] = useState({});
  const [profileDraft, setProfileDraft] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    location: profile.location || '',
    avatar: profile.avatar || '',
    github: profile.github || '',
    linkedin: profile.linkedin || '',
    twitter: profile.twitter || '',
    portfolio: profile.portfolio || '',
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('handles');

  useEffect(() => {
    if (open) {
      // Use verified_handles from server user, fallback to DataContext handles
      const vh = (user?.verified_handles && Object.keys(user.verified_handles).length > 0)
        ? user.verified_handles
        : handles;
      setVerified(vh || {});
      // Sync profile draft
      setProfileDraft({
        name: profile.name || '',
        bio: profile.bio || '',
        location: profile.location || '',
        avatar: profile.avatar || '',
        github: profile.github || '',
        linkedin: profile.linkedin || '',
        twitter: profile.twitter || '',
        portfolio: profile.portfolio || '',
      });
    }
  }, [open, user, handles, profile]);

  if (!open) return null;

  function handleVerified(platform, handle) {
    setVerified((prev) => {
      const next = { ...prev };
      if (handle) next[platform] = handle;
      else delete next[platform];
      return next;
    });
  }

  const hasAnyVerified = Object.values(verified).some((v) => v?.trim());

  async function handleSave() {
    setSaving(true);
    setHandles(verified);
    updateProfile(profileDraft);
    // refetch is auto-triggered by handles change via useEffect, just wait a tick
    await new Promise((r) => setTimeout(r, 100));
    setSaving(false);
    onClose();
  }

  const verifiedCount = Object.values(verified).filter((v) => v?.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-[520px] max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header — clean, minimal */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav — underline style */}
        <div className="px-5 border-b border-zinc-100 dark:border-zinc-800 flex gap-5">
          {[
            { id: 'handles', label: 'Platforms', count: verifiedCount || null },
            { id: 'profile', label: 'Profile' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative py-2.5 text-[13px] font-medium transition-colors ${
                tab === t.id
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
              }`}
            >
              {t.label}
              {t.count && (
                <span className="ml-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-px">{t.count}</span>
              )}
              {tab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'handles' ? (
            <div className="px-5 py-4">
              {/* Compact notice */}
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-3 leading-relaxed">
                Verify ownership by adding a code to your profile. You can remove it after.
              </p>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {platforms.map((p) => (
                  <HandleRow
                    key={p.key}
                    platform={p}
                    verified={verified[p.key] || ''}
                    onVerified={handleVerified}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-6">
              {/* Avatar */}
              <Section title="Profile Photo" description="Upload a photo or use the default avatar">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img
                      src={profileDraft.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${profileDraft.name || 'User'}`}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                    />
                    <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 cursor-pointer transition-all">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500 * 1024) {
                            alert('Image must be under 500KB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setProfileDraft({ ...profileDraft, avatar: ev.target.result });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400">JPG, PNG or GIF. Max 500KB.</span>
                    {profileDraft.avatar && (
                      <button
                        onClick={() => setProfileDraft({ ...profileDraft, avatar: '' })}
                        className="text-[12px] text-red-500 hover:text-red-600 font-medium text-left"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </Section>

              {/* Personal */}
              <Section title="Personal" description="Basic information shown on your profile">
                <div className="space-y-0.5">
                  <FieldInput
                    label="Name"
                    value={profileDraft.name || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, name: e.target.value })}
                    placeholder="Your name"
                  />
                  <FieldInput
                    label="Bio"
                    type="textarea"
                    value={profileDraft.bio || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                    placeholder="A few words about yourself"
                  />
                  <FieldInput
                    label="Location"
                    value={profileDraft.location || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
              </Section>

              {/* Socials */}
              <Section title="Links" description="Social profiles and website">
                <div className="space-y-0.5">
                  <FieldInput
                    label="GitHub"
                    icon={<GithubIcon />}
                    value={profileDraft.github || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, github: e.target.value })}
                    placeholder="https://github.com/..."
                  />
                  <FieldInput
                    label="LinkedIn"
                    icon={<LinkedInIcon />}
                    value={profileDraft.linkedin || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                  <FieldInput
                    label="X / Twitter"
                    icon={<TwitterIcon />}
                    value={profileDraft.twitter || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, twitter: e.target.value })}
                    placeholder="https://x.com/..."
                  />
                  <FieldInput
                    label="Website"
                    icon={<GlobeIcon />}
                    value={profileDraft.portfolio || ''}
                    onChange={(e) => setProfileDraft({ ...profileDraft, portfolio: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Footer — tight */}
        <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-8 px-3.5 text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasAnyVerified || saving}
            className="h-8 px-4 text-[13px] font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors flex items-center gap-1.5"
          >
            {saving ? <><Spin className="text-white dark:text-zinc-900" /> Saving...</> : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
