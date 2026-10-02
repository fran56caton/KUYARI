import {HttpError} from './security.js';
export class Storage {
 constructor(private bucket:R2Bucket){}
 async put(bytes:Uint8Array,imageOnly=false){
  const b=bytes;let mime='';
  if(b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';
  if(b[0]===137&&Buffer.from(b.slice(1,8)).equals(Buffer.from([80,78,71,13,10,26,10])))mime='image/png';
  if(Buffer.from(b.slice(0,4)).toString()==='RIFF'&&Buffer.from(b.slice(8,12)).toString()==='WEBP')mime='image/webp';
  if(Buffer.from(b.slice(4,8)).toString()==='ftyp')mime='video/mp4';
  if(Buffer.from(b.slice(0,3)).toString()==='ID3'||(b[0]===255&&(b[1]&224)===224&&(b[1]&6)!==0))mime='audio/mpeg';
  if(!mime||(imageOnly&&!mime.startsWith('image/')))throw new HttpError(400,'Usa una imagen JPG, PNG o WebP, un video MP4 o música MP3');
  if(b.length>3*1024*1024)throw new HttpError(400,'Cada foto, video o canción admite hasta 3 MB');
  const key=crypto.randomUUID();await this.bucket.put(key,b,{httpMetadata:{contentType:mime}});return {key,mime,size:b.length};
 }
 async get(key:string){const object=await this.bucket.get(key);if(!object)throw new HttpError(404,'Archivo no disponible');return object.body;}
}

