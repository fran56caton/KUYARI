import { gardenColors, gardenDesigns, gardenRibbons, gardenWraps, type GardenConfig } from '../shared/garden.js';
import { esc } from './ui.js';
let sequence=0;
export function flowerDrawing(id:string,color:string):string {
  const petal=(angle:number,rx=19,ry=34)=>`<ellipse cx="0" cy="-25" rx="${rx}" ry="${ry}" transform="rotate(${angle})" fill="${color}" stroke="#fff8e8" stroke-opacity=".35" stroke-width="1.5"/>`;
  let petals:string;
  if(id==='iris') petals=`<path d="M0 2C-30-18-40-61-15-58C-1-56 5-34 0 2ZM3 0C-3-45 12-76 24-63C38-47 14-21 3 0ZM3 1C22-46 55-46 52-28C49-9 18 2 3 1Z" fill="${color}" stroke="#fff7df" stroke-opacity=".55" stroke-width="2"/><path d="M0 0C-23-22-57-19-54 4C-47 28-23 22 0 0ZM3 0C-12 19-20 44 0 48C22 45 20 20 3 0ZM6 0C31-17 58-6 48 17C35 34 15 17 6 0Z" fill="${color}"/><path d="M-43 8L0 0L0 33M0 0L40 12M-17-45L0 0L18-45M0 0L37-27" fill="none" stroke="#f3d368" stroke-width="4" stroke-linecap="round"/><path d="M-45 5L-4 0M-32 14L-4 1M4 5L34 18M5 7L9 32" fill="none" stroke="#fff8dc" stroke-width="1.6"/>`;
  else if(id==='tulip') petals=`<path d="M-29-48Q-36 9 0 16Q37 5 28-48Q9-37 0-59Q-10-33-29-48Z" fill="${color}" stroke="#fff7e4" stroke-opacity=".65" stroke-width="2"/><path d="M-17-41Q-15-4 0 14Q18-9 16-40M0-53V8" fill="none" stroke="#fff8ed" stroke-opacity=".55" stroke-width="2"/>`;
  else if(id==='lavender') petals=Array.from({length:10},(_,i)=>`<ellipse cx="${i%2?-7:7}" cy="${-i*8}" rx="9" ry="13" transform="rotate(${i%2?-20:20} ${i%2?-7:7} ${-i*8})" fill="${color}" stroke="#faf4ff" stroke-opacity=".35"/>`).join('');
  else if(id==='hydrangea') petals=Array.from({length:10},(_,i)=>`<g transform="translate(${Math.cos(i*2.4)*23} ${Math.sin(i*2.4)*22}) scale(.35)">${[0,90,180,270].map(a=>petal(a,21,26)).join('')}<circle r="7" fill="#f6e2b3"/></g>`).join('');
  else if(id==='lily') petals=Array.from({length:6},(_,i)=>`<path d="M0 0Q-30-21-9-62Q12-36 0 0Z" transform="rotate(${i*60})" fill="${color}" stroke="#fff8db" stroke-opacity=".7" stroke-width="2"/>`).join('')+'<g stroke="#a87947" stroke-width="2">'+[0,70,140,210,280].map(a=>`<path d="M0 0L0-22" transform="rotate(${a})"/>`).join('')+'</g>';
  else if(id==='rose'||id==='peony') petals=[0,1,2].map(layer=>`<g transform="scale(${1-layer*.27}) rotate(${layer*27})">${Array.from({length:7},(_,i)=>petal(i*51.4,layer?20:24,layer?26:32)).join('')}</g>`).join('')+`<path d="M-9 1Q-6-16 8-9Q22 2 8 12Q-8 21-14 6Q-17-4-7-11" fill="none" stroke="#fff5e3" stroke-opacity=".5" stroke-width="3"/>`;
  else petals=Array.from({length:id==='cherry'?5:id==='sunflower'?15:12},(_,i)=>petal(i*360/(id==='cherry'?5:id==='sunflower'?15:12),id==='cherry'?23:10,id==='cherry'?26:32)).join('')+`<circle r="${id==='sunflower'?20:11}" fill="${id==='sunflower'?'#77533e':'#e8be64'}"/><circle r="5" fill="#f8df96"/>`;
  return `<g class="garden-bloom">${petals}</g>`;
}
export function gardenBouquet(c:GardenConfig,envelope=false):string {
  const key=`garden-art-${++sequence}`,wrap=gardenWraps.find(w=>w.id===c.wrap)!.hex,ribbon=gardenRibbons.find(w=>w.id===c.ribbon)!.hex;
  const flowers=c.flowers.flatMap(f=>Array.from({length:f.quantity},()=>f)), total=flowers.length;
  const arrangement=flowers.map((f,i)=>{
    const angle=i*2.399963, radius=Math.sqrt((i+.6)/total)*(c.shape==='grand'?163:c.shape==='round'?128:145);
    const x=300+Math.cos(angle)*radius;let y=217+Math.sin(angle)*radius*(c.shape==='round'?.8:1.05);
    if(c.shape==='cascade')y+=Math.abs(x-300)*.45;
    if(c.shape==='garden')y+=Math.sin(i*3.1)*34;
    return {f,x,y,i};
  }).sort((a,b)=>a.y-b.y);
  const stems=arrangement.map(({x,y,i})=>`<path d="M300 447Q${x+(i%2?25:-25)} ${y+130} ${x} ${y}" fill="none" stroke="${i%2?'#7c9d67':'#5e8263'}" stroke-width="4"/><path d="M${x} ${y+100}q${i%2?45:-45}-40 ${i%2?35:-35}-83q${i%2?-2:2}55 ${i%2?-35:35}83Z" fill="${i%2?'#86a975':'#729467'}"/>`).join('');
  const blooms=arrangement.map(({x,y,f,i})=>`<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${i%2?14:-15}) scale(${total>30?.64:total>18?.8:.93})" style="--sway-delay:${i%6*-1}s">${flowerDrawing(f.id,`url(#${key}-${f.color})`)}</g>`).join('');
  const gradients=gardenColors.map(color=>`<radialGradient id="${key}-${color.id}" cx=".3" cy=".15" r=".9"><stop stop-color="#fff9ed"/><stop offset=".4" stop-color="${color.hex}"/><stop offset="1" stop-color="${color.hex}" stop-opacity=".9"/></radialGradient>`).join('');
  const extras=c.extras.includes('pearls')?Array.from({length:17},(_,i)=>`<circle cx="${170+i*16}" cy="${470+Math.sin(i*.5)*10}" r="4" fill="#fffbed" stroke="#cfb78d" stroke-width="1"/>`).join(''):'';
  const lights=c.extras.includes('lights')?Array.from({length:13},(_,i)=>`<circle class="garden-light" cx="${190+Math.sin(i*2.4)*113}" cy="${130+i*23}" r="3.5" fill="#f5d880" style="animation-delay:${i*.3}s"/>`).join(''):'';
  const wrapper=envelope?`<path d="M142 381L300 272L458 381V608H142Z" fill="${wrap}"/><path d="M142 381L300 492L458 381" stroke="#a7977c" stroke-opacity=".5" fill="none"/>`:`<path d="M125 264L285 403L189 308L153 395L236 516L255 608L344 608L364 516L447 395L411 308L316 403L475 264L391 458L300 535L209 458Z" fill="${wrap}" stroke="#fff5e3" stroke-width="2"/><path d="M125 264L290 450L300 602L209 458ZM475 264L311 450L300 602L391 458Z" fill="#fff9ed" opacity=".24"/>`;
  const bow=envelope?'':`<g fill="${ribbon}" stroke="#fff7df" stroke-opacity=".45"><path d="M295 489Q234 443 224 483Q220 526 295 502ZM305 489Q366 443 376 483Q380 526 305 502Z"/><path d="M296 501L246 578L265 570L275 590L309 505ZM306 501L348 582L338 567L318 586L294 505Z"/><ellipse cx="300" cy="497" rx="15" ry="13"/></g>`;
  return `<svg class="garden-bouquet" viewBox="0 0 600 650" role="img" aria-label="Ilustración del jardín personalizado"><defs>${gradients}</defs><ellipse cx="300" cy="612" rx="147" ry="13" fill="#5b4537" opacity=".08"/>${stems}${blooms}${lights}${wrapper}${bow}${extras}${c.extras.includes('lace')&&!envelope?'<path d="M188 419Q300 537 412 419" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="2 7"/>':''}${c.extras.includes('heart')&&!envelope?`<g transform="translate(295 548)"><path d="M0 0C-28-25-40 13 0 35C40 13 28-25 0 0Z" fill="#fff9e8"/><text x="0" y="18" text-anchor="middle" fill="#824557" font-size="9">KUYARI</text></g>`:''}</svg>`;
}
export function gardenLetter(c:GardenConfig,recipient='',sender='',message=''):string {
  const d=gardenDesigns.find(o=>o.id===c.design)!;
  return `<div class="garden-letter-art design-${d.id} ${c.motion?'':'garden-still'}">${gardenBouquet(c,true)}<div class="garden-letter-sheet"><span class="garden-letter-flourish" aria-hidden="true">❦</span><small data-garden-to>${esc(recipient?`Para ${recipient}`:'Para mi persona favorita')}</small><p data-garden-message>${esc(message||'Hay un lugar bonito donde todo florece: a tu lado. Este pequeño jardín guarda mis palabras, mis sueños y todo lo que siento por ti.')}</p><span data-garden-from>${esc(sender?`Con cariño, ${sender}`:'Con todo mi cariño ♡')}</span></div><div class="garden-envelope-front garden-wrap-${c.wrap}"><span>KUYARI · palabras que florecen</span><i aria-hidden="true">♡</i></div></div>`;
}
export function gardenBackdrop(c:GardenConfig):string {
  const blooms=[{x:18,y:630,scale:2.4},{x:970,y:660,scale:2.4},{x:130,y:200,scale:1.1},{x:866,y:180,scale:1.2},{x:63,y:410,scale:.85},{x:929,y:380,scale:.9}];
  return `<svg class="love-art garden-background-art" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${blooms.map((b,i)=>{const f=c.flowers[i%c.flowers.length],color=gardenColors.find(o=>o.id===f.color)!.hex;return `<g><path d="M${b.x<500?0:1000} 1050Q${b.x+35} ${b.y+150} ${b.x} ${b.y}" stroke="#8ba97b" stroke-width="4" fill="none"/><path d="M${b.x} ${b.y+145}q${b.x<500?105:-105}-50 ${b.x<500?95:-95}-140q0 90 ${b.x<500?-95:95}140Z" fill="#9db58a" opacity=".8"/><g transform="translate(${b.x} ${b.y}) scale(${b.scale}) rotate(${b.x<500?-10:12})">${flowerDrawing(f.id,color)}</g></g>`;}).join('')}</svg>`;
}
