// TENNILO Roadmap: täglicher GitHub-Abgleich, bewusst ohne automatische Status-Freigaben.
// Benötigt GITHUB_TOKEN mit contents:read und issues:write im Roadmap-Repository.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=process.env.GITHUB_REPOSITORY||'tennis-schiri/tennis-schiri-app';
const token=process.env.GITHUB_TOKEN||'';
const issueMarker='<!-- TENNILO_ROADMAP_DAILY_REVIEW_V1 -->';
const api='https://api.github.com';
const sources=[
  {repo:'tennis-schiri/tennis-schiri-app',name:'TENNILO Tournament'},
  {repo:'tennis-schiri/tennilo-score',name:'TENNILO Score'},
  {repo:'tennilo-umpire/umpire-app',name:'TENNILO Umpire'},
  {repo:'tennis-schiri/tennilo-website',name:'TENNILO Website'},
];

export function parseRoadmap(){
  const tournament=JSON.parse(fs.readFileSync(path.join(root,'site/roadmap-seed.json'),'utf8')).items;
  const product=JSON.parse(fs.readFileSync(path.join(root,'roadmap-site/additions.json'),'utf8')).items;
  const all=[...tournament,...product];
  const ids=new Set();
  for(const item of all){
    if(!/^[a-z0-9-]{2,70}$/.test(item.id||'')||ids.has(item.id)) throw new Error('Doppelte/ungültige Roadmap-ID '+item.id);
    ids.add(item.id);
  }
  return {all,ids};
}
export function explicitRefs(message,ids){
  // Nur von Menschen vergebene Aufgabenkennungen werden als sicher zugeordnet behandelt.
  const hits=new Set();
  for(const match of String(message||'').matchAll(/\b(?:RM|ROADMAP)\(([a-z0-9-]{2,70})\)/gi)){
    if(ids.has(match[1].toLowerCase())) hits.add(match[1].toLowerCase());
  }
  return [...hits];
}
export function isRoadmapOnlyCommit(files){
  if(!Array.isArray(files)||!files.length)return false;
  const filtered=files.map(x=>x.filename||'');
  return filtered.every(file=>file.startsWith('roadmap-site/')||
    file.startsWith('.github/workflows/roadmap-')||
    file==='site/roadmap-seed.json'||file==='site/roadmap-lib.php'||
    file==='site/roadmap-api.php'||file==='site/roadmap.html'||
    file==='site/assets/roadmap.js'||file==='site/assets/roadmap.css'||
    file.startsWith('tests/roadmap.'));
}
export function shorten(s,max=120){return String(s||'').replace(/\s+/g,' ').slice(0,max);}
async function request(endpoint,{method='GET',body}={}){
  const r=await fetch(api+endpoint,{method,headers:{
    'Accept':'application/vnd.github+json',
    'User-Agent':'tennilo-roadmap-daily-review',
    'X-GitHub-Api-Version':'2022-11-28',
    ...(token?{'Authorization':'Bearer '+token}:{}),
    ...(body?{'Content-Type':'application/json'}:{})
  },...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(method+' '+endpoint+': '+r.status+' '+shorten(data?.message,190));
  return data;
}
function safeLabel(s){return String(s||'').replace(/[\r\n|]/g,' ').replace(/]/g,'\\]').slice(0,160);}
async function recent(source,since,ids){
  const list=await request('/repos/'+source.repo+'/commits?since='+encodeURIComponent(since)+'&per_page=100');
  const selected=[];
  // Höchstens 35 Detailabrufe je Quelle, um Laufzeit und API-Last zu begrenzen.
  for(const commit of list.slice(0,35)){
    const info=await request('/repos/'+source.repo+'/commits/'+commit.sha);
    if(source.repo==='tennis-schiri/tennis-schiri-app'&&isRoadmapOnlyCommit(info.files))continue;
    const headline=commit.commit.message.split('\n')[0];
    selected.push({
      sha:commit.sha,url:commit.html_url,title:headline,
      when:commit.commit.author?.date||commit.commit.committer?.date||'',
      taskIds:explicitRefs(commit.commit.message,ids)
    });
  }
  return {source,commits:selected,truncated:list.length>=100||list.length>35};
}
function summarizeProduct(snapshot){
  const {source,commits,truncated}=snapshot;
  let s='### '+source.name+' – '+commits.length+' Commit(s)\n';
  if(!commits.length)s+='Keine neuen, für das Produkt relevanten Code-Änderungen gefunden.\n';
  for(const c of commits.slice(0,20)){
    s+='- ['+safeLabel(shorten(c.title,120))+']('+c.url+') ('+c.sha.slice(0,7)+', '+c.when.slice(0,10)+')';
    if(c.taskIds.length)s+=' – Roadmap-ID: '+c.taskIds.map(x=>'\`'+x+'\`').join(', ');
    s+='\n';
  }
  if(commits.length>20||truncated)s+='- **Hinweis:** Aktivität gekürzt; Repository-Commitliste vollständig prüfen.\n';
  return s+'\n';
}
export function renderReport(snapshots,stats,when,since){
  const candidates=snapshots.flatMap(x=>x.commits.filter(c=>c.taskIds.length));
  return [
    issueMarker,
    '# TENNILO Roadmap – Tagesabgleich',
    '',
    '**Geprüft:** '+when+' (UTC) · **Fenster ab:** '+since+' (UTC).',
    '**Roadmap-Themen:** '+stats.total+' · **Score-Themen:** '+stats.score+'.',
    '',
    'Dieser Abgleich liest tägliche GitHub-Codeänderungen. Er verändert **keine Roadmap-Status, Konten, Kommentare oder Web-Dateien**. Ein Commit bedeutet weder „auf der Demo live“ noch „auf iPhone/Watch getestet“. Letzteres wird nur nach bestätigten Gerätetests eingetragen.',
    '',
    ...snapshots.map(summarizeProduct),
    '## Zu prüfen',
    candidates.length?'Commit-Nachrichten mit expliziter \u0060RM(item-id)\u0060-Zuordnung: '+candidates.map(c=>c.taskIds.join(', ')).join(' · '):'Keine expliziten Roadmap-IDs in neuen Commit-Nachrichten. Fachlichen Stand bei relevanten Änderungen manuell gegen die Aufgaben prüfen.',
    '',
    'Auch prüfen: neue Ideen aus Google Drive und Entwicklungschats, reale Geräte-/Beta-Tests und Änderungen, die nicht als GitHub-Commit erfasst werden. Dafür hat dieser Workflow **keinen automatischen Zugriff**.',
    '',
    '**Bearbeitungsregel:** Erst nach Code-/Demo-/Gerätetest die konkrete Aufgabe aktualisieren. Die geschützte Website wird weiterhin über den [manuellen TENNILO-Roadmap-Upload](https://github.com/tennis-schiri/tennis-schiri-app/actions/workflows/roadmap-subdomain.yml) veröffentlicht.',
    ''
  ].join('\n');
}
async function run(){
  if(!token)throw new Error('GITHUB_TOKEN fehlt.');
  const {all,ids}=parseRoadmap();
  const now=new Date();
  // 36 Stunden verhindern, dass bei einer verzögerten geplanten Ausführung Änderungen untergehen.
  const since=new Date(now.getTime()-36*3600*1000).toISOString();
  const snapshots=[];
  for(const source of sources) snapshots.push(await recent(source,since,ids));
  const stats={total:all.length,score:all.filter(x=>x.category==='TENNILO Score').length};
  const body=renderReport(snapshots,stats,now.toISOString(),since);
  const target='/repos/'+repo+'/issues';
  let existing=null;
  for(let page=1;page<=4&&!existing;page++){
    const issues=await request(target+'?state=all&per_page=100&page='+page);
    existing=issues.find(x=>!x.pull_request&&String(x.body||'').includes(issueMarker))||null;
    if(issues.length<100)break;
  }
  let out;
  if(existing){
    out=await request(target+'/'+existing.number,{method:'PATCH',body:{title:'TENNILO Roadmap Tagesabgleich',body,state:'open'}});
  }else{
    out=await request(target,{method:'POST',body:{title:'TENNILO Roadmap Tagesabgleich',body}});
  }
  console.log('Tagesabgleich aktualisiert: '+out.html_url);
  console.log('Quellen: '+snapshots.map(x=>x.source.name+': '+x.commits.length).join(', '));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  run().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
}
