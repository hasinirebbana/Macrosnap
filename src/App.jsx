
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutDashboard, Camera, History, ChartNoAxesCombined, Settings,
  Leaf, Plus, Flame, Beef, Wheat, Droplets, Sparkles, Search,
  Menu, X, RefreshCw, Clock, Target ,Moon,Sun
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import './App.css'
import SettingsPage from './SettingsPage'
import AuthPage from './AuthPage'
import { supabase } from './supabase'
import ProfilePage from './ProfilePage'
const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '')
// Send Supabase access token with protected backend requests
async function authFetch(url, options = {}) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error('Session expired. Please log in again.')
  }

  const headers = new Headers(options.headers || {})

  headers.set(
    'Authorization',
    `Bearer ${session.access_token}`
  )

  return fetch(url, {
    ...options,
    headers,
  })
}
const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Meal Analyzer', icon: Camera },
  { label: 'Food Diary', icon: History },
  { label: 'Analytics', icon: ChartNoAxesCombined },
]

const COLORS = ['#43866a', '#e6a35c', '#8c82cf']

function normalizeMeal(meal) {
  const createdAt = meal.created_at || meal.createdAt || new Date().toISOString()

  return {
    id: meal.id || `${meal.food_name || meal.foodName}-${createdAt}`,
    name: meal.food_name || meal.foodName || meal.name || 'Analyzed meal',
    category: meal.meal_type || meal.category || 'Snack',
    createdAt,
    time: new Date(createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    calories: Number(meal.calories) || 0,
    protein: Number(meal.protein) || 0,
    carbs: Number(meal.carbs) || 0,
    fat: Number(meal.fat) || 0,
    emoji: '🍽️',
  }
}

function StatCard({ title, value, unit, goal, color, icon: Icon }) {
  const percentage = goal > 0 ? Math.min((value / goal) * 100, 100) : 0

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="rounded-xl p-3" style={{ color, backgroundColor: `${color}18` }}>
          <Icon size={22} />
        </div>
        <span className="text-xs text-stone-400">{Math.round(percentage)}%</span>
      </div>
      <p className="mt-5 text-sm text-stone-500">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-stone-800">
        {Math.round(value).toLocaleString()}
        <span className="ml-1 text-sm font-normal text-stone-400">{unit}</span>
      </p>
      <div className="mt-4 flex justify-between text-xs text-stone-400">
        <span>Goal: {goal.toLocaleString()} {unit}</span>
        <span>{Math.max(0, Math.round(goal - value))} left</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showProfilePage, setShowProfilePage] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [meals, setMeals] = useState([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [mealLoadError, setMealLoadError] = useState('')
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [foodDescription, setFoodDescription] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [mealType, setMealType] = useState('Breakfast')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisError, setAnalysisError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState('week')
  const [analyticsData, setAnalyticsData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const [calorieGoal, setCalorieGoal] = useState(2000)
  const [darkMode, setDarkMode] = useState(
  () => localStorage.getItem('macrosnap-theme') === 'dark'
)

function toggleDarkMode() {
  setDarkMode(current => {
    const next = !current
    localStorage.setItem('macrosnap-theme', next ? 'dark' : 'light')
    return next
  })
}
  const fileRef = useRef(null)
  useEffect(() => {
  let mounted = true

  async function checkSession() {
    const { data, error } = await supabase.auth.getSession()

    if (!mounted) return

    if (error) {
      console.error('Session error:', error.message)
    }

    setSession(data?.session ?? null)
    setAuthLoading(false)
  }

  checkSession()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession)
    setAuthLoading(false)
  })

  return () => {
    mounted = false
    subscription.unsubscribe()
  }
}, [])
  useEffect(() => {
  if (!session) return

  async function loadCalorieGoal() {
    try {
      const response = await authFetch(`${API_BASE}/api/goals`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load calorie goal.')
      }

      setCalorieGoal(data.calorie_goal ?? 2000)
    } catch (error) {
      console.error('Error loading calorie goal:', error)
    }
  }

  loadCalorieGoal()
}, [session])
  async function loadMeals() {
    setLoadingMeals(true)
    setMealLoadError('')

    try {
      const response = await authFetch(`${API_BASE}/api/meals`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not load saved meals.')
      }

      setMeals(Array.isArray(data) ? data.map(normalizeMeal) : [])
    } catch (error) {
      setMealLoadError(
        error.message || 'Unable to connect to the MacroSnap API.'
      )
    } finally {
      setLoadingMeals(false)
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true)
    setAnalyticsError('')

    try {
      const response = await authFetch(
  `${API_BASE}/api/analytics?period=${analyticsPeriod}`
    )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not load analytics.')
      }

      setAnalyticsData(data)
    } catch (error) {
      setAnalyticsError(
        error.message || 'Could not load analytics.'
      )
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
  if (session) {
    loadMeals()
  } else if (!authLoading) {
    setMeals([])
    setLoadingMeals(false)
  }
}, [session, authLoading])

  useEffect(() => {
  if (session && activePage === 'Analytics') {
    loadAnalytics()
  }
}, [session, activePage, analyticsPeriod])

  const todayMeals = useMemo(() => {
    const today = new Date().toDateString()

    return meals.filter(
      meal => new Date(meal.createdAt).toDateString() === today
    )
  }, [meals])

  const totals = useMemo(() => {
    return todayMeals.reduce(
      (sum, meal) => ({
        calories: sum.calories + meal.calories,
        protein: sum.protein + meal.protein,
        carbs: sum.carbs + meal.carbs,
        fat: sum.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }, [todayMeals])

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))

      const calories = meals
        .filter(
          meal =>
            new Date(meal.createdAt).toDateString() === date.toDateString()
        )
        .reduce((sum, meal) => sum + meal.calories, 0)

      return {
        day: date.toLocaleDateString([], { weekday: 'short' }),
        calories,
        goal: calorieGoal,
      }
    })
  }, [meals, calorieGoal])

  const macroData = [
    { name: 'Protein', value: totals.protein },
    { name: 'Carbs', value: totals.carbs },
    { name: 'Fat', value: totals.fat },
  ]

  const filteredMeals = meals.filter(meal =>
    `${meal.name} ${meal.category}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  function navigate(page) {
    setActivePage(page)
    setMobileOpen(false)
    setShowAnalyzer(page === 'Meal Analyzer')
  }

  function handleImage(event) {
    const file = event.target.files?.[0]

    if (file) {
      if (selectedImage?.url) URL.revokeObjectURL(selectedImage.url)
      setSelectedImage({ file, url: URL.createObjectURL(file) })
    }
  }

  async function analyzeMeal(event) {
    event.preventDefault()

    if (!foodDescription.trim() && !selectedImage) {
      setAnalysisError('Please describe your meal or upload a photo.')
      return
    }

    setAnalyzing(true)
    setAnalysisError('')
    setAnalysisResult(null)

    const formData = new FormData()

    if (foodDescription.trim()) {
      formData.append('description', foodDescription.trim())
    }

    formData.append('mealType', mealType)

    if (selectedImage?.file) {
      formData.append('image', selectedImage.file)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 90000)

    try {
      const response = await authFetch(`${API_BASE}/api/analyze-meal`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Meal analysis failed.')
      }

      setAnalysisResult(data)

      // The backend already saves the meal to Supabase.
      // Reload from the database to avoid duplicate local records.
      await loadMeals()

      setFoodDescription('')

      if (selectedImage?.url) URL.revokeObjectURL(selectedImage.url)
      setSelectedImage(null)

      if (fileRef.current) fileRef.current.value = ''
    } catch (error) {
      setAnalysisError(
        error.name === 'AbortError'
          ? 'Analysis took too long. Please try again.'
          : error.message || 'Unable to connect to the MacroSnap API.'
      )
    } finally {
      clearTimeout(timeoutId)
      setAnalyzing(false)
    }
  }

  function Sidebar() {
    return (
      <div className="flex min-h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
            <Leaf size={25} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-800">MacroSnap</h1>
            <p className="text-xs text-stone-400">Your AI nutrition buddy</p>
          </div>
        </div>

        <div className="px-4 pt-5">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
            Workspace
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => navigate(label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  activePage === label
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-stone-500 hover:bg-stone-50'
                }`}
              >
                <Icon size={19} />
                {label}
                {label === 'Meal Analyzer' && (
                  <span className="ml-auto rounded-md bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                    AI
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-4 pt-8">
          <p className="mb-3 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
            Preferences
          </p>
          <button
            onClick={() => navigate('Settings')}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm ${
              activePage === 'Settings'
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Settings size={19} /> Settings
          </button>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-800">
              <Sparkles size={17} />
              <span className="text-sm font-semibold">Small steps count</span>
            </div>
            <p className="text-xs leading-5 text-emerald-900/70">
              Build healthy habits one meal at a time. Progress, not perfection.
            </p>
          </div>
          <div className="mt-5 border-t border-stone-100 px-2 pt-5">
  
<button
  type="button"
  onClick={() => setShowProfilePage(true)}
  className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-stone-200 hover:bg-stone-700"
>
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-800">
    H
  </div>
  <div>
    <p className="text-sm font-semibold">Your profile</p>
    <p className="text-xs text-stone-400">Nutrition explorer</p>
  </div>
</button>
</div>
        </div>
      </div>
    )
  }

  const calorieRemaining = Math.max(calorieGoal - totals.calories, 0)
  if (authLoading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9f6] text-stone-700">
      Loading MacroSnap...
    </div>
  )
}

if (!session) {
  return <AuthPage />
}
if (showProfilePage) {
  return (
    <ProfilePage
      session={session}
      onBack={() => setShowProfilePage(false)}
    />
  )
}

  return (
    <div className={`min-h-screen text-stone-800 ${darkMode ? 'dark-mode' : 'bg-[#f8f9f6]'}`}>
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] overflow-y-auto border-r border-stone-200 bg-white transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar />
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 rounded-lg p-2 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </aside>

      <main className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 hover:bg-stone-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div>
              <p className="hidden text-xs text-stone-400 sm:block">
                Your space / {activePage}
              </p>
              <h2 className="text-lg font-semibold">{activePage}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
  <button
    onClick={toggleDarkMode}
    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    className="rounded-xl border border-stone-200 p-2.5 text-stone-500 transition hover:bg-stone-100"
  >
    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
  </button>

  <button
    onClick={loadMeals}
    disabled={loadingMeals}
    className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
  >
    <RefreshCw size={15} className={loadingMeals ? 'animate-spin' : ''} />
    Refresh
  </button>
</div>
          
        </header>

        <div className="mx-auto max-w-[1500px] p-4 sm:p-7 lg:p-10">
          {activePage === 'Settings' ? (
            <SettingsPage />
          ) : (
            <>
              <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <Sparkles size={16} /> YOUR DAILY WELLNESS
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                    {activePage === 'Meal Analyzer'
                      ? 'Let’s understand your meal.'
                      : activePage === 'Food Diary'
                        ? 'Your food diary.'
                        : activePage === 'Analytics'
                          ? 'Your nutrition insights.'
                          : 'A little better, every day.'}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-stone-500">
                    Nourish your body, celebrate your progress, and find your balance.
                  </p>
                </div>
                <button
                  onClick={() => navigate('Meal Analyzer')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-800"
                >
                  <Plus size={18} /> Analyze a meal
                </button>
              </section>

              {mealLoadError && (
                <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {mealLoadError}
                  <button onClick={loadMeals} className="ml-2 font-semibold underline">
                    Retry
                  </button>
                </div>
              )}

              {loadingMeals && (
                <p className="mb-4 text-sm text-stone-400">
                  Loading saved nutrition data...
                </p>
              )}

              {showAnalyzer && (
                <section className="mb-8 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
                        <Sparkles size={19} /> AI Meal Analyzer
                      </h3>
                      <p className="mt-1 text-sm text-stone-500">
                        Upload a photo or describe your food.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAnalyzer(false)}
                      aria-label="Close analyzer"
                      className="rounded-lg p-2 text-stone-400 hover:bg-stone-100"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <form onSubmit={analyzeMeal} className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex min-h-[190px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-5 hover:border-emerald-400"
                      >
                        {selectedImage ? (
                          <img
                            src={selectedImage.url}
                            alt="Selected meal"
                            className="max-h-48 rounded-xl object-contain"
                          />
                        ) : (
                          <>
                            <Camera size={28} className="mb-3 text-emerald-700" />
                            <span className="text-sm font-semibold">
                              Click to upload a meal photo
                            </span>
                            <span className="mt-1 text-xs text-stone-400">
                              PNG, JPG or WebP
                            </span>
                          </>
                        )}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleImage}
                      />
                    </div>

                    <div className="flex flex-col gap-4">
                      <label className="text-sm font-medium">
                        What did you eat?
                        <textarea
                          value={foodDescription}
                          onChange={event => setFoodDescription(event.target.value)}
                          placeholder="e.g. Two idlis with sambar and chutney..."
                          rows={4}
                          className="mt-2 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-emerald-600"
                        />
                      </label>

                      <label className="text-sm font-medium">
                        Meal type
                        <select
                          value={mealType}
                          onChange={event => setMealType(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm"
                        >
                          <option>Breakfast</option>
                          <option>Lunch</option>
                          <option>Dinner</option>
                          <option>Snack</option>
                        </select>
                      </label>

                      <button
                        type="submit"
                        disabled={analyzing || (!foodDescription.trim() && !selectedImage)}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        <Sparkles size={16} />
                        {analyzing ? 'Analyzing your meal...' : 'Analyze with AI'}
                      </button>
                    </div>
                  </form>

                  {analyzing && (
                    <p className="mt-5 text-sm text-emerald-700">
                      Analyzing your meal with Gemini AI. Please wait...
                    </p>
                  )}

                  {analysisError && (
                    <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                      {analysisError}
                    </p>
                  )}

                  {analysisResult && (
                    <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
                      <h3 className="text-lg font-semibold">
                        {analysisResult.foodName || 'Meal analysis'}
                      </h3>
                      <p className="mt-1 text-sm text-stone-500">
                        Estimated nutrition for the analyzed portion
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ['Calories', analysisResult.calories, 'kcal'],
                          ['Protein', analysisResult.protein, 'g'],
                          ['Carbs', analysisResult.carbs, 'g'],
                          ['Fat', analysisResult.fat, 'g'],
                        ].map(([label, value, unit]) => (
                          <div key={label} className="rounded-xl bg-white p-3">
                            <p className="text-xs text-stone-500">{label}</p>
                            <p className="mt-1 text-xl font-semibold">
                              {value ?? '—'} <span className="text-xs font-normal">{unit}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                      {analysisResult.portionAssumptions && (
                        <p className="mt-4 text-sm text-stone-600">
                          <strong>Portion assumptions:</strong>{' '}
                          {analysisResult.portionAssumptions}
                        </p>
                      )}
                      {analysisResult.note && (
                        <p className="mt-2 text-sm text-stone-600">
                          {analysisResult.note}
                        </p>
                      )}
                      <p className="mt-4 text-xs text-stone-400">
                        AI nutrition estimates are approximate, especially when based on photos.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {activePage === 'Food Diary' ? (
                <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-semibold">Your saved meals</h3>
                      <p className="mt-1 text-sm text-stone-400">
                        Meal history loaded from your backend.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2">
                      <Search size={16} className="text-stone-400" />
                      <input
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                        placeholder="Search meals..."
                        className="w-full text-sm outline-none sm:w-48"
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {filteredMeals.map(meal => (
                      <div key={meal.id} className="flex items-center gap-3 rounded-xl bg-stone-50 p-4">
                        <span className="text-2xl">{meal.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{meal.name}</p>
                          <p className="mt-1 text-xs text-stone-400">
                            {meal.category} · {new Date(meal.createdAt).toLocaleDateString()} · {meal.time}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            Protein {meal.protein}g · Carbs {meal.carbs}g · Fat {meal.fat}g
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{meal.calories} kcal</span>
                      </div>
                    ))}
                    {!loadingMeals && filteredMeals.length === 0 && (
                      <p className="py-8 text-center text-sm text-stone-400">
                        No matching meals found.
                      </p>
                    )}
                  </div>
                </section>
              ) : (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard title="Calories consumed" value={totals.calories} unit="kcal" goal={calorieGoal} icon={Flame} color="#e58b48" />
                    <StatCard title="Protein intake" value={totals.protein} unit="g" goal={100} icon={Beef} color="#43866a" />
                    <StatCard title="Carbohydrates" value={totals.carbs} unit="g" goal={250} icon={Wheat} color="#d4a04c" />
                    <StatCard title="Healthy fats" value={totals.fat} unit="g" goal={65} icon={Droplets} color="#8c82cf" />
                  </section>

                  <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                      <h3 className="font-semibold">Calorie overview</h3>
                      <p className="mt-1 text-sm text-stone-400">
                        Your intake over the last 7 days
                      </p>
                      <div className="mt-6 h-[270px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weeklyData}>
                            <defs>
                              <linearGradient id="calorieFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#43866a" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#43866a" stopOpacity={0.01} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#f0f0ec" strokeDasharray="4 5" vertical={false} />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area dataKey="goal" name="Daily goal" stroke="#d6d3d1" strokeDasharray="5 5" fill="none" />
                            <Area dataKey="calories" name="Calories" stroke="#43866a" strokeWidth={3} fill="url(#calorieFill)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                      <h3 className="font-semibold">Today's nutrition</h3>
                      <p className="mt-1 text-sm text-stone-400">
                        Estimated macronutrients
                      </p>
                      <div className="relative mx-auto mt-4 h-[210px] max-w-[270px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={macroData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={58}
                              outerRadius={82}
                              paddingAngle={4}
                              stroke="none"
                            >
                              {macroData.map((entry, index) => (
                                <Cell key={entry.name} fill={COLORS[index]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-semibold">
                            {Math.round(totals.protein + totals.carbs + totals.fat)}g
                          </span>
                          <span className="text-xs text-stone-400">Total macros</span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {macroData.map((macro, index) => (
                          <div key={macro.name} className="flex justify-between text-sm">
                            <span className="flex items-center gap-2 text-stone-500">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                              {macro.name}
                            </span>
                            <span className="font-semibold">{Math.round(macro.value)} g</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {activePage === 'Analytics' && (
  <div className="mt-6 space-y-6">
    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Nutrition Analytics</h3>
          <p className="mt-1 text-sm text-stone-500">
            Track your nutrition and progress toward your goals.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAnalyticsPeriod('week')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              analyticsPeriod === 'week'
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setAnalyticsPeriod('month')}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              analyticsPeriod === 'month'
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {analyticsLoading && (
        <p className="py-10 text-center text-sm text-stone-500">
          Loading nutrition analytics...
        </p>
      )}

      {analyticsError && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {analyticsError}
          <button
            onClick={loadAnalytics}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {!analyticsLoading && !analyticsError && analyticsData && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-sm text-stone-500">Total calories</p>
              <p className="mt-2 text-2xl font-bold text-orange-700">
                {Math.round(analyticsData.totals?.calories || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                kcal this {analyticsPeriod}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-stone-500">Average calories</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">
                {Math.round(analyticsData.average?.calories || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-stone-500">kcal per day</p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-sm text-stone-500">Days logged</p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {analyticsData.loggedDays || 0}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                days with recorded meals
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-sm text-stone-500">Goal achievement</p>
              <p className="mt-2 text-2xl font-bold text-purple-700">
                {Math.round(analyticsData.averageGoalAchievement || 0)}%
              </p>
              <p className="mt-1 text-xs text-stone-500">
                average calorie goal progress
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h4 className="font-semibold">Daily calorie trend</h4>
            <p className="mt-1 text-sm text-stone-500">
              Compare your daily intake with your calorie goal.
            </p>

            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
  dataKey="day"
  tick={{ fontSize: 12 }}
  interval="preserveStartEnd"
/>
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="calories"
                    name="Calories consumed"
                    stroke="#059669"
                    fill="#a7f3d0"
                  />
                  <Area
                    type="monotone"
                    dataKey="goal"
                    name="Calorie goal"
                    stroke="#f59e0b"
                    fill="#fde68a"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8">
            <h4 className="font-semibold">Daily macronutrients</h4>
            <p className="mt-1 text-sm text-stone-500">
              Protein, carbohydrates, and fat consumed each day.
            </p>

            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="protein" name="Protein (g)" fill="#3b82f6" />
                  <Bar dataKey="carbs" name="Carbs (g)" fill="#f59e0b" />
                  <Bar dataKey="fat" name="Fat (g)" fill="#a78bfa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-stone-200 p-5">
              <h4 className="font-semibold">Best nutrition day</h4>
              {analyticsData.bestDay ? (
                <>
                  <p className="mt-3 text-xl font-bold text-emerald-700">
                    {analyticsData.bestDay.day}
                  </p>
                  <p className="mt-2 text-sm text-stone-500">
                    {Math.round(analyticsData.bestDay.calories || 0)} kcal
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-stone-500">
                  Record meals to discover your best day.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-stone-200 p-5">
              <h4 className="font-semibold">Period summary</h4>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-stone-500">Average protein</span>
                  <span className="font-semibold">
                    {Math.round(analyticsData.average?.protein || 0)} g/day
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-stone-500">Average carbs</span>
                  <span className="font-semibold">
                    {Math.round(analyticsData.average?.carbs || 0)} g/day
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-stone-500">Average fat</span>
                  <span className="font-semibold">
                    {Math.round(analyticsData.average?.fat || 0)} g/day
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  </div>
)}

                  <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                    <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-7">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Recent meals</h3>
                          <p className="mt-1 text-sm text-stone-400">
                            Meals recorded today
                          </p>
                        </div>
                        <button onClick={() => navigate('Food Diary')} className="text-sm font-semibold text-emerald-700">
                          View diary →
                        </button>
                      </div>
                      <div className="mt-4 divide-y divide-stone-100">
                        {todayMeals.slice(0, 5).map(meal => (
                          <div key={meal.id} className="flex items-center gap-3 py-3">
                            <span className="text-2xl">{meal.emoji}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{meal.name}</p>
                              <p className="mt-1 flex items-center gap-1 text-xs text-stone-400">
                                <Clock size={12} /> {meal.time} · {meal.category}
                              </p>
                            </div>
                            <span className="text-sm font-semibold">{meal.calories} kcal</span>
                          </div>
                        ))}
                        {!loadingMeals && todayMeals.length === 0 && (
                          <p className="py-8 text-center text-sm text-stone-400">
                            No meals recorded today. Analyze a meal to get started.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#244c3b] p-6 text-white">
                      <div className="flex items-center gap-2 text-emerald-200">
                        <Target size={20} /> <span className="text-sm">Daily goal</span>
                      </div>
                      <p className="mt-5 text-3xl font-semibold">
                        {calorieRemaining.toLocaleString()}
                        <span className="text-base font-normal text-emerald-100/70"> kcal left</span>
                      </p>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/75">
                        Build awareness of your food choices. Progress matters more than perfection.
                      </p>
                      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
                        <div
                          className="h-full rounded-full bg-emerald-300"
                          style={{ width: `${Math.min(totals.calories / calorieGoal * 100, 100)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-emerald-100/70">
                        <span>{Math.round(totals.calories)} consumed</span>
                        <span>{calorieGoal} goal</span>
                      </div>
                      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
                        <Sparkles size={18} className="text-emerald-200" />
                        <p className="mt-2 text-sm font-semibold">A gentle reminder</p>
                        <p className="mt-1 text-xs leading-5 text-emerald-100/70">
                          Nutrition estimates are approximate. One meal doesn't define your health.
                        </p>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-stone-200 py-5 text-xs text-stone-400 sm:flex-row">
            <span>© 2026 MacroSnap · Built with care.</span>
            <span>AI-powered nutrition estimates · Not medical advice</span>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
