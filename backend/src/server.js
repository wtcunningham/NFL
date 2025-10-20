// backend/src/server.js
import 'dotenv/config'
import express from 'express'
import cors from 'cors'

// Routers
import gamesRouter from './api/games.js'
import injuriesRouter from './api/injuries.js'
import tendenciesRouter from './api/tendencies.js'
import spotlightsRouter from './api/spotlights.js'

const app = express()

// Trust proxy (useful behind AWS/NGINX/etc.)
app.set('trust proxy', true)

// CORS — allow localhost and Amplify by default; override with CORS_ORIGIN if set
const DEFAULT_CORS = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /\.amplifyapp\.com$/i,
]
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : DEFAULT_CORS

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false,
  })
)

// Body parsing
app.use(express.json({ limit: '1mb' }))

// Health check
app.get('/api/health', (req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
)

// API routes
app.use('/api/games', gamesRouter)

// Nested game resources (mergeParams is enabled inside those routers)
app.use('/api/games/:id/injuries', injuriesRouter)
app.use('/api/games/:id/tendencies', tendenciesRouter)
app.use('/api/games/:id/spotlights', spotlightsRouter)

// Optional direct mounts (handy for ad-hoc testing)
app.use('/api/injuries', injuriesRouter)
app.use('/api/tendencies', tendenciesRouter)
app.use('/api/spotlights', spotlightsRouter)

// 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl })
})

// Error handler (keeps stack out of prod by default)
app.use((err, req, res, _next) => {
  const status = err.status || 500
  const payload =
    process.env.NODE_ENV === 'production'
      ? { error: err.message || 'Server Error' }
      : { error: err.message || 'Server Error', stack: err.stack }
  res.status(status).json(payload)
})

// Export the app (so it can be wrapped by serverless-http if needed)
export default app

// Local dev server (ignored in Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const port = process.env.PORT || 4000
  app.listen(port, () =>
    console.log(`[GridironAI] API listening on ${port}`)
  )
}
