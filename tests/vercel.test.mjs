import {test} from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import fs from 'node:fs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const f of ['schema.sql'])sqlite.exec(fs.readFileSync('cloud/'+f,'utf8'));
import {TursoDatabase,DatabaseBucket} from '../cloud/turso.mjs';
const tursoCalls=[];
function wireValue(v){return v.type==='null'?null:v.type==='integer'?Number(v.value):v.type==='blob'?Buffer.from(v.base64,'base64'):v.value;}
function toWire(v){return v==null?{type:'null'}:v instanceof Uint8Array?{type:'blob',base64:Buffer.from(v).toString('base64')}:typeof v==='number'?{type:'integer',value:String(v)}:{type:'text',value:v};}
function sqlExec(stmt){const values=stmt.args.map(wireValue),query=sqlite.prepare(stmt.sql),cols=query.columns();let rows=[],changes=0;if(cols.length){rows=query.all(...values);}else{changes=Number(query.run(...values).changes);}return {cols:cols.map(c=>({name:c.name})),rows:rows.map(r=>cols.map(c=>toWire(r[c.name]))),affected_row_count:changes,last_insert_rowid:null};}
function condition(cond,results,errors){if(!cond)return true;if(cond.type==='ok')return Boolean(results[cond.step]);if(cond.type==='error')return Boolean(errors[cond.step]);if(cond.type==='not')return !condition(cond.cond,results,errors);if(cond.type==='and')return cond.conds.every(c=>condition(c,results,errors));if(cond.type==='or')return cond.conds.some(c=>condition(c,results,errors));throw Error('condition');}
async function httpTurso(url,options){assert.equal(String(url),"https://database.turso.test/v2/pipeline");assert.equal(options.headers.Authorization,'Bearer test-only-token');const payload=JSON.parse(options.body);tursoCalls.push(payload);const results=payload.requests.map(request=>{try{if(request.type==='close')return {type:'ok',response:{type:'close'}};if(request.type==='execute')return {type:'ok',response:{type:'execute',result:sqlExec(request.stmt)}};if(request.type==='batch'){const step_results=[],step_errors=[];for(const step of request.batch.steps){if(!condition(step.condition,step_results,step_errors)){step_results.push(null);step_errors.push(null);continue;}try{step_results.push(sqlExec(step.stmt));step_errors.push(null);}catch(error){step_results.push(null);step_errors.push({message:error.message});}}return {type:'ok',response:{type:'batch',result:{step_results,step_errors}}};}throw Error('request');}catch(error){return {type:'error',error:{message:error.message}};}});return Response.json({baton:null,base_url:null,results});}
const binding=new TursoDatabase('libsql://database.turso.test','test-only-token',{fetcher:httpTurso});
const db=binding;
await db.prepare('CREATE TABLE asset_blob_parts (object_key TEXT NOT NULL,part INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(object_key,part))').run();
const env={DB:db,SETUP_TOKEN:'test-only-activation-token-00000000000000000000',BUCKET:new DatabaseBucket(binding),ASSETS:{async fetch(req){try{let pathname=new URL(req.url).pathname;let file=pathname.startsWith('/src/')?'dist/client/'+pathname.slice(5):pathname.startsWith('/shared/')?'dist'+pathname:pathname.slice(1);return new Response(fs.readFileSync(file));}catch{return new Response('missing',{status:404});}}}};
const origin='https://kuyari.test';let cookie='',csrf='';
const seed=JSON.parse(fs.readFileSync('cloud/seed.json','utf8'));await db.batch([db.prepare("INSERT OR IGNORE INTO mutation_guard(id,version) VALUES('commerce',0)"),...seed.map(s=>db.prepare(s.sql).bind(...s.values)),db.prepare("INSERT OR IGNORE INTO init_flags(id) VALUES('kuyari-v1')")]);
import {DB} from '../dist/cloud/db.js';import {createApp} from '../dist/cloud/app.js';import {readConfig} from '../dist/cloud/config.js';
const worker={async fetch(request,env){const store=new DB(env.DB,env.BUCKET,env.ASSETS,origin);return createApp(store,readConfig({NODE_ENV:'production',APP_URL:origin,DB_PATH:'turso-persistent',STORE_LIVE:'true',ORDER_CHANNEL:'whatsapp',S3_BUCKET:'turso-persistent-assets',SETUP_TOKEN:env.SETUP_TOKEN})).fetch(request,store);}};
async function call(path,method='GET',body){const headers={cookie,origin,'x-csrf-token':csrf};if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const response=await worker.fetch(new Request(origin+path,{method,headers,...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),env,{waitUntil(){}});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const data=response.headers.get('content-type')?.includes('json')?await response.json():await response.text();return {status:response.status,data};}
test('cloud catalog, admin, product uploads, order and privacy',async()=>{
 let r=await call('/api/session');assert.equal(r.status,200);csrf=r.data.csrf;
 r=await call('/api/products');assert.equal(r.data.total,12);assert.ok(r.data.products.every(p=>p.inquiryOnly));
 const main=await call('/');assert.equal(main.status,200);assert.match(main.data,/Tu historia/);
 assert.equal((await call('/api/admin/products')).status,403);
 r=await call('/api/setup','POST',{name:'Owner',email:'owner@example.test',password:'test-owner-password-123',consent:true,setupToken:env.SETUP_TOKEN});assert.equal(r.status,201,JSON.stringify(r.data));csrf=r.data.csrf;
 assert.equal((await call('/api/setup','POST',{name:'Owner',email:'other@example.test',password:'test-owner-password-123',consent:true,setupToken:env.SETUP_TOKEN})).status,403);
 const form=new FormData();form.set('file',new Blob([fs.readFileSync('assets/web/ramo-kuyari.webp')],{type:'image/webp'}),'photo.webp');r=await call('/api/admin/images','POST',form);assert.equal(r.status,201,JSON.stringify(r.data));const image=r.data.url;assert.equal((await call(image)).status,200);
 const products=(await call('/api/admin/products')).data;const p=products[0];const product={...p,active:true,featured:true,customizable:true,inquiryOnly:false,price:10000,promo:null,stock:1,memoryPrice:1000,images:[{url:image,alt:'Foto real de prueba'}]};r=await call('/api/admin/products/'+p.id,'PUT',product);assert.equal(r.status,200,JSON.stringify(r.data));
 r=await call('/api/admin/zones','POST',{district:'Prueba',province:'Prueba',department:'Prueba',fee:1000,minDays:1,slots:['Mañana'],active:true});assert.equal(r.status,201);const zoneId=r.data.id;
 const payload={items:[{productId:p.id,qty:1,customization:{memory:true,privacy:'pin',pin:'123456'}}],zoneId,email:'buyer@example.test',buyer:{firstName:'Ana',lastName:'Perez',phone:'930951679'},delivery:{recipient:'Ana',phone:'930951679',address:'Direccion de prueba 123',date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),slot:'Mañana',anonymous:false,otherPerson:false},consent:true,idempotencyKey:crypto.randomUUID(),expectedTotal:12000};
 r=await call('/api/orders','POST',payload);assert.equal(r.status,201,JSON.stringify(r.data));const code=r.data.order.code;assert.equal(r.data.order.status,'pending_confirmation');const mem=r.data.order.memories[0].token;
 r=await call('/api/admin/yape','PUT',{enabled:true,phone:'900080962',holder:'Cuenta de prueba',qrUrl:'',instructions:'Confirmar el total'});assert.equal(r.status,200);assert.equal((await call('/api/yape')).data.phone,'900080962');assert.equal((await call('/api/orders/'+code+'/yape','POST',{reference:'YAPE-1001',payer:'Ana Perez'})).status,409);

 r=await call('/api/orders','POST',payload);assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.order.code,code);assert.equal(sqlite.prepare('SELECT stock FROM products WHERE id=?').get(p.id).stock,0);
 r=await call('/api/orders/'+code+'/whatsapp');assert.equal(r.data.contacts.length,2);assert.match(r.data.contacts[0].url,/51930951679/);assert.match(r.data.contacts[1].url,/51900080962/);
 r=await call('/api/admin/orders/'+code,'PATCH',{status:'confirmed',note:'Confirmed test'});assert.equal(r.status,200,JSON.stringify(r.data));
 r=await call('/api/memories/'+mem+'/qr');assert.equal(r.status,200);assert.match(r.data,/<svg/);
 r=await call('/api/orders/'+code+'/yape','POST',{reference:'YAPE-1001',payer:'Ana Perez',amount:1});assert.equal(r.status,201,JSON.stringify(r.data));const reportId=r.data.id;assert.equal((await call('/api/orders/'+code)).data.paymentStatus,'review');assert.equal(sqlite.prepare('SELECT amount FROM yape_reports WHERE id=?').get(reportId).amount,12000);
 assert.equal((await call('/api/orders/'+code+'/yape','POST',{reference:'YAPE-1002',payer:'Ana Perez'})).status,409);assert.equal((await call('/api/admin/yape/reports/'+reportId+'/review','POST',{decision:'approve'})).status,400);
 assert.equal((await call('/api/admin/yape/reports/'+reportId+'/review','POST',{decision:'reject',verifiedInApp:true})).status,200);assert.equal((await call('/api/orders/'+code)).data.paymentStatus,'not_requested');
 r=await call('/api/orders/'+code+'/yape','POST',{reference:'YAPE-1002',payer:'Ana Perez'});assert.equal(r.status,201);const acceptedId=r.data.id;assert.equal((await call('/api/admin/yape/reports/'+acceptedId+'/review','POST',{decision:'approve',verifiedInApp:true})).status,200);assert.equal((await call('/api/orders/'+code)).data.paymentStatus,'approved');assert.equal((await call('/api/admin/yape/reports/'+acceptedId+'/review','POST',{decision:'approve',verifiedInApp:true})).status,409);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM payments WHERE provider='yape_manual'").get().n,1);

 r=await call('/api/auth/logout','POST',{});csrf=r.data.csrf;assert.equal((await call('/api/orders/'+code)).status,404);assert.equal((await call('/api/orders/'+code+'/yape')).status,404);assert.equal((await call('/api/admin/yape/reports')).status,403);assert.equal((await call('/api/memories/'+mem)).status,403);
 r=await call('/api/memories/'+mem+'/unlock','POST',{pin:'123456'});assert.equal(r.status,200);assert.equal((await call('/api/memories/'+mem)).status,200);
});

test('cloud romantic cards persist in D1 and protect private R2 photos with PIN',async()=>{
 const content={theme:'castle',palette:'rose',occasion:'Aniversario',opening:'gates',flower:'roses',recipient:'María',sender:'Ana',title:'Nuestra historia de cuento',subtitle:'Algo escrito para ti.',message:'Cada día contigo es mi historia favorita.',closing:'Por muchos capítulos más.',specialDate:'',details:['petals','hearts','vines'],intensity:'full',textStyle:'serif',chapters:[{title:'Nuestro encuentro',text:'Una sonrisa, un café y el principio de todo.'}],promises:['Cuidar nuestra historia.'],songUrl:'',videoUrl:'',assets:[],giftId:'',giftNote:''};
 const upload=new FormData();upload.set('file',new Blob([fs.readFileSync('assets/web/ramo-kuyari.webp')],{type:'image/webp'}),'moment.webp');let r=await call('/api/uploads','POST',upload);assert.equal(r.status,201,JSON.stringify(r.data));content.assets=[r.data.id];
 const input={content,privacy:'pin',pin:'123456',consent:true,previewed:true,requestKey:crypto.randomUUID()};assert.equal((await call('/api/love-cards','POST',{...input,previewed:false})).status,400);r=await call('/api/love-cards','POST',input);assert.equal(r.status,201,JSON.stringify(r.data));const token=r.data.token,key=r.data.accessKey;assert.equal((await call('/api/love-cards','POST',input)).data.token,token);assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM love_cards').get().n,1);assert.equal((await call('/api/love-cards/'+token+'/qr')).status,200);
 const ownerCookie=cookie,ownerCSRF=csrf;cookie='';csrf='';r=await call('/api/session');csrf=r.data.csrf;assert.equal((await call('/api/love-cards/'+token)).data.needsPin,true);assert.equal((await call('/api/assets/'+content.assets[0])).status,404);assert.equal((await call('/api/love-cards/'+token+'/qr')).status,404);assert.equal((await call('/api/love-cards/'+token+'/unlock','POST',{pin:'123456'})).status,200);r=await call('/api/love-cards/'+token);assert.equal(r.status,200);assert.deepEqual(r.data.content,{garden:null,transition:'page',photoStyle:'polaroid',musicMode:'melody',secretMessage:'',bookStyle:'editorial',bookQuote:'',bookReasons:[],bookMessages:[],bookCaptions:[],...content});assert.ok(!JSON.stringify(r.data).includes('pin_hash'));assert.equal((await call('/api/assets/'+content.assets[0])).status,200);
 const guestCookie=cookie,guestCSRF=csrf;cookie=ownerCookie;csrf=ownerCSRF;assert.equal((await call('/api/love-cards/'+token,'PATCH',{active:false})).status,200);cookie=guestCookie;csrf=guestCSRF;assert.equal((await call('/api/love-cards/'+token)).status,404);assert.equal((await call('/api/assets/'+content.assets[0])).status,404);assert.equal((await call('/api/love-cards/access','POST',{token,key})).status,200);assert.equal((await call('/api/love-cards/'+token,'PATCH',{active:true})).status,200);assert.equal((await call('/sorpresa/'+token)).status,200);
});

test('Turso atomic batches roll back on conflict and photos persist across adapters',async()=>{
const category='rollback-check';await assert.rejects(db.batch([db.prepare('INSERT INTO categories VALUES (?,?,?,1)').bind(category,category,'test'),db.prepare("INSERT INTO transaction_checks VALUES('must-rollback',0)")]));assert.equal(await db.prepare('SELECT id FROM categories WHERE id=?').bind(category).first(),null);const bytes=new Uint8Array(600000).fill(91);await new DatabaseBucket(binding).put('chunked-test',bytes);const loaded=await new DatabaseBucket(new TursoDatabase('libsql://database.turso.test','test-only-token',{fetcher:httpTurso})).get('chunked-test');assert.deepEqual(loaded.body,Buffer.from(bytes));assert.equal((await db.prepare("SELECT COUNT(*) n FROM asset_blob_parts WHERE object_key='chunked-test'").first()).n,3);assert.ok(tursoCalls.every(c=>c.requests.at(-1).type==='close'));});

test('personalized floral worlds and MP3 persist behind the same PIN protection',async()=>{
 const {defaultLoveContent,loveThemes,lovePalettes,loveDetails}=await import('../dist/shared/romance.js');
 const content={...defaultLoveContent(),theme:'floral-heart',palette:'blush',flower:'lilies',transition:'zoom',photoStyle:'filmstrip',musicMode:'favorite',secretMessage:'Nuestro siguiente capítulo empieza contigo.',recipient:'Mi amor',message:'Esta carta guarda todo el amor de nuestra historia.',details:loveDetails.map(d=>d.id)};
 assert.equal(loveThemes.length,22);assert.equal(lovePalettes.length,9);
 const upload=new FormData();upload.set('file',new Blob([Buffer.from([73,68,51,4,0,0,0,0,0,0,255,251,144,0])],{type:'audio/mpeg'}),'song.mp3');
 let r=await call('/api/uploads','POST',upload);assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.mime,'audio/mpeg');content.assets=[r.data.id];
 const invalid=await call('/api/love-cards','POST',{content:{...content,transition:'unknown'},privacy:'link',consent:true,previewed:true,requestKey:crypto.randomUUID()});assert.equal(invalid.status,400);
 r=await call('/api/love-cards','POST',{content,privacy:'pin',pin:'654321',consent:true,previewed:true,requestKey:crypto.randomUUID()});assert.equal(r.status,201,JSON.stringify(r.data));const token=r.data.token;assert.deepEqual((await call('/api/love-cards/'+token)).data.content,content);
 const ownerCookie=cookie,ownerCSRF=csrf;cookie='';csrf='';r=await call('/api/session');csrf=r.data.csrf;
 assert.equal((await call('/api/assets/'+content.assets[0])).status,404);assert.equal((await call('/api/love-cards/'+token+'/unlock','POST',{pin:'111111'})).status,403);
 assert.equal((await call('/api/love-cards/'+token+'/unlock','POST',{pin:'654321'})).status,200);assert.equal((await call('/api/assets/'+content.assets[0])).status,200);
 cookie=ownerCookie;csrf=ownerCSRF;
 const bad=new FormData();bad.set('file',new Blob(['not audio'],{type:'audio/mpeg'}),'fake.mp3');assert.equal((await call('/api/uploads','POST',bad)).status,400);
});
test('heart QR preserves every encoded module and a four-module undecorated margin',async()=>{
 const {heartQR}=await import('../dist/cloud/romance.js');const QRCode=(await import('qrcode')).default;
 const url='https://kuyari.vercel.app/sorpresa/'+'a'.repeat(43),qr=QRCode.create(url,{errorCorrectionLevel:'H'}),svg=await heartQR(url,'<Mi amor>','blush');
 assert.ok(svg.includes('&lt;Mi amor&gt;'));assert.ok(!svg.includes('<Mi amor>'));
 const group=svg.match(/data-qr-matrix="(\d+)"[^>]*>(.*?)<\/g>/s);assert.equal(Number(group[1]),qr.modules.size);
 const rects=[...group[2].matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"\/>/g)],cell=276/(qr.modules.size+8);
 let count=0;for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x)){const r=rects[count++];assert.ok(Math.abs(Number(r[1])-(162+(x+4)*cell))<.001);assert.ok(Math.abs(Number(r[2])-(125+(y+4)*cell))<.001);assert.ok(Math.abs(Number(r[3])-cell)<.001);}assert.equal(rects.length,count);
 const decor=svg.match(/data-heart-decoration="true"[^>]*>(.*?)<\/g>/s)[1];for(const r of decor.matchAll(/<circle cx="(\d+)" cy="(\d+)" r="([\d.]+)"/g)){const x=+r[1],y=+r[2],radius=+r[3];assert.ok(x+radius<162||x-radius>438||y+radius<125||y-radius>401);}
 await (await import('sharp')).default(Buffer.from(svg)).png().toFile('../../outputs/KUYARI-QR-corazon.png');
});

test('romantic books persist their editable pages and enforce content limits',async()=>{
 const {defaultLoveContent}=await import('../dist/shared/romance.js');
 const {romanticBookIdea}=await import('../dist/shared/book.js');
 const idea=romanticBookIdea('playful','Mi persona favorita','su paciencia','nuestra caminata');
 const content={...defaultLoveContent(),theme:'boyfriend-book',occasion:'Día del Novio',opening:'book',recipient:'Mi persona favorita',title:idea.title,message:idea.message,closing:idea.closing,bookStyle:'classic',bookQuote:idea.quote,bookReasons:idea.reasons,bookMessages:idea.messages,bookCaptions:['Un recuerdo nuestro.'],chapters:idea.chapters};
 const input={content,privacy:'link',consent:true,previewed:true,requestKey:crypto.randomUUID()};
 let r=await call('/api/love-cards','POST',input);assert.equal(r.status,201,JSON.stringify(r.data));assert.deepEqual((await call('/api/love-cards/'+r.data.token)).data.content,content);
 for(const invalid of [{bookReasons:Array(13).fill('Una razón')},{bookMessages:['x'.repeat(401)]},{bookCaptions:Array(11).fill('Foto')},{bookStyle:'unknown'}])assert.equal((await call('/api/love-cards','POST',{...input,content:{...content,...invalid},requestKey:crypto.randomUUID()})).status,400);
});

test('garden selections persist with the letter, validate preparation limits and retain PIN protection',async()=>{
 const {defaultLoveContent}=await import('../dist/shared/romance.js');const {defaultGarden,gardenSummary}=await import('../dist/shared/garden.js');
 const garden={...defaultGarden(),wrap:'ivory',ribbon:'wine',extras:['pearls','chocolate']};
 const content={...defaultLoveContent(),theme:'garden-letter',palette:'sky',recipient:'Mi persona favorita',message:'Este jardín lleva mis palabras y todas mis flores para ti.',garden,giftNote:gardenSummary(garden)};
 const input={content,privacy:'pin',pin:'987654',consent:true,previewed:true,requestKey:crypto.randomUUID()};
 for(const bad of [{...garden,design:'unknown'},{...garden,flowers:[{id:'rose',color:'pink',quantity:13}]},{...garden,extras:['unknown']}])assert.equal((await call('/api/love-cards','POST',{...input,content:{...content,garden:bad},requestKey:crypto.randomUUID()})).status,400);
 const r=await call('/api/love-cards','POST',input);assert.equal(r.status,201,JSON.stringify(r.data));const token=r.data.token;
 assert.deepEqual((await call('/api/love-cards/'+token)).data.content.garden,garden);
 const ownerCookie=cookie,ownerCSRF=csrf;cookie='';csrf='';csrf=(await call('/api/session')).data.csrf;
 assert.equal((await call('/api/love-cards/'+token)).data.needsPin,true);
 assert.equal((await call('/api/love-cards/'+token+'/unlock','POST',{pin:'000000'})).status,403);
 assert.equal((await call('/api/love-cards/'+token+'/unlock','POST',{pin:'987654'})).status,200);
 assert.deepEqual((await call('/api/love-cards/'+token)).data.content.garden,garden);
 assert.equal((await call('/jardin-cartas')).status,200);assert.equal((await call('/jardin-flores')).status,200);
 assert.match((await call('/assets/garden.css')).data,/garden-letter-art/);
 cookie=ownerCookie;csrf=ownerCSRF;
});

test('books have correctly linked single and double pages and escape personal text',async()=>{
 const {defaultLoveContent}=await import('../dist/shared/romance.js');const {buildLoveBook,bookCover}=await import('../dist/client/love-book.js');const {romanticBookIdea,isLoveBook}=await import('../dist/shared/book.js');
 const content={...defaultLoveContent(),theme:'love-magazine',opening:'book',recipient:'<script>bad</script>',message:'<img src=x onerror=alert(1)>',chapters:[{title:'<Nuestra historia>',text:'Una historia'}],bookMessages:['Un abrazo'],bookReasons:['Por tu paciencia'],secretMessage:'Solo nosotros',videoUrl:'https://example.test/video'};
 const assets=[{id:'photo-1',mime:'image/jpeg'},{id:'video-1',mime:'video/mp4'},{id:'audio-1',mime:'audio/mpeg'}];
 const double=buildLoveBook(content,assets),single=buildLoveBook(content,assets,true);assert.equal(single.length,double.length*2);assert.ok(isLoveBook(content));
 const html=double.map(p=>p.html).join('');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));assert.ok(html.includes('/api/assets/photo-1'));assert.ok(html.includes('/api/assets/video-1'));assert.ok(!html.includes('/api/assets/audio-1'));assert.ok(html.includes('data-book-music'));assert.ok(html.includes('data-love-secret'));assert.ok(bookCover(content,assets).includes('book-cover-photo'));
 for(const [screens,factor] of [[double,1],[single,2]]){const index=screens[factor].html;for(const match of index.matchAll(/data-book-jump="(\d+)"/g)){const target=Number(match[1]);assert.ok(target<screens.length);assert.equal(target%factor,0);}}
 const tender=romanticBookIdea('tender','Alex','su generosidad','nuestra caminata');assert.ok(tender.message.includes('Alex'));assert.ok(tender.message.includes('su generosidad'));assert.ok(tender.message.includes('nuestra caminata'));assert.notEqual(tender.message,romanticBookIdea('passionate').message);assert.notEqual(tender.message,romanticBookIdea('playful').message);
});

