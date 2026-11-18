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

test('Alle fünf Produkte haben eigene Entwicklungsbereiche',()=>{
  assert.deepEqual(Array.from(ui.PRODUCTS.map(x=>x[0])),['all','tournament','score','umpire','business','platform']);
  for(const key of ['tournament','score','umpire','business','platform']){
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
  assert.equal(ids.size,80);
});

test('Die Gesamtübersicht zeigt alle Projekte mit den echten Themenzahlen',()=>{
  ui.setItems(items);
  ui.setProduct('all');
  const html=ui.overview();
  for(const [product,label] of ui.PRODUCTS.slice(1)){
    assert.match(html,new RegExp('data-product="'+product+'"'));
    assert.ok(html.includes(label),label);
  }
});

test('Für jedes Projekt sind Bereichsschaltflächen und Statusfilter verfügbar',()=>{
  ui.setItems(items);
  for(const [product,label] of ui.PRODUCTS.slice(1)){
    ui.setProduct(product);
    const ownItems=items.filter(x=>ui.productOf(x)===product);
    const html=ui.overview();
    assert.ok(html.includes(label+': Entwicklung nach Bereichen'),label);
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
