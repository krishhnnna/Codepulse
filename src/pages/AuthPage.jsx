import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authSignup, authSignupVerify, authLogin, authLoginVerify } from '../services/api';

/* ── Spinner ── */
const Spinner = ({ size = 16, className = '' }) => (
  <svg className={`animate-spin ${className}`} width={size} height={size} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

/* ── OTP Input (6 digit boxes) ── */
function OTPInput({ length = 6, onComplete, disabled }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const [focused, setFocused] = useState(-1);
  const refs = useRef([]);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  function handleChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...values];
    next[i] = val;
    setValues(next);
    if (val && i < length - 1) refs.current[i + 1]?.focus();
    if (next.every((v) => v) && next.join('').length === length) {
      onComplete(next.join(''));
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !values[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!text) return;
    const next = Array(length).fill('');
    text.split('').forEach((ch, i) => { next[i] = ch; });
    setValues(next);
    const focusIdx = Math.min(text.length, length - 1);
    refs.current[focusIdx]?.focus();
    if (next.every((v) => v)) onComplete(next.join(''));
  }

  return (
    <div className="flex gap-1.5 sm:gap-2.5 justify-center" onPaste={handlePaste}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused(-1)}
          className={`
            w-9 sm:w-11 h-11 sm:h-12 text-center text-lg font-semibold rounded-lg
            border-2 bg-white dark:bg-zinc-900
            text-zinc-900 dark:text-white stat-number
            outline-none transition-all duration-200
            disabled:opacity-40
            ${v
              ? 'border-indigo-500 dark:border-indigo-400'
              : focused === i
                ? 'border-indigo-500 dark:border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)] dark:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            }
          `}
        />
      ))}
    </div>
  );
}

/* ── Input with icon ── */
function InputField({ icon, label, error: fieldError, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 block">{label}</label>
      <div className={`
        relative flex items-center rounded-lg border-2 bg-white dark:bg-zinc-900 transition-all duration-200
        ${focused
          ? 'border-indigo-500 dark:border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.1)] dark:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]'
          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
        }
      `}>
        <span className={`pl-3 transition-colors duration-200 ${focused ? 'text-indigo-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
          {icon}
        </span>
        <input
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          className="w-full px-3 py-2.5 text-[14px] bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
        />
      </div>
    </div>
  );
}

/* ── Background Grid ── */
function AuthBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base */}
      <div className="absolute inset-0 bg-zinc-50 dark:bg-zinc-950" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top-left glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/[0.07] dark:bg-indigo-500/[0.04] rounded-full blur-3xl" />
      {/* Bottom-right glow */}
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-500/[0.06] dark:bg-violet-500/[0.03] rounded-full blur-3xl" />
    </div>
  );
}

export default function AuthPage({ onSuccess }) {
  const { login } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSendOTP() {
    setError('');
    if (!email.trim()) { setError('Please enter your email address'); return; }
    if (mode === 'signup' && (!username.trim() || username.trim().length < 3)) {
      setError('Username must be at least 3 characters'); return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') await authSignup(email.trim(), username.trim());
      else await authLogin(email.trim());
      setStep('otp');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleVerifyOTP(otp) {
    setError('');
    setLoading(true);
    try {
      let data;
      if (mode === 'signup') data = await authSignupVerify(email.trim(), username.trim(), otp);
      else data = await authLoginVerify(email.trim(), otp);
      login(data.token, data.user);
      onSuccess?.();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuthBackground />

      {/* Theme toggle - top right */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-10 w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-amber-500 dark:text-zinc-600 dark:hover:text-amber-400 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200/60 dark:border-zinc-800/60 transition-all hover:scale-105 active:scale-95"
        title={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-[400px] relative z-10">

        {/* Logo + Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500 rounded-2xl mb-5">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 8L3 12l5 4" />
              <path d="M16 8l5 4-5 4" />
              <polyline points="9 15 11 11 13 14 15 9" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold text-zinc-900 dark:text-white tracking-tight">
            {step === 'form'
              ? <>{isLogin ? 'Welcome back' : 'Create account'}</>
              : 'Verify your email'
            }
          </h1>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1.5">
            {step === 'form'
              ? isLogin
                ? 'Sign in to your CodePulse account'
                : 'Start tracking your competitive programming journey'
              : <>Enter the code sent to <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span></>
            }
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl shadow-zinc-900/[0.04] dark:shadow-black/20 p-5 sm:p-7">

          {step === 'form' ? (
            <>
              {/* Mode tabs */}
              <div className="flex bg-zinc-100 dark:bg-zinc-800/80 rounded-xl p-1 gap-0.5 mb-6">
                {['login', 'signup'].map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); }}
                    className={`
                      flex-1 py-2 text-[13px] font-semibold rounded-[10px] transition-all duration-200
                      ${mode === m
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'
                      }
                    `}
                  >
                    {m === 'login' ? 'Log In' : 'Sign Up'}
                  </button>
                ))}
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <InputField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                  icon={
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  }
                />

                {mode === 'signup' && (
                  <InputField
                    label="Username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="choose a username"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    icon={
                      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    }
                  />
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-lg">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-[13px] text-red-600 dark:text-red-400 font-medium leading-snug">{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="
                  w-full mt-6 py-3 rounded-xl text-[14px] font-semibold
                  bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-white transition-all duration-200
                  shadow-sm hover:shadow-md hover:shadow-indigo-500/20
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <><Spinner size={16} /> Sending code...</>
                ) : (
                  <>
                    Continue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </button>
            </>
          ) : (
            /* ── OTP Step ── */
            <>
              {/* Email icon */}
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                  <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
                  </svg>
                </div>
              </div>

              <p className="text-center text-[13px] text-zinc-500 dark:text-zinc-400 mb-6">
                Enter the 6-digit verification code
              </p>

              <OTPInput onComplete={handleVerifyOTP} disabled={loading} />

              {/* Error */}
              {error && (
                <div className="flex items-center justify-center gap-2 mt-4 p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-[13px] text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              {/* Verifying state */}
              {loading && (
                <div className="flex items-center justify-center gap-2 mt-5 text-[13px] text-indigo-600 dark:text-indigo-400 font-medium">
                  <Spinner size={14} />
                  Verifying code...
                </div>
              )}

              {/* Resend + Back */}
              <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => { setStep('form'); setError(''); }}
                  className="text-[13px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="text-[13px] font-medium text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-40"
                >
                  Resend code
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom link */}
        <p className="text-center text-[13px] text-zinc-500 dark:text-zinc-400 mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          {' '}
          <button
            onClick={() => { setMode(isLogin ? 'signup' : 'login'); setStep('form'); setError(''); }}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-1.5 mt-8 opacity-40">
          <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 8L3 12l5 4" />
              <path d="M16 8l5 4-5 4" />
              <polyline points="9 15 11 11 13 14 15 9" />
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-600 tracking-wide">CodePulse</span>
        </div>
      </div>
    </div>
  );
}
