import {HttpError,digest} from './security.js';
import type {DB} from './db.js';
import type {Session} from './auth.js';
export type NextFunction=()=>void;
export interface Request {method:string;path:string;params:Record<string,string>;query:Record<string,string>;headers:Record<string,string>;body:Record<string,unknown>;file?:{buffer:Uint8Array};raw:globalThis.Request;get:(name:string)=>string|undefined;db:DB;mount:string;routeKey:string;}
export class Response {
 locals={} as {session:Session};headers=new Headers();code=200;body:BodyInit|null=null;ended=false;
 constructor(public db:DB){}
 status(code:number){this.code=code;return this;}set(name:string,value:string){this.headers.set(name,value);return this;}setHeader(name:string,value:string){return this.set(name,value);}
 type(value:string){return this.set('Content-Type',({'html':'text/html; charset=utf-8','json':'application/json; charset=utf-8'} as Record<string,string>)[value]??value);}
 send(body:BodyInit|null){this.body=body;this.ended=true;return this;}
 json(value:unknown){return this.type('json').send(JSON.stringify(value));}
 cookie(name:string,value:string,opts:{maxAge:number;secure:boolean;path:string;httpOnly:boolean;sameSite:string}){this.headers.append('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(opts.maxAge/1000)}${opts.secure?'; Secure':''}`);}
 async sendFile(path:string){const result=await this.db.assets.fetch(new globalThis.Request(new URL('/'+path.replace(/^\//,''),this.db.origin)));this.code=result.status;result.headers.forEach((v,k)=>this.headers.set(k,v));this.body=result.body;this.ended=true;return this;}
}
type Handler=(req:Request,res:Response,next:NextFunction)=>unknown;
type Layer={method?:string;path:string|RegExp;handlers:Handler[]};
function router(){
 const layers:Layer[]=[];let errorHandler:((error:unknown,req:Request,res:Response,next:NextFunction)=>unknown)|undefined;
 const app:Record<string,unknown>={disable(){},set(){},use(path:string|Handler,...handlers:Handler[]){if(typeof path==='function'){if(path.length===4){errorHandler=path;return;}layers.push({path:'/',handlers:[path,...handlers]});}else layers.push({path,handlers});}};
 for(const method of ['get','post','put','patch','delete'])app[method]=(path:string|RegExp,...handlers:Handler[])=>layers.push({method:method.toUpperCase(),path,handlers});
 app.fetch=async(raw:globalThis.Request,db:DB)=>{
  const url=new URL(raw.url),res=new Response(db),req:Request={raw,db,method:raw.method,path:url.pathname,params:{},query:Object.fromEntries(url.searchParams),headers:Object.fromEntries(raw.headers),body:{},get:n=>raw.headers.get(n)??undefined,mount:'',routeKey:''};
  try{
   for(const layer of layers){
    if(layer.method&&layer.method!==(raw.method==='HEAD'?'GET':raw.method))continue;
    let match=false;req.params={};
    if(layer.path instanceof RegExp)match=layer.path.test(req.path);
    else if(!layer.method)match=layer.path==='/'||req.path===layer.path||req.path.startsWith(layer.path+'/');
    else {const keys:string[]=[];const pattern=layer.path.split('/').map(s=>s.startsWith(':')?(keys.push(s.slice(1)),'([^/]+)'):s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/');const m=req.path.match(new RegExp('^'+pattern+'$'));if(m){match=true;keys.forEach((k,i)=>req.params[k]=decodeURIComponent(m[i+1]));}}
    if(!match)continue;req.mount=typeof layer.path==='string'?layer.path:'';req.routeKey=String(layer.path);
    for(const fn of layer.handlers){let next=false;await fn(req,res,()=>{next=true;});if(res.ended)break;if(!next)break;}
    if(res.ended)break;
   }
  }catch(e){if(errorHandler)await errorHandler(e,req,res,()=>{});else res.status(e instanceof HttpError?e.status:500).json({error:e instanceof HttpError?e.message:'No pudimos completar la operación'});}
  if(!res.ended)res.status(404).json({error:'Página no encontrada'});
  return new globalThis.Response(raw.method==='HEAD'?null:res.body,{status:res.code,headers:res.headers});
 };return app;
}
router.json=(_options:unknown):Handler=>async(req,_res,next)=>{if(req.headers['content-type']?.includes('application/json')){const raw=await readLimited(req.raw,102400);try{req.body=JSON.parse(new TextDecoder().decode(raw));if(!req.body||typeof req.body!=='object')throw new Error();}catch{throw new HttpError(400,'La solicitud no tiene un formato válido');}}next();};
router.static=(directory:string,_opts:unknown):Handler=>async(req,res,next)=>{const prefix=directory==='dist/client'?'/src':directory==='dist/shared'?'/shared':'/assets/web';const relative=req.path.slice(req.mount.length);if(!/^\/[a-zA-Z0-9_/-]+\.(js|webp)$/.test(relative))return next();const r=await req.db.assets.fetch(new globalThis.Request(new URL(prefix+relative,req.db.origin)));if(r.status===404)return next();res.type(r.headers.get('Content-Type')??'application/octet-stream').set('Cache-Control','public,max-age=3600').send(r.body);};
export default router;
export function helmet(_config:unknown):Handler{return (_req,res,next)=>{res.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob:; media-src 'self' https:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'").set('X-Content-Type-Options','nosniff').set('Referrer-Policy','no-referrer').set('X-Frame-Options','DENY').set('Strict-Transport-Security','max-age=31536000');next();};}
export function rateLimit(opts:{windowMs:number;limit:number;[key:string]:unknown}):Handler{return async(req,_res,next)=>{const key=digest(`${req.headers['x-kuyari-client-ip']??'local'}:${req.routeKey}:${Math.floor(Date.now()/opts.windowMs)}`);const row=await req.db.get<{hits:number}>('INSERT INTO rate_limits (id,hits,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits',key,Date.now()+opts.windowMs);if((row?.hits??0)>opts.limit)throw new HttpError(429,'Demasiados intentos. Espera unos minutos e inténtalo de nuevo');next();};}
async function readLimited(request:globalThis.Request,max:number){if(Number(request.headers.get('content-length')??0)>max)throw new HttpError(413,'El archivo supera el tamaño permitido');const reader=request.body?.getReader();if(!reader)return new Uint8Array();let size=0;const chunks:Uint8Array[]=[];while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>max){await reader.cancel();throw new HttpError(413,'El archivo supera el tamaño permitido');}chunks.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;}
export function multer(_options:unknown){return {single:(_name:string):Handler=>async(req,_res,next)=>{const bytes=await readLimited(req.raw,26*1024*1024);const data=await new globalThis.Response(bytes,{headers:{'Content-Type':req.headers['content-type']??''}}).formData();const file=data.get('file');if(!(file instanceof File)||data.getAll('file').length!==1)throw new HttpError(400,'Selecciona un archivo');req.file={buffer:new Uint8Array(await file.arrayBuffer())};next();}};}
multer.memoryStorage=()=>({});multer.MulterError=class extends Error{};

