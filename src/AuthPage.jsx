
import { useState } from 'react'
import { supabase } from './supabase'
import { Leaf, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your full name.')
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        })

        if (error) throw error

        if (data.session) {
          setMessage('Account created successfully!')
        } else {
          setMessage(
            'Account created! Check your email to confirm your account, then log in.'
          )
          setIsLogin(true)
          setPassword('')
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Enter your email address first.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin }
    )

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage(
        'If an account exists for this email, a password reset link will be sent.'
      )
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9f6] px-4 py-10 text-stone-800">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-7 shadow-xl sm:p-9">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Leaf size={30} />
          </div>

          <h1 className="text-2xl font-bold">MacroSnap</h1>

          <p className="mt-2 text-sm text-stone-500">
            Your AI nutrition buddy
          </p>

          <h2 className="mt-6 text-xl font-semibold">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </h2>

          <p className="mt-1 text-sm text-stone-500">
            {isLogin
              ? 'Log in to continue your nutrition journey.'
              : 'Start building healthier habits today.'}
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Full name
              </label>

              <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3">
                <User size={18} className="text-stone-400" />

                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-transparent py-3 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Email address
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3">
              <Mail size={18} className="text-stone-400" />

              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent py-3 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Password
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3">
              <Lock size={18} className="text-stone-400" />

              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-transparent py-3 outline-none"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-stone-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-700 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading
              ? 'Please wait...'
              : isLogin
                ? 'Log In'
                : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setMessage('')
            }}
            className="font-semibold text-emerald-700 hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
