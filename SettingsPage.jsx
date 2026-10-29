
import { useEffect, useState } from 'react'
import { Save, Target, LoaderCircle } from 'lucide-react'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '')

export default function SettingsPage() {
  const [goals, setGoals] = useState({
    calorie_goal: 2000,
    protein_goal: 100,
    carbs_goal: 250,
    fat_goal: 65,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadGoals() {
      try {
        const response = await fetch(`${API_BASE}/api/goals`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load nutrition goals.')
        }

        setGoals({
          calorie_goal: data.calorie_goal ?? 2000,
          protein_goal: data.protein_goal ?? 100,
          carbs_goal: data.carbs_goal ?? 250,
          fat_goal: data.fat_goal ?? 65,
        })
      } catch (err) {
        setError(err.message || 'Unable to connect to the server.')
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target

    setGoals(previous => ({
      ...previous,
      [name]: value === '' ? '' : Number(value),
    }))
    setMessage('')
    setError('')
  }

  async function saveGoals(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    for (const [name, value] of Object.entries(goals)) {
      if (value === '' || !Number.isFinite(Number(value)) || Number(value) <= 0) {
        setError(`Please enter a positive number for ${name.replace('_goal', '').replace('_', ' ')}.`)
        setSaving(false)
        return
      }
    }

    try {
      const response = await fetch(`${API_BASE}/api/goals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calorie_goal: Number(goals.calorie_goal),
          protein_goal: Number(goals.protein_goal),
          carbs_goal: Number(goals.carbs_goal),
          fat_goal: Number(goals.fat_goal),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save nutrition goals.')
      }

      setGoals({
        calorie_goal: data.calorie_goal,
        protein_goal: data.protein_goal,
        carbs_goal: data.carbs_goal,
        fat_goal: data.fat_goal,
      })

      setMessage('Your nutrition goals have been saved successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save nutrition goals.')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    {
      name: 'calorie_goal',
      label: 'Daily calorie goal',
      unit: 'kcal',
      description: 'Your target daily energy intake.',
    },
    {
      name: 'protein_goal',
      label: 'Daily protein goal',
      unit: 'g',
      description: 'Your target daily protein intake.',
    },
    {
      name: 'carbs_goal',
      label: 'Daily carbohydrate goal',
      unit: 'g',
      description: 'Your target daily carbohydrate intake.',
    },
    {
      name: 'fat_goal',
      label: 'Daily fat goal',
      unit: 'g',
      description: 'Your target daily fat intake.',
    },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <Target size={24} />
          </div>

          <div>
            <h3 className="text-xl font-semibold">Your preferences</h3>
            <p className="mt-1 text-sm text-stone-500">
              Customize your daily nutrition goals.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-stone-500">
            <LoaderCircle size={20} className="animate-spin" />
            Loading your saved goals...
          </div>
        ) : (
          <form onSubmit={saveGoals} className="mt-7 space-y-5">
            {fields.map(field => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-stone-700"
                >
                  {field.label}
                </label>

                <p className="mt-1 text-xs text-stone-400">
                  {field.description}
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={goals[field.name]}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />

                  <span className="w-12 shrink-0 text-sm text-stone-500">
                    {field.unit}
                  </span>
                </div>
              </div>
            ))}

            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {saving ? 'Saving...' : 'Save nutrition goals'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
