<?php
declare(strict_types=1);
require_once __DIR__ . '/../roadmap-site/roadmap-lib.php';

function assertRoadmap(bool $ok, string $description): void {
    if (!$ok) throw new RuntimeException($description);
}
function expectRoadmapError(callable $action, string $piece): void {
    try { $action(); } catch (RuntimeException $error) {
        assertRoadmap(str_contains($error->getMessage(), $piece), $error->getMessage());
        return;
    }
    throw new RuntimeException('Fehler erwartet: ' . $piece);
}
$canonical = [
    'id'=>'score-tabletennis','title'=>'Tischtennis','description'=>'Sportart',
    'category'=>'TENNILO Score','status'=>'idea','priority'=>'medium',
    'milestone'=>'Später','nextStep'=>'Regeltests','benefit'=>'Neue Sportart',
    'scope'=>'Eigenständige Regeln','currentState'=>'Vorgemerkt',
    'openPoints'=>'Regeln','doneWhen'=>'Tests','references'=>[],
    'comments'=>[]
];
$duplicate=$canonical;
$duplicate['id']='score-detail-21';
$duplicate['title']='Tischtennis doppelt';
$duplicate['comments']=[
    ['id'=>'c-alt','author'=>'Test','text'=>'Frühere Diskussion','createdAt'=>'2026-11-17']
];
$old=rm_merge([],[$canonical,$duplicate]);
assertRoadmap(count(rm_active_items($old))===2,'Altzustand mit doppelter Sportart');
$merged=rm_merge($old,[$canonical],['score-detail-21']);
assertRoadmap(count(rm_active_items($merged))===1,'Doppeltes Tischtennis nach Seed-Umstellung verborgen');
assertRoadmap(rm_active_items($merged)[0]['id']==='score-tabletennis','Original behalten');
assertRoadmap(!rm_is_active_item($merged,'score-detail-21'),'Stilles Ausblenden auch nach Wiederherstellung');
assertRoadmap(count($merged['items'])===2,'Alte Kommentare bleiben im privaten Zustand erhalten');
assertRoadmap($merged['items'][1]['comments'][0]['id']==='c-alt','Alte Kommentare unverändert');
expectRoadmapError(function () use (&$merged) {rm_restore_item($merged,'score-detail-21');},'zusammengeführt');

$state=rm_merge([],[$canonical]);
$state['items'][0]['comments']=[
    ['id'=>'comment-1','author'=>'Tester','text'=>'Wertvoller Kommentar','createdAt'=>'2026-11-18']
];
assertRoadmap(rm_delete_item($state,'score-tabletennis'),'Löschen erfolgreich');
assertRoadmap(count(rm_active_items($state))===0,'Thema nach Löschen nicht sichtbar');
assertRoadmap(count(rm_trashed_items($state))===1,'Thema im Papierkorb');
expectRoadmapError(function() use (&$state) {rm_delete_item($state,'score-tabletennis');},'bereits gelöscht');
assertRoadmap(!rm_is_active_item($state,'score-tabletennis'),'Versteckte ID lässt keine Änderung zu');

$next=$canonical;$next['title']='Neuer Titel aus GitHub';
$next['status']='planned';
$merged=rm_merge($state,[$next]);
assertRoadmap(count(rm_active_items($merged))===0,'GitHub-Seed lädt gelöschten Eintrag NICHT erneut');
assertRoadmap(count(rm_trashed_items($merged))===1,'Gelöschtes Thema bleibt im Papierkorb');
assertRoadmap($merged['items'][0]['comments'][0]['id']==='comment-1','Kommentare über Seed-Update behalten');

assertRoadmap(rm_restore_item($merged,'score-tabletennis'),'Wiederherstellen erfolgreich');
assertRoadmap(count(rm_active_items($merged))===1,'Eintrag nach Wiederherstellen sichtbar');
assertRoadmap($merged['items'][0]['comments'][0]['id']==='comment-1','Kommentar nach Wiederherstellen vorhanden');
assertRoadmap(count(rm_trashed_items($merged))===0,'Papierkorb nach Wiederherstellen leer');
expectRoadmapError(function() use (&$merged) {rm_restore_item($merged,'score-tabletennis');},'nicht im Papierkorb');

$fresh=rm_merge([],[$canonical],['score-detail-21']);
assertRoadmap(count(rm_active_items($fresh))===1,'Neues Portal ohne zweite Tischtennis-Aufgabe');
assertRoadmap(count(rm_trashed_items($fresh))===0,'Stille Stilllegung nicht als Nutzer-Löschung geführt');


// Die Zuordnung neuer Umpire-/Business-Ideen zu Entwicklungsbereichen ist
// ausschließlich der Projektleitung vorbehalten und serverseitig geprüft.
$streamState=rm_merge([],[$canonical]);
$changed=rm_update_item($streamState,'score-tabletennis',['workstream'=>'sports'],'2026-11-18');
assertRoadmap($changed['workstream']==='sports','Entwicklungsbereich vom Admin bearbeitbar');
expectRoadmapError(function() use (&$streamState) {
    rm_update_item($streamState,'score-tabletennis',['workstream'=>'beliebig'],'2026-11-18');
},'Entwicklungsbereich');
assertRoadmap($streamState['items'][0]['workstream']==='sports','Ungültige Zuordnung überschreibt nicht den Stand');

assertRoadmap(in_array('Weitere Apps',RM_CATEGORIES,true),'Eigenständige Apps als Kategorie');
$miniState=rm_merge([],[$canonical]);
$mini=rm_new_item(['title'=>'Neue kleine App','description'=>'Vorschlag',
    'category'=>'Weitere Apps'],'Tester','2026-11-18');
assertRoadmap($mini['category']==='Weitere Apps','Mini-App-Idee zulässig');
$edited=rm_update_item($miniState,'score-tabletennis',['workstream'=>'wer-muss'],'2026-11-18');
assertRoadmap($edited['workstream']==='wer-muss','Mini-App-Arbeitsbereich zulässig');
echo "Roadmap-Portal: Löschen, Papierkorb, Wiederherstellen und Dubletten-Migration OK.\n";
