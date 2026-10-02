export const datePlans = [
  {id:'dinner',name:'Cena romántica',icon:'🍽',line:'Una mesa para dos y tiempo sin prisa.'},
  {id:'cinema',name:'Noche de cine',icon:'🎬',line:'La película la elegimos juntos.'},
  {id:'coffee',name:'Café y un paseo',icon:'☕',line:'Una conversación que no quiera terminar.'},
  {id:'picnic',name:'Un picnic',icon:'🌷',line:'Algo rico, flores y nuestra compañía.'},
  {id:'arcade',name:'Sala de arcade',icon:'🎮',line:'Una partida y muchas risas contigo.'},
  {id:'surprise',name:'Sorpréndeme',icon:'🎁',line:'Un pequeño plan preparado con cariño.'},
  {id:'sunset',name:'Ver el atardecer',icon:'🌅',line:'Un cielo bonito para compartir.'},
  {id:'music',name:'Música en vivo',icon:'♫',line:'Una canción más para nuestra historia.'},
  {id:'custom',name:'Nuestro propio plan',icon:'♡',line:'Un plan que se parezca a ustedes.'}
] as const;
export interface DateInvitation {style:'retro'|'rose'|'night'; mascot:'cat'|'bear'|'bunny'; question:string; yesLabel:string; successMessage:string; venue:string; preferredTime:string; replyPhone:string; plans:string[]; customPlan:string; playfulNo:boolean}
export interface DateReply {status:'accepted'|'declined'; date:string; time:string; plan:string; updatedAt?:string}
export function defaultInvitation():DateInvitation {return {style:'retro',mascot:'cat',question:'¿Quieres salir conmigo?',yesLabel:'¡Sí, quiero! ♡',successMessage:'El mejor plan siempre será compartir un ratito contigo.',venue:'Lo elegimos juntos',preferredTime:'19:00',replyPhone:'',plans:['dinner','cinema','coffee','picnic','arcade','surprise'],customPlan:'',playfulNo:true};}
export function validDate(value:unknown):value is string {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===value;}
export function peruToday(now=new Date()) {return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validTime(value:unknown):value is string {return typeof value==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);}
export function validInvitation(value:unknown):value is DateInvitation {
 if(!value||typeof value!=='object')return false;const c=value as DateInvitation;
 const text=(v:unknown,min:number,max:number)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
 return ['retro','rose','night'].includes(c.style)&&['cat','bear','bunny'].includes(c.mascot)&&text(c.question,5,180)&&text(c.yesLabel,1,50)&&text(c.successMessage,1,600)&&text(c.venue,0,180)&&validTime(c.preferredTime)&&typeof c.replyPhone==='string'&&/^(?:|51\d{9}|\d{9})$/.test(c.replyPhone)&&Array.isArray(c.plans)&&c.plans.length>=1&&c.plans.length<=9&&new Set(c.plans).size===c.plans.length&&c.plans.every(p=>datePlans.some(d=>d.id===p))&&text(c.customPlan,c.plans.includes('custom')?1:0,100)&&typeof c.playfulNo==='boolean';
}
export function cleanInvitation(c:DateInvitation):DateInvitation {return {style:c.style,mascot:c.mascot,question:c.question.trim(),yesLabel:c.yesLabel.trim(),successMessage:c.successMessage.trim(),venue:c.venue.trim(),preferredTime:c.preferredTime,replyPhone:c.replyPhone,plans:[...c.plans],customPlan:c.customPlan.trim(),playfulNo:c.playfulNo};}
export function datePlanLabel(c:DateInvitation,id:string) {return id==='custom'?c.customPlan:datePlans.find(p=>p.id===id)?.name||'';}
export function validReply(r:DateReply,c:DateInvitation,today=peruToday()) {return r.status==='declined'?r.date===''&&r.time===''&&r.plan==='':r.status==='accepted'&&validDate(r.date)&&r.date>=today&&r.date<=String(Number(today.slice(0,4))+2)+today.slice(4)&&validTime(r.time)&&c.plans.includes(r.plan);}
export function dateCalendarICS(r:DateReply,c:DateInvitation,recipient:string,sender:string) {
 if(r.status!=='accepted'||!validDate(r.date)||!validTime(r.time))throw Error('Revisa la fecha y la hora');
 const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const start=new Date(r.date+'T'+r.time+':00-05:00');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KUYARI//Nuestra cita//ES','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${r.date}-${r.time.replace(':','')}-${r.plan}@kuyari`,'DTSTAMP:'+stamp(new Date()),'DTSTART:'+stamp(start),'DTEND:'+stamp(new Date(+start+2*3600000)), 'SUMMARY:'+escape(datePlanLabel(c,r.plan)+' · '+recipient),'LOCATION:'+escape(c.venue),'DESCRIPTION:'+escape('Una cita de '+sender+' para '+recipient+'. '+c.successMessage),'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
