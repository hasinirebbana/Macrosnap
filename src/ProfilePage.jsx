import { useState } from 'react'
import {
  UserRound,
  Mail,
  LogOut,
  ArrowLeft,
  Save,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { supabase } from './supabase'

export default function ProfilePage({ session, onBack }) {
  const user = session?.user

  const initialName = user?.user_metadata?.full_name || ''

  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const hasChanges = name.trim() !== initialName.trim()

  async function saveProfile(e) {
    e.preventDefault()

    if (!name.trim()) {
      setMessage('Please enter your full name.')
      setMessageType('error')
      return
    }

    if (!hasChanges) return

    setSaving(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      })

      if (error) throw error

      setMessage('Your profile has been updated successfully.')
      setMessageType('success')
    } catch (error) {
      setMessage(error.message || 'Something went wrong.')
      setMessageType('error')
    } finally {
      setSaving(false)
    }
  }

  async function logout() {
    const confirmed = window.confirm(
      'Are you sure you want to log out?'
    )

    if (!confirmed) return

    setLoggingOut(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) throw error
    } catch (error) {
      setMessage(error.message || 'Unable to log out.')
      setMessageType('error')
      setLoggingOut(false)
    }
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-[#f5f8f5] px-4 py-6 sm:px-6 sm:py-10">

      <div className="mx-auto max-w-2xl">

        {/* Back navigation */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 rounded-lg
            text-sm font-medium text-stone-500
            transition hover:text-green-700"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        {/* Profile card */}
        <div className="overflow-hidden rounded-3xl border
          border-stone-200/80 bg-white shadow-sm">

          {/* Header */}
          <div className="border-b border-stone-100
            bg-gradient-to-r from-green-50 to-white
            px-6 py-8 sm:px-10">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 shrink-0
                items-center justify-center rounded-2xl
                bg-green-100 text-2xl font-bold text-green-800">
                {initials}
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight
                  text-stone-900">
                  My Profile
                </h1>

                <p className="mt-1 text-sm text-stone-500">
                  Manage your MacroSnap account
                </p>
              </div>

            </div>
          </div>

          <div className="p-6 sm:p-10">

            {/* Account information */}
            <div className="mb-7 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-800">
                Account Information
              </h2>

              <span className="flex items-center gap-1.5
                rounded-full bg-green-50 px-3 py-1
                text-xs font-medium text-green-700">
                <ShieldCheck size={14} />
                Account
              </span>
            </div>

            <form onSubmit={saveProfile}>

              {/* Full name */}
              <div className="mb-6">
                <label
                  htmlFor="full-name"
                  className="mb-2 block text-sm font-medium
                    text-stone-700"
                >
                  Full Name
                </label>

                <input
                  id="full-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setMessage('')
                  }}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className="w-full rounded-xl border
                    border-stone-200 bg-white px-4 py-3
                    text-sm text-stone-800 outline-none
                    transition placeholder:text-stone-400
                    focus:border-green-500
                    focus:ring-4 focus:ring-green-100"
                />
              </div>

              {/* Email address */}
              <div className="mb-8">
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium
                    text-stone-700"
                >
                  Email Address
                </label>

                <div className="flex items-center gap-3
                  rounded-xl border border-stone-100
                  bg-stone-50 px-4 py-3">

                  <Mail size={18} className="text-stone-400" />

                  <span
                    id="email"
                    className="min-w-0 flex-1 break-all
                      text-sm text-stone-600"
                  >
                    {user?.email || 'No email available'}
                  </span>

                </div>

                <p className="mt-2 text-xs text-stone-400">
                  Your email address cannot be changed here.
                </p>
              </div>

              {/* Save button */}
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="flex w-full items-center
                  justify-center gap-2 rounded-xl
                  bg-green-700 px-4 py-3.5
                  text-sm font-semibold text-white
                  transition hover:bg-green-800
                  disabled:cursor-not-allowed
                  disabled:bg-green-300"
              >
                <Save size={18} />

                {saving
                  ? 'Saving changes...'
                  : 'Save Changes'}
              </button>

              {/* Feedback message */}
              {message && (
                <div
                  role="status"
                  className={`mt-4 flex items-start gap-2
                    rounded-xl p-3 text-sm ${
                    messageType === 'success'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-600'
                  }`}
                >
                  {messageType === 'success' && (
                    <CheckCircle2
                      size={18}
                      className="shrink-0"
                    />
                  )}

                  <span>{message}</span>
                </div>
              )}

            </form>

            {/* Logout section */}
            <div className="mt-10 border-t border-stone-100 pt-8">

              <h2 className="mb-2 text-base font-semibold
                text-stone-800">
                Sign Out
              </h2>

              <p className="mb-5 text-sm text-stone-500">
                Sign out of your MacroSnap account on this device.
              </p>

              <button
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full items-center
                  justify-center gap-2 rounded-xl
                  border border-red-200 px-4 py-3
                  text-sm font-medium text-red-600
                  transition hover:bg-red-50
                  disabled:opacity-60"
              >
                <LogOut size={18} />

                {loggingOut ? 'Signing out...' : 'Log Out'}
              </button>

            </div>

          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          MacroSnap · Your nutrition journey, simplified.
        </p>

      </div>
    </div>
  )
}
