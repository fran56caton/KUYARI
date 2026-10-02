import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultGarden,gardenTemplates,gardenFlowers,gardenColors,gardenSummary,validGarden,validGardenDraft,gardenIdea} from '../dist/shared/garden.js';
import {gardenLetter} from '../dist/client/garden-art.js';
test('all garden templates are distinct, bounded and valid',()=>{
 assert.equal(gardenTemplates.length,24);assert.equal(new Set(gardenTemplates.map(t=>t.id)).size,24);
 assert.equal(new Set(gardenTemplates.map(t=>JSON.stringify(t.config))).size,24);
 assert.equal(gardenFlowers.length,10);assert.equal(gardenColors.length,8);
 for(const t of gardenTemplates)assert.ok(validGarden(t.config),t.id);
});
test('rejects unknown selections, duplicate flowers and quantities outside preparation limits',()=>{
 const c=defaultGarden();assert.ok(validGarden(c));
 for(const bad of [{...c,design:'unknown'},{...c,ribbon:'<script>'},{...c,flowers:[]},{...c,flowers:[{id:'iris',color:'blue',quantity:0}]},{...c,flowers:[{id:'iris',color:'blue',quantity:13}]},{...c,flowers:[c.flowers[0],c.flowers[0]]},{...c,extras:['heart','heart']},{...c,flowers:gardenColors.map(o=>({id:'rose',color:o.id,quantity:12}))}])assert.equal(validGarden(bad),false);
});
test('garden summary preserves species, color, quantities, wrapping, ribbon and every extra',()=>{
 const c={...defaultGarden(),wrap:'ivory',ribbon:'wine',extras:['pearls','chocolate']};
 const s=gardenSummary(c);assert.match(s,/3 Iris \(Amarillo\)/);assert.match(s,/2 Iris \(Azul\)/);assert.match(s,/Marfil perlado/);assert.match(s,/Terciopelo vino/);assert.match(s,/Perlas decorativas, Chocolates/);
});
test('draft validation and letter rendering handle untrusted messages without executable markup',()=>{
 const draft={config:defaultGarden(),recipient:'<script>bad()</script>',sender:'A & B',message:'<img src=x onerror=bad()>',title:'Una carta',occasion:'Porque te amo',closing:'Con cariño',giftId:'',notes:''};
 assert.ok(validGardenDraft(draft));assert.equal(validGardenDraft({...draft,message:'x'.repeat(6001)}),false);
 const html=gardenLetter(draft.config,draft.recipient,draft.sender,draft.message);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;img/);assert.match(html,/A &amp; B/);
});
test('occasion suggestions include editable romantic paragraphs and the intended recipient',()=>{
 const birthday=gardenIdea('Cumpleaños','Ana'),anniversary=gardenIdea('Aniversario','Ana');assert.match(birthday,/Ana, /);assert.match(birthday,/cumpleaños/);assert.notEqual(birthday,anniversary);assert.match(gardenIdea('Día del Novio'),/mi novio/);
});
