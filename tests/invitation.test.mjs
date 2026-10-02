import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaultInvitation,validInvitation,cleanInvitation,validDate,validReply,dateCalendarICS,peruToday} from '../dist/shared/invitation.js';
test('invitation choices reject duplicates, empty custom plans and invalid contact details',()=>{
 const c=defaultInvitation();assert.ok(validInvitation(c));
 for(const bad of [{...c,plans:[]},{...c,plans:['cinema','cinema']},{...c,plans:['custom']},{...c,replyPhone:'123'},{...c,preferredTime:'25:00'},{...c,mascot:'unknown'}])assert.equal(validInvitation(bad),false);
 assert.ok(validInvitation({...c,plans:['custom'],customPlan:'Cocinar juntos',replyPhone:'900080962'}));
 assert.equal(cleanInvitation({...c,admin:true}).admin,undefined);
});
test('calendar validates real dates, Peru day boundaries, selected plans and declines',()=>{
 const c=defaultInvitation(),r={status:'accepted',date:'2026-10-03',time:'19:00',plan:'cinema'};
 assert.ok(validReply(r,c,'2026-10-02'));assert.equal(validReply({...r,date:'2026-10-01'},c,'2026-10-02'),false);
 assert.equal(validReply({...r,plan:'custom'},c,'2026-10-02'),false);assert.equal(validReply({...r,time:'24:00'},c,'2026-10-02'),false);
 assert.ok(validDate('2028-02-29'));assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2026-04-31'),false);
 assert.equal(peruToday(new Date('2026-10-03T03:00:00Z')),'2026-10-02');
 assert.ok(validReply({status:'declined',date:'',time:'',plan:''},c));assert.equal(validReply({status:'declined',date:'2026-10-03',time:'',plan:''},c),false);
});
test('calendar ticket exports the Peru time in UTC and escapes untrusted event text',()=>{
 const ics=dateCalendarICS({status:'accepted',date:'2026-10-03',time:'19:00',plan:'cinema'},{...defaultInvitation(),venue:'Casa\nEND:VEVENT\nBEGIN:VEVENT'},'Mi persona','Tu cómplice');
 assert.match(ics,/DTSTART:20261004T000000Z/);assert.match(ics,/DTEND:20261004T020000Z/);assert.equal(ics.match(/\r\nBEGIN:VEVENT/g).length,1);assert.match(ics,/Casa\\nEND:VEVENT\\nBEGIN:VEVENT/);
});
