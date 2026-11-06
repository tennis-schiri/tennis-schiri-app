<?php
declare(strict_types=1);

/**
 * TENNILO – private roadmap storage and validation.
 * Used by roadmap-api.php and by isolated PHP unit tests. No credentials in Git.
 */
const RM_STATUSES = ['idea', 'planned', 'progress', 'test', 'online'];
const RM_PRIORITIES = ['low', 'medium', 'high'];
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
    foreach ($items as $item) {
        if (is_array($item) && is_string($item['id'] ?? null)) $ids[$item['id']] = true;
    }
    foreach ($seed as $item) {
        if (!isset($ids[$item['id']])) {
            $items[] = $item;
            $ids[$item['id']] = true;
        }
    }
    return [
        'schemaVersion' => 1,
        'adminHash' => is_string($saved['adminHash'] ?? null) ? $saved['adminHash'] : null,
        'invites' => is_array($saved['invites'] ?? null) ? $saved['invites'] : [],
        'items' => array_values($items)
    ];
}

function rm_public_item(array $item): array {
    $allowed = ['id','title','description','category','status','priority',
        'milestone','nextStep','updatedAt','origin'];
    $out = [];
    foreach ($allowed as $key) $out[$key] = $item[$key] ?? '';
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
