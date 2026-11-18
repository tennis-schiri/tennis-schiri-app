<?php
declare(strict_types=1);
require_once __DIR__ . '/roadmap-lib.php';

$base = [
    'id'=>'existing-topic', 'title'=>'Vorhandenes Thema', 'description'=>'Beschreibung',
    'category'=>'Turnierbetrieb', 'status'=>'planned', 'priority'=>'medium',
    'milestone'=>'Test', 'nextStep'=>'Noch offen',
    'comments'=>[['id'=>'c1','author'=>'Testperson','text'=>'Kommentar erhalten','createdAt'=>'2026-11-18T08:00:00Z']],
    'origin'=>'official', 'references'=>[]
];
$owner=['username'=>'test.owner','passwordHash'=>'$2y$10$'.str_repeat('a',53)];
$saved=[
    'schemaVersion'=>1, 'adminHash'=>null,'ownerAccount'=>$owner,
    'ownerResetVersion'=>'123456789','invites'=>[
       ['id'=>'u-1','username'=>'test.invited','passwordHash'=>'$2y$10$'.str_repeat('b',53),'role'=>'commenter','label'=>'Test']
    ],
    'items'=>[$base]
];
$merged=rm_merge($saved,[$base]);
if (($merged['ownerResetVersion']??'')!=='123456789') throw new RuntimeException('Owner reset marker lost.');
if (($merged['ownerAccount']['username']??'')!=='test.owner') throw new RuntimeException('Owner account overwritten.');
if (($merged['invites'][0]['username']??'')!=='test.invited') throw new RuntimeException('Invitation lost.');
if (($merged['items'][0]['comments'][0]['text']??'')!=='Kommentar erhalten') throw new RuntimeException('Comment lost.');
echo "Personal roadmap state retains reset marker, owner, invitations and comments.\n";
