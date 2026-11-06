<?php
declare(strict_types=1);

/**
 * TENNILO – private roadmap storage and validation.
 * Used by roadmap-api.php and by isolated PHP unit tests. No credentials in Git.
 */
const RM_STATUSES = ['idea', 'planned', 'progress', 'test', 'online'];
const RM_PRIORITIES = ['low', 'medium', 'high'];
// Ausschließlich Detailansicht, niemals Bestandteil der kompakten Karten.
const RM_DETAIL_FIELDS = ['benefit'=>900, 'scope'=>1400, 'currentState'=>1400,
    'openPoints'=>1400, 'doneWhen'=>1000];
const RM_OFFICIAL_FIELDS = ['title','description','category','status','priority','milestone',
    'nextStep','benefit','scope','currentState','openPoints','doneWhen','references'];

function rm_references(mixed $raw): array {
    if (!is_array($raw)) return [];
    $result = [];
    foreach (array_slice($raw, 0, 5) as $source) {
        if (!is_array($source)) continue;
        $title = trim((string) ($source['title'] ?? ''));
        $url = trim((string) ($source['url'] ?? ''));
        if ($title === '' || strlen($title) > 140) continue;
        if (!preg_match('~^https://(?:drive\.google\.com|docs\.google\.com)/[a-zA-Z0-9/_?=.&%-]+$~D', $url)) continue;
        $result[] = ['title'=>$title,'url'=>$url];
    }
    return $result;
}
const RM_CATEGORIES = [
    'Turnierformate', 'Turnierbetrieb', 'Live & Anzeige',
    'Plattform & Zugang', 'Produkt & Bedienung'
];

function rm_error(int $code, string $message): never {
    throw new RuntimeException($message, $code);
}

function rm_text(mixed $value, int $maxBytes, string $name): string {
    if (!is_string($value)) rm_error(422, $name . ': Text erwartet.');
    $text = trim($value);
    if ($text === '' || strlen($text) > $maxBytes ||
        preg_match('//u', $text) !== 1 ||
        preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', $text) === 1) {
        rm_error(422, $name . ': Bitte einen gültigen Text mit maximal ' . $maxBytes . ' Bytes angeben.');
    }
    return $text;
}

function rm_optional_text(mixed $value, int $maxBytes, string $name): string {
    if ($value === null || $value === '') return '';
    return rm_text($value, $maxBytes, $name);
}

function rm_enum(mixed $value, array $allowed, string $name): string {
    if (!is_string($value) || !in_array($value, $allowed, true)) {
        rm_error(422, $name . ': Ungültige Auswahl.');
    }
    return $value;
}

function rm_seed(string $file): array {
    if (!is_file($file)) rm_error(503, 'Roadmap-Daten sind nicht verfügbar.');
    $raw = file_get_contents($file);
    $data = $raw === false ? null : json_decode($raw, true);
    if (!is_array($data) || ($data['schemaVersion'] ?? null) !== 1 ||
        !is_array($data['items'] ?? null) || count($data['items']) > 100) {
        rm_error(503, 'Roadmap-Daten sind ungültig.');
    }
    $seen = [];
    foreach ($data['items'] as $item) {
        if (!is_array($item) || !preg_match('/^[a-z0-9-]{2,70}$/', (string) ($item['id'] ?? '')) ||
            isset($seen[$item['id']]) ||
            !in_array($item['status'] ?? '', RM_STATUSES, true)) {
            rm_error(503, 'Roadmap-Daten enthalten einen ungültigen Eintrag.');
        }
        $seen[$item['id']] = true;
    }
    return $data['items'];
}

function rm_merge(array $saved, array $seed): array {
    $items = is_array($saved['items'] ?? null) ? $saved['items'] : [];
    $ids = [];
    $prior = is_array($saved['officialBaseline'] ?? null) ? $saved['officialBaseline'] : [];
    $seedById = [];
    $currentBaseline = [];
    foreach ($seed as $base) {
        $seedById[$base['id']] = $base;
        $currentBaseline[$base['id']] = [];
        foreach (RM_OFFICIAL_FIELDS as $field) {
            $currentBaseline[$base['id']][$field] = $base[$field] ??
                ($field === 'references' ? [] : '');
        }
    }
    foreach ($items as &$item) {
        if (!is_array($item) || !is_string($item['id'] ?? null)) continue;
        $id = $item['id'];
        if (isset($seedById[$id])) {
            // Nur unveränderte Offizialfelder werden von GitHub aktualisiert.
            // Beiträge und manuelle Bearbeitungen behalten Vorrang.
            foreach (RM_OFFICIAL_FIELDS as $field) {
                $next = $currentBaseline[$id][$field];
                if (!array_key_exists($field, $item) ||
                    (is_array($prior[$id] ?? null) &&
                     array_key_exists($field, $prior[$id]) &&
                     $item[$field] === $prior[$id][$field]))
                    $item[$field] = $next;
            }
        }
        // Alte Seed-Prioritäten ohne Umbenennung der redaktionellen Priorität.
        $oldPriorities = ['hoch'=>'high','mittel'=>'medium','niedrig'=>'low'];
        if (is_string($item['priority'] ?? null) &&
            isset($oldPriorities[$item['priority']]))
            $item['priority'] = $oldPriorities[$item['priority']];
        $ids[$id] = true;
    }
    unset($item);
    foreach ($seed as $base) {
        if (!isset($ids[$base['id']])) {
            $items[] = $base;
            $ids[$base['id']] = true;
        }
    }
    return [
        'schemaVersion' => 1,
        'adminHash' => is_string($saved['adminHash'] ?? null) ? $saved['adminHash'] : null,
        'invites' => is_array($saved['invites'] ?? null) ? $saved['invites'] : [],
        'officialBaseline' => $currentBaseline,
        'items' => array_values($items)
    ];
}

function rm_public_item(array $item): array {
    $allowed = ['id','title','description','category','status','priority',
        'milestone','nextStep','updatedAt','origin',...array_keys(RM_DETAIL_FIELDS)];
    $out = [];
    foreach ($allowed as $key) $out[$key] = $item[$key] ?? '';
    $out['references'] = rm_references($item['references'] ?? []);
    $out['comments'] = [];
    foreach (is_array($item['comments'] ?? null) ? $item['comments'] : [] as $comment) {
        if (!is_array($comment)) continue;
        $out['comments'][] = [
            'id' => $comment['id'] ?? '',
            'author' => $comment['author'] ?? '',
            'text' => $comment['text'] ?? '',
            'createdAt' => $comment['createdAt'] ?? ''
        ];
    }
    return $out;
}

function rm_valid_code(mixed $code): bool {
    return is_string($code) && preg_match('/^[a-f0-9]{48}$/D', $code) === 1;
}

function rm_secret(): string {
    return bin2hex(random_bytes(24));
}

function rm_new_item(array $input, string $author, string $now): array {
    $title = rm_text($input['title'] ?? null, 140, 'Titel');
    $description = rm_text($input['description'] ?? null, 2500, 'Beschreibung');
    $category = rm_enum($input['category'] ?? null, RM_CATEGORIES, 'Bereich');
    return [
        'id' => 'idea-' . bin2hex(random_bytes(8)),
        'title' => $title,
        'description' => $description,
        'category' => $category,
        'status' => 'idea',
        'priority' => 'medium',
        'milestone' => 'Neu eingereicht',
        'nextStep' => 'Sichtung durch die Projektleitung',
        'benefit' => '',
        'scope' => '',
        'currentState' => '',
        'openPoints' => '',
        'doneWhen' => '',
        'references' => [],
        'updatedAt' => $now,
        'origin' => $author,
        'comments' => []
    ];
}

function rm_add_comment(array &$state, string $itemId, string $author, mixed $body, string $now): array {
    $text = rm_text($body, 2000, 'Kommentar');
    foreach ($state['items'] as &$item) {
        if (($item['id'] ?? '') !== $itemId) continue;
        if (count($item['comments'] ?? []) >= 100) rm_error(422, 'Maximal 100 Kommentare pro Eintrag.');
        $comment = ['id' => 'c-' . bin2hex(random_bytes(8)),
            'author' => $author, 'text' => $text, 'createdAt' => $now];
        $item['comments'][] = $comment;
        $item['updatedAt'] = $now;
        return $comment;
    }
    unset($item);
    rm_error(404, 'Roadmap-Eintrag nicht gefunden.');
}

function rm_update_item(array &$state, string $id, array $data, string $now): array {
    foreach ($state['items'] as &$item) {
        if (($item['id'] ?? '') !== $id) continue;
        if (isset($data['status'])) $item['status'] = rm_enum($data['status'], RM_STATUSES, 'Status');
        if (isset($data['priority'])) $item['priority'] = rm_enum($data['priority'], RM_PRIORITIES, 'Priorität');
        if (isset($data['category'])) $item['category'] = rm_enum($data['category'], RM_CATEGORIES, 'Bereich');
        foreach (['title'=>140,'description'=>2500,'milestone'=>140,'nextStep'=>500] as $field=>$limit) {
            if (isset($data[$field])) $item[$field] = rm_text($data[$field], $limit, $field);
        }
        foreach (RM_DETAIL_FIELDS as $field=>$limit) {
            if (array_key_exists($field, $data))
                $item[$field] = rm_optional_text($data[$field], $limit, $field);
        }
        $item['updatedAt'] = $now;
        return rm_public_item($item);
    }
    unset($item);
    rm_error(404, 'Roadmap-Eintrag nicht gefunden.');
}

function rm_delete_comment(array &$state, string $itemId, string $commentId, string $now): bool {
    foreach ($state['items'] as &$item) {
        if (($item['id'] ?? '') !== $itemId) continue;
        $comments = $item['comments'] ?? [];
        $filtered = array_values(array_filter($comments, fn($c) => ($c['id'] ?? '') !== $commentId));
        if (count($filtered) === count($comments)) rm_error(404, 'Kommentar nicht gefunden.');
        $item['comments'] = $filtered;
        $item['updatedAt'] = $now;
        return true;
    }
    unset($item);
    rm_error(404, 'Roadmap-Eintrag nicht gefunden.');
}
