import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
export const token=()=>randomBytes(32).toString('base64url');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
async function derive(value:string,salt:string,iterations:number){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);return Buffer.from(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Buffer.from(salt,'hex'),iterations},key,256));}
export async function hashPassword(value:string){const salt=randomBytes(16).toString('hex');return `pbkdf2:100000:${salt}:${(await derive(value,salt,100000)).toString('hex')}`;}
export async function verifyPassword(value:string,stored:string){const [kind,count,salt,hash]=stored.split(':');if(kind!=='pbkdf2'||count!=='100000'||salt.length!==32||hash.length!==64)return false;return timingSafeEqual(await derive(value,salt,Number(count)),Buffer.from(hash,'hex'));}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export function log(event:string,fields:Record<string,string>={}){process.stdout.write(JSON.stringify({event,...fields})+'\n');}
