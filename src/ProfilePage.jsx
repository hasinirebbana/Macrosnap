
import { useState } from 'react'
import { UserRound, Mail, LogOut, ArrowLeft, Save } from 'lucide-react'
import { supabase } from './supabase'

export default function ProfilePage({ session, onBack }) {
  const user = session?.user

  const [name, setName] = useState(
    user?.user_metadata?.full_name || ''
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function saveProfile() {
    setSaving(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    })

    setSaving(false)
    setMessage(
      error ? error.message : 'Profile updated successfully!'
    )
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f6] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-stone-600 hover:text-green-700"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:p-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <UserRound size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                My Profile
              </h1>
              <p className="text-sm text-stone-500">
                Manage your MacroSnap account
              </p>
            </div>
          </div>

          <label className="mb-2 block text-sm font-medium text-stone-700">
            Full Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="mb-6 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-green-500"
          />

          <label className="mb-2 block text-sm font-medium text-stone-700">
            Email Address
          </label>
          <div className="mb-8 flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3 text-stone-600">
            <Mail size={18} />
            <span>{user?.email || 'No email available'}</span>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 font-medium text-white hover:bg-green-800 disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          {message && (
            <p className="mt-4 text-sm text-stone-600">
              {message}
            </p>
          )}

          <div className="my-8 border-t border-stone-100" />

          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
