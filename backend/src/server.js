import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import gamesRouter from './api/games.js'
import injuriesRouter from './api/injuries.js'
import tendenciesRouter from './api/tendencies.js'
import spotlightsRouter from './api/spotlights.js'
const app=express();app.use(cors());app.use(express.json());app.get('/api/health',(req,res)=>res.json({ok:true,ts:new Date().toISOString()}));app.use('/api/games',gamesRouter);app.use('/api/games/:id/injuries',injuriesRouter);app.use('/api/games/:id/tendencies',tendenciesRouter);app.use('/api/games/:id/spotlights',spotlightsRouter);const port=process.env.PORT||4000;app.listen(port,()=>console.log(`[GridironAI] API listening on ${port}`))
