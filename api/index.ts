import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
// The isolated hosting adapter is JavaScript and is covered by integration tests.
// @ts-expect-error JavaScript hosting adapter has no declaration file.
import { handle } from '../cloud/runtime.mjs';
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
    headers.set('x-kuyari-client-ip',String(req.headers['x-vercel-forwarded-for']??'local').split(',')[0].trim());
    const chunks: Buffer[]=[];let size=0;
    for await(const chunk of req){const part=Buffer.from(chunk);size+=part.length;if(size>3500000){res.statusCode=413;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'La foto o video admite hasta 3 MB. Elige un archivo más pequeño.'}));return;}chunks.push(part);}
    const response: Response=await handle(new Request(`https://${req.headers.host}${req.url}`,{method:req.method,headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})}));
    res.statusCode=response.status;
    response.headers.forEach((value,key)=>{if(key!=='set-cookie')res.setHeader(key,value);});
    const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    if(response.body)await pipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),res);else res.end();
  } catch {
    if(!res.headersSent){res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'No pudimos conectar con KUYARI. Conserva tus datos y vuelve a intentarlo.'}));}else res.end();
  }
}
