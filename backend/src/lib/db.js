import pg from 'pg'
const url=process.env.DATABASE_URL
const cfg=url?{connectionString:url}:{host:process.env.PGHOST||'127.0.0.1',port:Number(process.env.PGPORT||5432),user:String(process.env.PGUSER||'postgres'),password:String(process.env.PGPASSWORD??'postgres'),database:String(process.env.PGDATABASE||'gridironai')}
if(process.env.DATABASE_SSL==='true')cfg.ssl={rejectUnauthorized:false}
const pool=new pg.Pool(cfg)
export default pool
