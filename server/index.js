import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import multer from 'multer'

dotenv.config({
  path: fileURLToPath(new URL('./.env', import.meta.url)),
})

const app = express()
const PORT = process.env.PORT || 3001

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:5173'
)
  .split(',')
  .map(origin => origin.trim())

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origin not allowed by CORS'))
  },
}))
app.use(express.json())

const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required.',
    })
  }

  const token = authHeader.slice(7)

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired session.',
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Authentication failed:', error.message)

    return res.status(401).json({
      error: 'Authentication failed.',
    })
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'MacroSnap API' })
})

app.get('/api/meals', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error('Loading meals failed:', error.message)

    res.status(500).json({
      error: 'Could not load saved meals.',
    })
  }
})

app.post(
  '/api/analyze-meal',
  requireAuth,
  upload.single('image'),
  async (req, res) => {
    try {
      const description = req.body.description?.trim() || ''
      const image = req.file

      if (!description && !image) {
        return res.status(400).json({
          error: 'Describe your meal or upload a photo.',
        })
      }

      if (
        image &&
        !['image/jpeg', 'image/png', 'image/webp'].includes(
          image.mimetype
        )
      ) {
        return res.status(400).json({
          error: 'Please upload a JPG, PNG, or WebP image.',
        })
      }

      const parts = [
        {
          text: `You are MacroSnap, a friendly AI nutrition assistant.

Analyze the meal and estimate its nutrition.

Return ONLY a JSON object with:
foodName (string),
calories (number),
protein (number),
carbs (number),
fat (number),
portionAssumptions (string),
note (string).

Use realistic estimates and mention uncertainty.
Nutrition values are estimates, not exact measurements.

Food description: ${
            description || 'Identify the food in the image.'
          }`,
        },
      ]

      if (image) {
        parts.push({
          inlineData: {
            mimeType: image.mimetype,
            data: image.buffer.toString('base64'),
          },
        })
      }

      const response = await geminiClient.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
        },
      })

      const result = JSON.parse(response.text)

      for (const field of [
        'calories',
        'protein',
        'carbs',
        'fat',
      ]) {
        if (
          typeof result[field] !== 'number' ||
          !Number.isFinite(result[field]) ||
          result[field] < 0
        ) {
          throw new Error(
            `Gemini returned an invalid ${field} value.`
          )
        }
      }

      if (
        typeof result.foodName !== 'string' ||
        !result.foodName.trim()
      ) {
        throw new Error('Gemini did not return a food name.')
      }

      const meal = {
        user_id: req.user.id,
        food_name: result.foodName,
        meal_type: req.body.mealType || 'Snack',
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        portion_assumptions: result.portionAssumptions || '',
        note: result.note || '',
      }

      const { data: savedMeal, error: saveError } =
        await supabase
          .from('meals')
          .insert(meal)
          .select()
          .single()

      if (saveError) throw saveError

      res.json({
        ...result,
        id: savedMeal.id,
        created_at: savedMeal.created_at,
        estimated: true,
      })
    } catch (error) {
      console.error(
        'Meal analysis/save failed:',
        error.message
      )

      res.status(500).json({
        error:
          'Meal analysis or saving failed. Check the backend terminal.',
      })
    }
  }
)

app.get('/api/goals', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const { data: newGoals, error: insertError } =
        await supabase
          .from('nutrition_goals')
          .insert({
            user_id: req.user.id,
          })
          .select()
          .single()

      if (insertError) throw insertError

      return res.json(newGoals)
    }

    res.json(data)
  } catch (error) {
    console.error(
      'Loading nutrition goals failed:',
      error.message
    )

    res.status(500).json({
      error: 'Could not load nutrition goals.',
    })
  }
})

app.put('/api/goals', requireAuth, async (req, res) => {
  try {
    const fields = [
      'calorie_goal',
      'protein_goal',
      'carbs_goal',
      'fat_goal',
    ]

    const goals = {}

    for (const field of fields) {
      const value = req.body[field]

      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return res.status(400).json({
          error: `Invalid value for ${field}. Goals must be positive numbers.`,
        })
      }

      goals[field] = value
    }

    const { data, error } = await supabase
      .from('nutrition_goals')
      .upsert(
        {
          user_id: req.user.id,
          ...goals,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (error) throw error

    res.json(data)
  } catch (error) {
    console.error(
      'Updating nutrition goals failed:',
      error.message
    )

    res.status(500).json({
      error: 'Could not save nutrition goals.',
    })
  }
})

app.get('/api/analytics', requireAuth, async (req, res) => {
  try {
    const period = req.query.period === 'month' ? 'month' : 'week'
    const days = period === 'month' ? 30 : 7

    const now = new Date()

    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - (days - 1))
    startDate.setHours(0, 0, 0, 0)

    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('food_name, calories, protein, carbs, fat, created_at')
      .eq('user_id', req.user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (mealsError) throw mealsError

    const { data: goals, error: goalsError } = await supabase
      .from('nutrition_goals')
      .select('calorie_goal, protein_goal, carbs_goal, fat_goal')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (goalsError) throw goalsError

    const targets = {
      calories: Number(goals?.calorie_goal ?? 2000),
      protein: Number(goals?.protein_goal ?? 100),
      carbs: Number(goals?.carbs_goal ?? 250),
      fat: Number(goals?.fat_goal ?? 65),
    }

    const dailyData = []

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)

      const dateKey = dateFormatter.format(date)

      const dayMeals = meals.filter(
        meal =>
          dateFormatter.format(new Date(meal.created_at)) === dateKey
      )

      const totals = dayMeals.reduce(
        (sum, meal) => ({
          calories: sum.calories + Number(meal.calories || 0),
          protein: sum.protein + Number(meal.protein || 0),
          carbs: sum.carbs + Number(meal.carbs || 0),
          fat: sum.fat + Number(meal.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      )

      const dateLabel = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })

      const dayLabel = date.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'Asia/Kolkata',
      })

      dailyData.push({
        date: dateKey,
        day: `${dayLabel}, ${dateLabel}`,
        ...totals,
        goal: targets.calories,
        mealCount: dayMeals.length,
        goalAchievement: Math.round(
          Math.min((totals.calories / targets.calories) * 100, 100)
        ),
      })
    }

    const totals = dailyData.reduce(
      (sum, day) => ({
        calories: sum.calories + day.calories,
        protein: sum.protein + day.protein,
        carbs: sum.carbs + day.carbs,
        fat: sum.fat + day.fat,
        mealCount: sum.mealCount + day.mealCount,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 }
    )

    const loggedDays = dailyData.filter(day => day.mealCount > 0)

    const average = {
      calories: Math.round(totals.calories / days),
      protein: Math.round(totals.protein / days),
      carbs: Math.round(totals.carbs / days),
      fat: Math.round(totals.fat / days),
    }

    const bestDay = loggedDays.length
      ? [...loggedDays].sort(
          (a, b) =>
            Math.abs(a.calories - targets.calories) -
            Math.abs(b.calories - targets.calories)
        )[0]
      : null

    res.json({
      period,
      days,
      targets,
      totals,
      average,
      dailyData,
      bestDay,
      loggedDays: loggedDays.length,
      averageGoalAchievement: Math.round(
        loggedDays.reduce((sum, day) => sum + day.goalAchievement, 0) /
          (loggedDays.length || 1)
      ),
    })
  } catch (error) {
    console.error('Loading analytics failed:', error.message)

    res.status(500).json({
      error: 'Could not load nutrition analytics.',
    })
  }
})

app.listen(PORT, () => {
  console.log(
    `MacroSnap API running at http://localhost:${PORT}`
  )
})
