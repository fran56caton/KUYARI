import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {TursoDatabase,DatabaseBucket} from './turso.mjs';
import {DB} from '../dist/cloud/db.js';
import {createApp} from '../dist/cloud/app.js';
import {readConfig} from '../dist/cloud/config.js';
let initialization;
const mime={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp'};
const assets={async fetch(request){
  const pathname=new URL(request.url).pathname;
  let file;
  if(['/index.html','/styles.css'].includes(pathname))file=pathname.slice(1);
  else if(/^\/(src|shared)\/[a-zA-Z0-9_-]+\.js$/.test(pathname))file=pathname.startsWith('/src/')?'dist/client/'+pathname.slice(5):'dist'+pathname;
  else if(/^\/assets\/[a-zA-Z0-9_/-]+\.(css|svg|webp)$/.test(pathname))file=pathname.slice(1);
  else return new Response('missing',{status:404});
  try{return new Response(await readFile(resolve(file)),{headers:{'Content-Type':mime[extname(file)]??'application/octet-stream'}});}catch{return new Response('missing',{status:404});}
}};
async function initialize(binding) {
  await binding.prepare('CREATE TABLE IF NOT EXISTS hosting_migrations (id TEXT PRIMARY KEY)').run();
  if(!await binding.prepare("SELECT id FROM hosting_migrations WHERE id='yape-v1'").first()) {
    await binding.batch([
      binding.prepare('CREATE TABLE IF NOT EXISTS payment_settings (id TEXT PRIMARY KEY, value TEXT NOT NULL)'),
      binding.prepare("CREATE TABLE IF NOT EXISTS yape_reports (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), reference TEXT NOT NULL UNIQUE, payer TEXT NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL CHECK(status IN ('review','approved','rejected')), merchant TEXT NOT NULL, reviewed_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
      binding.prepare("INSERT OR IGNORE INTO hosting_migrations(id) VALUES('yape-v1')")
    ]);
  }
  await binding.prepare("INSERT OR IGNORE INTO payment_settings(id,value) VALUES('yape',?)").bind(JSON.stringify({enabled:true,phone:'900080962',holder:'MARIA CLIDA BERROSPI AQUINO',qrUrl:'',instructions:'Confirma el regalo, el importe y la entrega con KUYARI antes de pagar. Comprueba que el destinatario en Yape sea MARIA CLIDA BERROSPI AQUINO.'})).run();
  if(await binding.prepare("SELECT id FROM hosting_migrations WHERE id='kuyari-turso-v1'").first())return;
  const schema=(await readFile(resolve('cloud/schema.sql'),'utf8')).split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>s.replace(/^CREATE TABLE /,'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /,'CREATE UNIQUE INDEX IF NOT EXISTS ').replace(/^CREATE INDEX /,'CREATE INDEX IF NOT EXISTS '));
  const seed=JSON.parse(await readFile(resolve('dist/cloud/seed.json'),'utf8'));
  await binding.batch([
    ...schema.map(sql=>binding.prepare(sql)),
    binding.prepare('CREATE TABLE IF NOT EXISTS asset_blob_parts (object_key TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(object_key,part))'),
    binding.prepare("INSERT OR IGNORE INTO mutation_guard(id,version) VALUES('commerce',0)"),
    ...seed.map(s=>binding.prepare(s.sql).bind(...s.values)),
    binding.prepare("INSERT OR IGNORE INTO init_flags(id) VALUES('kuyari-v1')"),
    binding.prepare("INSERT OR IGNORE INTO hosting_migrations(id) VALUES('kuyari-turso-v1')")
  ]);
}
export async function handle(request) {
  if(!process.env.TURSO_DATABASE_URL||!process.env.TURSO_AUTH_TOKEN)return Response.json({error:'El almacenamiento permanente de KUYARI aún se está conectando.'},{status:503});
  const binding=new TursoDatabase(process.env.TURSO_DATABASE_URL,process.env.TURSO_AUTH_TOKEN);
  initialization??=initialize(binding).catch(error=>{initialization=undefined;throw error;});
  await initialization;
  const origin=new URL(request.url).origin,db=new DB(binding,new DatabaseBucket(binding),assets,origin);
  const config=readConfig({NODE_ENV:'production',APP_URL:origin,DB_PATH:'turso-persistent',STORE_LIVE:'true',ORDER_CHANNEL:'whatsapp',S3_BUCKET:'turso-persistent-assets',BUSINESS_NAME:'KUYARI',SETUP_TOKEN:process.env.SETUP_TOKEN??''});
  const response=await createApp(db,config).fetch(request,db);
  if(Math.random()<0.01)await binding.batch([binding.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()),binding.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now())]).catch(()=>{});
  return response;
}
