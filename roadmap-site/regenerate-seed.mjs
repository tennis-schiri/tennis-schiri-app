import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=JSON.parse(fs.readFileSync(path.join(repo,'site/roadmap-seed.json'),'utf8'));
const additions=JSON.parse(fs.readFileSync(path.join(repo,'roadmap-site/additions.json'),'utf8'));
const items=[...source.items,...additions.items];
const ids=new Set();
const valid=new Set(['idea','planned','progress','test','online']);
for(const item of items){
  if(!item || !/^[a-z0-9-]{2,70}$/.test(String(item.id??'')) || ids.has(item.id) || !valid.has(item.status)){
    throw new Error('Ungültiger oder doppelt vorhandener Roadmap-Eintrag: '+String(item?.id));
  }
  ids.add(item.id);
}
if(items.length>100)throw new Error('Maximal 100 Seeds erlaubt');
const retiredIds=additions.retiredIds??[];
if(!Array.isArray(retiredIds)||retiredIds.length>100||
  retiredIds.some(id=>typeof id!=='string'||!/^[a-z0-9-]{2,70}$/.test(id)||ids.has(id))||
  new Set(retiredIds).size!==retiredIds.length){
  throw new Error('Ungültige oder weiterhin aktive stillgelegte Roadmap-ID');
}
const combined={schemaVersion:1,updated:additions.updated,source:'Tournament-GitHub und gemeinsame TENNILO-Roadmap',items,retiredIds};
const json=JSON.stringify(combined,null,2);
if(json.includes('ROADMAP_SOURCE_DATA'))throw new Error('PHP Nowdoc delimiter collides with data');
const php=[
  '<?php',
  'declare(strict_types=1);',
  "if (!defined('TENNILO_ROADMAP_INTERNAL_SEED')) { http_response_code(404); exit; }",
  "$json = <<<'ROADMAP_SOURCE_DATA'",
  json,
  'ROADMAP_SOURCE_DATA;',
  'return json_decode($json, true, 512, JSON_THROW_ON_ERROR);',
  ''
].join('\n');
const dest=path.join(repo,'roadmap-site/dist/roadmap-seed.php');
fs.mkdirSync(path.dirname(dest),{recursive:true});
fs.writeFileSync(dest,php,'utf8');
console.log('TENNILO Roadmap: '+items.length+' Themen und '+additions.items.length+' Zusatzthemen, sichere PHP-Seeddatei.');
