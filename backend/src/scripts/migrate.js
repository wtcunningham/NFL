import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import pool from '../lib/db.js'
const sqlDir=path.resolve(process.cwd(),'migrations')
const files=fs.readdirSync(sqlDir).filter(f=>f.endsWith('.sql')).sort()
const run=async()=>{const client=await pool.connect();try{for(const f of files){const sql=fs.readFileSync(path.join(sqlDir,f),'utf-8');console.log('> Applying',f);await client.query(sql)}console.log('Migrations complete.')}finally{client.release();process.exit(0)}}
run().catch(e=>{console.error(e);process.exit(1)})
