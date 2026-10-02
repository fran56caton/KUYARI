export const gardenFlowers = [
  {id:'iris',name:'Iris',line:'Un pequeño jardín de acuarela'}, {id:'rose',name:'Rosas',line:'La manera clásica de decir te amo'},
  {id:'tulip',name:'Tulipanes',line:'Ternura que florece'}, {id:'lily',name:'Lirios',line:'Elegancia en cada pétalo'},
  {id:'daisy',name:'Margaritas',line:'El encanto de las cosas sencillas'}, {id:'sunflower',name:'Girasoles',line:'Un abrazo lleno de luz'},
  {id:'peony',name:'Peonías',line:'Pétalos suaves y románticos'}, {id:'lavender',name:'Lavanda',line:'Un rincón de calma'},
  {id:'hydrangea',name:'Hortensias',line:'Pequeñas flores, mucho cariño'}, {id:'cherry',name:'Flor de cerezo',line:'Una primavera para ustedes'}
] as const;
export const gardenColors = [
  {id:'pink',name:'Rosa',hex:'#df84a6'}, {id:'wine',name:'Borgoña',hex:'#943c55'}, {id:'ivory',name:'Marfil',hex:'#f6ead8'},
  {id:'blue',name:'Azul',hex:'#578cc5'}, {id:'lilac',name:'Lavanda',hex:'#ac8cc5'}, {id:'yellow',name:'Amarillo',hex:'#efd465'},
  {id:'peach',name:'Durazno',hex:'#f2b69d'}, {id:'coral',name:'Coral',hex:'#dc7155'}
] as const;
export const gardenDesigns = [
  {id:'watercolor',name:'Carta entre iris',line:'Papel de algodón, un sobre y flores de acuarela.',bg:'#e9f4fb',paper:'#fffdf6',ink:'#4c574e',palette:'sky'},
  {id:'rose-letter',name:'Rosas de amor',line:'Rosa antiguo, pétalos y palabras que abrazan.',bg:'#fae9ec',paper:'#fff7f5',ink:'#79354f',palette:'rose'},
  {id:'botanical',name:'Herbario de nosotros',line:'Verde salvia, trazos botánicos y papel artesanal.',bg:'#edf1e5',paper:'#fcf8e9',ink:'#46604c',palette:'sage'},
  {id:'royal',name:'Jardín de palacio',line:'Una dedicatoria enmarcada en marfil y oro.',bg:'#f6eddc',paper:'#fffbef',ink:'#715630',palette:'ivory'},
  {id:'blue-love',name:'Un cielo contigo',line:'Flores azules y pequeños sueños compartidos.',bg:'#e7eff9',paper:'#f7faff',ink:'#3e5d80',palette:'sky'},
  {id:'sunset',name:'Atardecer de seda',line:'Durazno, luz cálida y un lazo coral.',bg:'#f9e9de',paper:'#fff8ec',ink:'#95583f',palette:'peach'},
  {id:'moon-garden',name:'Flores bajo la luna',line:'Un sobre azul noche, estrellas y flores de lavanda.',bg:'#29364e',paper:'#f7f1e7',ink:'#544979',palette:'midnight'},
  {id:'cherry-letter',name:'Primavera de amor',line:'Flores de cerezo, papel rosa y pequeños corazones.',bg:'#f6e8f0',paper:'#fff4fa',ink:'#834963',palette:'blush'}
] as const;
export const gardenShapes = [{id:'garden',name:'Jardín silvestre'},{id:'round',name:'Ramo redondo'},{id:'cascade',name:'Cascada romántica'},{id:'grand',name:'Gran ramo'}] as const;
export const gardenWraps = [{id:'kraft',name:'Papel artesanal',hex:'#d1b992'},{id:'ivory',name:'Marfil perlado',hex:'#f3eada'},{id:'pink',name:'Rosa empolvado',hex:'#e7b9cc'},{id:'blue',name:'Azul cielo',hex:'#b4cde3'},{id:'lilac',name:'Lavanda suave',hex:'#c5b5df'},{id:'wine',name:'Borgoña elegante',hex:'#874555'}] as const;
export const gardenRibbons = [{id:'rose',name:'Seda rosa',hex:'#d595b0'},{id:'wine',name:'Terciopelo vino',hex:'#913c58'},{id:'gold',name:'Dorado',hex:'#c8a466'},{id:'ivory',name:'Satén marfil',hex:'#eee1c8'},{id:'blue',name:'Seda azul',hex:'#6999c2'},{id:'lilac',name:'Lazo lavanda',hex:'#aa8fc1'},{id:'sage',name:'Verde salvia',hex:'#8caa89'},{id:'coral',name:'Seda coral',hex:'#db987c'}] as const;
export const gardenExtras = [{id:'pearls',name:'Perlas decorativas'},{id:'lace',name:'Encaje delicado'},{id:'heart',name:'Etiqueta de corazón'},{id:'lights',name:'Luces cálidas'},{id:'chocolate',name:'Chocolates'},{id:'plush',name:'Peluche'}] as const;
export interface GardenConfig {
  design: typeof gardenDesigns[number]['id']; flowers: {id:typeof gardenFlowers[number]['id'];color:typeof gardenColors[number]['id'];quantity:number}[];
  shape:typeof gardenShapes[number]['id']; wrap:typeof gardenWraps[number]['id']; ribbon:typeof gardenRibbons[number]['id']; extras:typeof gardenExtras[number]['id'][]; motion:boolean;
}
export function defaultGarden(): GardenConfig {return {design:'watercolor',flowers:[{id:'iris',color:'yellow',quantity:3},{id:'iris',color:'coral',quantity:2},{id:'iris',color:'blue',quantity:2},{id:'iris',color:'peach',quantity:2}],shape:'garden',wrap:'kraft',ribbon:'gold',extras:['heart'],motion:true};}
const mixes: GardenConfig['flowers'][] = [defaultGarden().flowers,[{id:'rose',color:'pink',quantity:7},{id:'daisy',color:'ivory',quantity:4}],[{id:'tulip',color:'lilac',quantity:5},{id:'lily',color:'ivory',quantity:3},{id:'lavender',color:'lilac',quantity:4}],[{id:'peony',color:'ivory',quantity:7},{id:'rose',color:'wine',quantity:4}],[{id:'hydrangea',color:'blue',quantity:5},{id:'lily',color:'ivory',quantity:3}],[{id:'sunflower',color:'yellow',quantity:5},{id:'tulip',color:'peach',quantity:4}],[{id:'rose',color:'lilac',quantity:6},{id:'lavender',color:'lilac',quantity:6}],[{id:'cherry',color:'pink',quantity:7},{id:'peony',color:'pink',quantity:4}]];
export const gardenTemplates = gardenDesigns.flatMap((d,i)=>['Una carta para ti','Nuestra celebración','Un abrazo en flores'].map((name,j)=>({id:`${d.id}-${j+1}`,name:`${d.name} · ${j+1}`,line:name,occasion:['Porque te amo','Aniversario','Cumpleaños'][j],config:{...defaultGarden(),design:d.id,flowers:mixes[i].map(f=>({...f})),shape:gardenShapes[(i+j)%4].id,wrap:gardenWraps[(i+j)%6].id,ribbon:gardenRibbons[(i+j)%8].id,extras: j===1?['pearls','heart']:j===2?['lights','heart']:['heart']} as GardenConfig})));
export function validGarden(value: unknown): value is GardenConfig {
  if (!value || typeof value!=='object') return false;
  const c=value as GardenConfig;
  if(!gardenDesigns.some(o=>o.id===c.design)||!gardenShapes.some(o=>o.id===c.shape)||!gardenWraps.some(o=>o.id===c.wrap)||!gardenRibbons.some(o=>o.id===c.ribbon)||typeof c.motion!=='boolean')return false;
  if(!Array.isArray(c.flowers)||!c.flowers.length||c.flowers.length>8||!c.flowers.every(f=>f&&gardenFlowers.some(o=>o.id===f.id)&&gardenColors.some(o=>o.id===f.color)&&Number.isInteger(f.quantity)&&f.quantity>=1&&f.quantity<=12)||c.flowers.reduce((s,f)=>s+f.quantity,0)>48)return false;
  if(new Set(c.flowers.map(f=>f.id+':'+f.color)).size!==c.flowers.length)return false;
  return Array.isArray(c.extras)&&c.extras.length<=6&&new Set(c.extras).size===c.extras.length&&c.extras.every(id=>gardenExtras.some(o=>o.id===id));
}
export function gardenSummary(c:GardenConfig):string {
  const name=(list:readonly {id:string;name:string}[],id:string)=>list.find(o=>o.id===id)?.name||'';
  return [`Diseño de carta: ${name(gardenDesigns,c.design)}`,`Flores: ${c.flowers.map(f=>`${f.quantity} ${name(gardenFlowers,f.id)} (${name(gardenColors,f.color)})`).join(', ')}`,`Ramo: ${name(gardenShapes,c.shape)}`,`Envoltura: ${name(gardenWraps,c.wrap)}`,`Cinta: ${name(gardenRibbons,c.ribbon)}`,`Detalles: ${c.extras.map(id=>name(gardenExtras,id)).join(', ')||'Sin extras'}`].join('\n');
}
export interface GardenDraft {config:GardenConfig;recipient:string;sender:string;message:string;title:string;occasion:string;closing:string;giftId:string;notes:string}
export const gardenDraftKey='kuyari-garden-draft-v1';
export function validGardenDraft(value:unknown):value is GardenDraft {
  if(!value||typeof value!=='object')return false;const d=value as GardenDraft;
  return validGarden(d.config)&&(['recipient','sender','title','occasion','closing','giftId','message','notes'] as const).every(k=>typeof d[k]==='string'&&d[k].length<=(k==='message'?6000:k==='notes'?300:k==='closing'?600:180));
}
export function gardenIdea(occasion:string,recipient=''):string {
  const to=recipient.trim()?`${recipient.trim()}, `:'';
  const stories:Record<string,string>={
    'Porque te amo':'hay un lugar donde todos mis días florecen: a tu lado. Me gusta tu risa, la calma de tus abrazos y esa forma tuya de volver especial lo cotidiano.\n\nSi estas flores pudieran hablar, te dirían que te elijo en los días de sol y también en los de lluvia. Gracias por ser mi persona favorita. Quiero seguir haciendo recuerdos contigo.',
    Aniversario:'volvería a elegir el camino que me llevó a ti. Cada recuerdo nuestro es una flor que guardo con cariño; cada día juntos, una nueva oportunidad de cuidarnos.\n\nGracias por este capítulo y por los pequeños detalles que hacen tan bonita nuestra historia. Todavía tengo muchas páginas y muchos abrazos para ti.',
    Cumpleaños:'hoy celebro la suerte de que existas. Deseo que este nuevo año te regale sueños cumplidos, paz y muchas razones para sonreír.\n\nPreparé este pequeño jardín pensando en ti, para recordarte cuánto cariño te rodea. Que nunca te falte una mano que te acompañe y un lugar donde sentirte en casa. Feliz cumpleaños.',
    'Día del Novio':'me encanta tenerte en mis planes, en mis canciones y en esas sonrisas que aparecen sin avisar. Me gusta quién eres y lo bonito que se siente compartir la vida contigo.\n\nEste jardín guarda un abrazo para mi novio, mi compañero y mi historia favorita. Gracias por todos tus detalles. Te quiero en los días especiales y en todos los demás.',
    'Para mamá':'tu cariño ha sido el jardín en el que aprendí a crecer. Gracias por tus manos, por escucharme y por estar incluso cuando no sé cómo pedir un abrazo.\n\nHoy estas flores llevan un poquito de toda la ternura que me has dado. Te quiero muchísimo y deseo que te sientas tan cuidada como siempre me has cuidado.',
    Amistad:'hay amistades que hacen florecer los días. Gracias por las risas, por escuchar y por tantos momentos que guardo con cariño.\n\nEste jardín es un abrazo y una manera de decirte que me alegra muchísimo haberte encontrado.'
  };
  return to+(stories[occasion]||'pensé en ti y quise regalarte un momento bonito. En cada flor hay un gracias, en cada palabra hay cariño y en este pequeño jardín hay un abrazo que puedes volver a abrir cuando quieras.\n\nOjalá estas palabras te recuerden lo especial que eres para mí.');
}
