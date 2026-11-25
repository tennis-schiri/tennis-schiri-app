import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=JSON.parse(fs.readFileSync(path.join(root,'site/roadmap-seed.json'),'utf8')).items;
const additions=JSON.parse(fs.readFileSync(path.join(root,'roadmap-site/additions.json'),'utf8')).items;
const items=[...base,...additions];
const source=fs.readFileSync(path.join(root,'roadmap-site/roadmap.js'),'utf8');
const bootstrap='load().then(()=>{if(pendingInviteToken&&!state.offline)registrationModal();});';
assert.ok(source.includes(bootstrap),'Quelltext-Bootstrap bekannt');
const safeScript=source.replace(bootstrap,'');
const sandbox={
  document:{
    getElementById(){return {textContent:'',className:''};},
    addEventListener(){},
    querySelector(){return null;},
    body:{classList:{add(){},remove(){}}}
  },
  window:{location:{hash:'',pathname:'/roadmap',search:''},history:{replaceState(){}}},
  setTimeout(){},
  clearTimeout(){},
  console
};
vm.runInNewContext(safeScript+`
  globalThis.__sections={
    PRODUCTS,PRODUCT_STREAMS,productOf,productStream,productStreamOptions,streamLabel,
    setItems(items){state.items=items;},
    setProduct(value){filterProduct=value;filterStream='all';},
    setStream(value){filterStream=value;},
    overview(){return productOverview();},
    filtered(){return itemsFiltered();}
  };
`,sandbox,{filename:'roadmap.js'});
const ui=sandbox.__sections;
// HTML-Sonderzeichen werden von der Website aus Sicherheitsgründen maskiert.
// Der Test prüft die tatsächliche HTML-Ausgabe, nicht den unmaskierten Produktnamen.
const htmlEscape=value=>String(value).replace(/[&<>"']/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[char]));

test('Alle Projektfamilien einschließlich unabhängiger Mini-Apps haben eigene Entwicklungsbereiche',()=>{
  assert.deepEqual(Array.from(ui.PRODUCTS.map(x=>x[0])),['all','tournament','score','umpire','clubdisplay','business','platform','miniapps']);
  for(const key of ['tournament','score','umpire','clubdisplay','business','platform','miniapps']){
    assert.ok(ui.PRODUCT_STREAMS[key]?.length>=3,key);
  }
});

test('Alle offiziellen Themen sind genau einem gültigen Bereich zugeordnet',()=>{
  const ids=new Set();
  for(const item of items){
    assert.ok(!ids.has(item.id),'Doppelte ID '+item.id);
    ids.add(item.id);
    const product=ui.productOf(item);
    assert.ok(ui.PRODUCT_STREAMS[product],item.id);
    assert.notEqual(ui.productStream(item),'other','Ohne Entwicklungsbereich: '+item.id);
    assert.ok(ui.streamLabel(item).length>0,item.id);
  }
  assert.ok(ids.size>=97,'TENNILO- und JUXILO-Themen ohne Verlust');
  assert.equal(items.filter(x=>x.category==='Weitere Apps').length,17,'17 JUXILO-/Mini-App-Einträge');
});

test('Die Gesamtübersicht zeigt alle Projekte mit den echten Themenzahlen',()=>{
  ui.setItems(items);
  ui.setProduct('all');
  const html=ui.overview();
  for(const [product,label] of ui.PRODUCTS.slice(1)){
    assert.match(html,new RegExp('data-product="'+product+'"'));
    assert.ok(html.includes(htmlEscape(label)),label);
  }
});

test('Für jedes Projekt sind Bereichsschaltflächen und Statusfilter verfügbar',()=>{
  ui.setItems(items);
  for(const [product,label] of ui.PRODUCTS.slice(1)){
    ui.setProduct(product);
    const ownItems=items.filter(x=>ui.productOf(x)===product);
    const html=ui.overview();
    assert.ok(html.includes(htmlEscape(label)+': Entwicklung nach Bereichen'),label);
    assert.ok(html.includes('data-action="stream"'),product);
    assert.equal(ui.filtered().length,ownItems.length,product);
    for(const [stream] of ui.PRODUCT_STREAMS[product]){
      ui.setStream(stream);
      assert.equal(ui.filtered().length,ownItems.filter(x=>ui.productStream(x)===stream).length,product+'/'+stream);
      ui.setStream('all');
    }
  }
});

test('Nicht zugewiesene Ideen erscheinen unter Weitere Themen',()=>{
  const custom={id:'custom-idea',title:'Vorschlag',description:'',category:'TENNILO Umpire',status:'idea',priority:'medium'};
  assert.equal(ui.productStream(custom),'other');
  assert.ok(ui.productStreamOptions('umpire',[custom]).some(([key,label])=>key==='other'&&label==='Weitere Themen'));
});

test('Unter JUXILO bleiben alle sechs Mini-Apps in Demo und nativer Planung getrennt',()=>{
  const slugs=['wer-muss','punktlandung','fingerchaos','nicht-kleckern','nur-noch-einmal','voellig-daneben'];
  for(const slug of slugs){
    assert.ok(items.some(x=>x.id==='mini-'+slug+'-demo'&&x.status==='test'),slug+' Demo');
    assert.ok(items.some(x=>x.id==='mini-'+slug+'-native'),slug+' Native');
    assert.ok(ui.PRODUCT_STREAMS.miniapps.some(([key])=>key===slug),slug+' Bereich');
  }
  ui.setItems(items);
  ui.setProduct('miniapps');
  const html=ui.overview();
  for(const icon of ['wm04b-logo.svg','pl05-icon.webp','fc05-icon.webp','nk05-icon.webp','ne05-icon.webp','vd05-icon.webp']){
    assert.ok(html.includes(icon),'Originalicon '+icon);
  }
  assert.ok(html.includes('rm-mini-overview'),'eigenständige JUXILO-Gestaltung');
  assert.ok(html.includes('juxilo-jx04-logo-white.svg'),'JUXILO JX04-Original-Logo');
  assert.ok(html.includes('JUXILO: Entwicklung nach Bereichen'),'JUXILO sichtbar als Dachmarke');
  assert.ok(items.some(x=>x.id==='juxilo-brand-jx04'&&x.workstream==='studio'),'eigenständige Dachmarken-Aufgabe');
});

test('Mini-App-Karten und Listen bleiben auf dunklem Hintergrund lesbar',()=>{
  const css=fs.readFileSync(path.join(root,'roadmap-site/extra.css'),'utf8');
  const rule=(selector)=>css.split('}').find(block=>block.split('{')[0].trim()===selector)?.split('{')[1]||'';
  for(const [selector,color] of [
    ['.standalone-roadmap .rm-mini-card>strong','#faf9ff'],
    ['.standalone-roadmap .rm-mini-card>p','#d4d4e5'],
    ['.standalone-roadmap .rm-mini-card .rm-card-foot','#c2c5dc'],
    ['.standalone-roadmap .rm-mini-row .rm-list-main small','#cbd0e4'],
    ['.standalone-roadmap .rm-mini-row .rm-list-priority','#d2d5e8'],
    ['.standalone-roadmap .rm-mini-streams button strong','#f7f5ff']
  ]){
    assert.ok(rule(selector).includes('color:'+color),selector+' muss helle Schrift verwenden');
  }
  assert.ok(css.includes('.rm-mini-card{border-left:4px solid var(--app-accent'));
  assert.ok(css.includes('background:linear-gradient(130deg,#24213c,#151727)'));
});

test('JUXILO ist Dachmarke, kein siebtes Spiel – und die Originalvektoren werden ausgeliefert',()=>{
  const index=fs.readFileSync(path.join(root,'roadmap-site/index.php'),'utf8');
  const workflow=fs.readFileSync(path.join(root,'.github/workflows/roadmap-subdomain.yml'),'utf8');
  const js=fs.readFileSync(path.join(root,'roadmap-site/roadmap.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'roadmap-site/extra.css'),'utf8');
  const mini=items.filter(x=>x.category==='Weitere Apps');
  assert.equal(mini.length,17);
  assert.equal(mini.filter(x=>x.id.endsWith('-demo')).length,6);
  assert.equal(mini.filter(x=>x.id.endsWith('-native')).length,6);
  assert.ok(mini.some(x=>x.id==='juxilo-brand-jx04'&&x.title.includes('JUXILO')));
  assert.ok(js.includes('["miniapps","JUXILO"]'),'Dachmarke als Projektfilter');
  assert.ok(js.includes('["wer-muss","Wer muss?!"]'),'Wer muss?! als Einzel-App');
  assert.ok(index.includes('alt="JUXILO"'),'JUXILO-Logo auf Roadmap-Startseite');
  assert.ok(index.includes('TENNILO &amp; JUXILO'),'zwei getrennte Marken');
  assert.ok(css.includes('#53006d')&&css.includes('#ffc700'),'JX04-Farben');
  for(const logo of ['juxilo-jx04-logo-white.svg','juxilo-jx04-j-icon.svg']){
    const raw=fs.readFileSync(path.join(root,'roadmap-site',logo),'utf8');
    assert.match(raw,/<svg\b/);
    assert.ok(workflow.includes('assets/'+logo),'Live-Upload mit '+logo);
  }
});

test('ClubDisplay ist eigenständiges Produkt mit vier Bereichen',()=>{ const own=items.filter(x=>ui.productOf(x)==='clubdisplay'); assert.equal(own.length,4); assert.equal(new Set(own.map(x=>ui.productStream(x))).size,4); });

test('ClubDisplay-Original-Logo erscheint in Projektübersicht und Detailansicht und wird ausgeliefert',()=>{ui.setItems(items);ui.setProduct('all');assert.match(ui.overview(),/rm-clubdisplay-project-logo[^>]+clubdisplay\.png/);ui.setProduct('clubdisplay');assert.match(ui.overview(),/rm-clubdisplay-brand[^]*?clubdisplay\.png/);const workflow=fs.readFileSync(path.join(root,'.github/workflows/roadmap-subdomain.yml'),'utf8');assert.ok(workflow.includes('assets/clubdisplay.png'));});
