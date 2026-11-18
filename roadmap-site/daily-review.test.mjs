import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRoadmap,explicitRefs,isRoadmapOnlyCommit,renderReport} from './daily-review.mjs';

test('Roadmap enthält eindeutige IDs und weitere vier Sportarten',()=>{
  const {all,ids}=parseRoadmap();
  assert.equal(ids.size,all.length);
  for(const id of ['score-padel','score-pickleball','score-beach-tennis','score-tabletennis'])assert.ok(ids.has(id),id);
  assert.ok(all.length>=80);
});
test('Nur explizite, existierende RM-Zuordnungen sind verbindlich',()=>{
  const ids=new Set(['score-detail-01','score-detail-17']);
  assert.deepEqual(explicitRefs('feat: tennis RM(score-detail-01) and RM(score-detail-17)',ids),['score-detail-01','score-detail-17']);
  assert.deepEqual(explicitRefs('update score-detail-01 and release',ids),[]);
  assert.deepEqual(explicitRefs('RM(unbekanntes-ticket)',ids),[]);
});
test('Änderungen an Roadmap zählen nicht als Tournament-App-Fortschritt',()=>{
  assert.equal(isRoadmapOnlyCommit([{filename:'roadmap-site/additions.json'},{filename:'.github/workflows/roadmap-daily-review.yml'}]),true);
  assert.equal(isRoadmapOnlyCommit([{filename:'site/app.js'},{filename:'roadmap-site/additions.json'}]),false);
});
test('Tagesbericht zählt Code-Änderungen, erklärt aber fehlende Freigabe',()=>{
  const body=renderReport([{source:{name:'TENNILO Score'},commits:[{sha:'abcdef12345',title:'feat: change',url:'https://github.com/example/commit/abcdef',when:'2026-11-18T00:00:00Z',taskIds:[]}],truncated:false}],{total:81,score:39},'2026-11-18T08:00:00Z','2026-11-17T00:00:00Z');
  assert.match(body,/81/);
  assert.match(body,/TENNILO Score/);
  assert.match(body,/keine Roadmap-Status/);
  assert.match(body,/manuellen TENNILO-Roadmap-Upload/);
});
