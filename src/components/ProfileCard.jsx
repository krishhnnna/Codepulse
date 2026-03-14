import { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { PLATFORM_LIST } from '../utils/platformConfig';

/* ── Verified badge (green hexagonal check like Codolio) ── */
function VerifiedBadge() {
  return (
    <svg className="w-[18px] h-[18px] inline-block ml-1 -mt-0.5" viewBox="0 0 24 24" fill="none">
      <path d="M12 1l2.39 1.68h2.93l.96 2.76L21 7.61v2.93l1.68 2.39L21 15.32v2.93l-2.76.96-1.68 2.39h-2.93L12 23l-2.39-1.68H6.68l-.96-2.76L3 16.39v-2.93L1.32 11.07 3 8.68V5.75l2.76-.96L7.44 2.4h2.93L12 1z" fill="#10B981" />
      <path d="M9.5 12.5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── External link icon ── */
function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

export default function ProfileCard() {
  const { profile, handles } = useData();
  const { user } = useAuth();
  const [statsOpen, setStatsOpen] = useState(true);

  const name = profile.name || Object.values(handles).find(Boolean) || 'User';
  const authUsername = user?.username || '';
  const bio = profile.bio || '';
  const location = profile.location || '';

  const links = {
    github: profile.github || '',
    linkedin: profile.linkedin || '',
    twitter: profile.twitter || '',
    portfolio: profile.portfolio || '',
  };

  /* Build avatar — use uploaded photo if available, else dicebear fallback */
  const avatar = profile.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${name}`;

  /* Ensure URLs have protocol prefix */
  function normalizeUrl(url) {
    if (!url) return '';
    url = url.trim();
    if (url && !/^https?:\/\//i.test(url)) return 'https://' + url;
    return url;
  }

  /* Social links config */
  const socialLinks = [
    { key: 'github', url: links.github, label: 'GitHub', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    )},
    { key: 'linkedin', url: links.linkedin, label: 'LinkedIn', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )},
    { key: 'twitter', url: links.twitter, label: 'X', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )},
    { key: 'portfolio', url: links.portfolio, label: 'Website', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )},
  ].filter((l) => l.url);

  /* Normalize all URLs */
  socialLinks.forEach((l) => { l.url = normalizeUrl(l.url); });

  return (
    <div className="card lg:sticky lg:top-20 overflow-hidden">
      {/* ── Avatar ── */}
      <div className="flex justify-center pt-8 pb-4">
        <img
          src={avatar}
          alt={name}
          className="w-[120px] h-[120px] rounded-full object-cover border-4 border-white dark:border-zinc-700 shadow-lg bg-zinc-100 dark:bg-zinc-800"
        />
      </div>

      {/* ── Name & Username ── */}
      <div className="text-center px-6 pb-1">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">{name}</h2>
        <p className="mt-1">
          <span className="text-sm font-medium text-indigo-500">@{authUsername || name.replace(/\s+/g, '_').toLowerCase()}</span>
          <VerifiedBadge />
        </p>
      </div>

      {/* ── Bio ── */}
      {bio && (
        <p className="text-center text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed px-6 mt-2 mb-1">
          {bio}
        </p>
      )}

      {/* ── Divider ── */}
      <div className="mx-6 my-4 border-t border-zinc-100 dark:border-zinc-800" />

      {/* ── Social Links ── */}
      {socialLinks.length > 0 && (
        <div className="flex items-center justify-center gap-4 px-6 pb-1">
          {socialLinks.map((link) => (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title={link.label}
            >
              {link.icon}
            </a>
          ))}
        </div>
      )}

      {/* ── Location ── */}
      {location && (
        <div className="px-6 mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <svg className="w-[18px] h-[18px] text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {location}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div className="mx-6 my-4 border-t border-zinc-100 dark:border-zinc-800" />

      {/* ── Problem Solving Stats (collapsible) ── */}
      <div className="px-6 pb-6">
        {/* Header with toggle */}
        <button
          onClick={() => setStatsOpen(!statsOpen)}
          className="w-full flex items-center justify-between mb-1 group cursor-pointer"
        >
          <span className="text-[15px] font-semibold text-zinc-900 dark:text-white">
            Problem Solving Stats
          </span>
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${statsOpen ? '' : 'rotate-180'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>

        {/* Platform list */}
        {statsOpen && (
          <div className="mt-4 space-y-1">
            {PLATFORM_LIST.map((p) => {
              const isConnected = !!handles[p.key];
              const profileUrl = isConnected ? p.url + handles[p.key] : '#';

              return (
                <div
                  key={p.key}
                  className="flex items-center justify-between py-3 group"
                >
                  {/* Left: icon + name */}
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center shrink-0">
                      <p.Icon size={24} color={isConnected ? p.color : '#a1a1aa'} />
                    </span>
                    <span className={`text-[15px] font-semibold ${isConnected ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400 dark:text-zinc-600'}`}>
                      {p.name}
                    </span>
                  </div>

                  {/* Right: checkmark + external link */}
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none">
                        <path d="M12 1l2.39 1.68h2.93l.96 2.76L21 7.61v2.93l1.68 2.39L21 15.32v2.93l-2.76.96-1.68 2.39h-2.93L12 23l-2.39-1.68H6.68l-.96-2.76L3 16.39v-2.93L1.32 11.07 3 8.68V5.75l2.76-.96L7.44 2.4h2.93L12 1z" fill="#10B981" />
                        <path d="M9.5 12.5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="w-[22px] h-[22px] rounded-full border-2 border-zinc-200 dark:border-zinc-700 inline-block" />
                    )}
                    {isConnected && (
                      <a href={profileUrl} target="_blank" rel="noreferrer" className="hover:opacity-70 transition-opacity">
                        <ExternalLinkIcon />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
