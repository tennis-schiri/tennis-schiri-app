<?php
declare(strict_types=1);
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
if (!$https) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=UTF-8');
    exit('TENNILO Roadmap erfordert eine sichere HTTPS-Verbindung.');
}
header('Cache-Control: private, no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
?>
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#071625">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>TENNILO · Gemeinsame Roadmap</title>
  <link rel="icon" href="./favicon.ico?v=2" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="./favicon-32.png?v=2">
  <link rel="icon" type="image/png" sizes="192x192" href="./favicon-192.png?v=2">
  <link rel="apple-touch-icon" sizes="180x180" href="./apple-touch-icon.png?v=2">
  <link rel="stylesheet" href="./assets/styles.css?v=1">
  <link rel="stylesheet" href="./assets/roadmap.css?v=1">
  <link rel="stylesheet" href="./assets/extra.css?v=1">
  <script type="module" src="./assets/roadmap.js?v=1"></script>
</head>
<body class="roadmap-body standalone-roadmap">
  <header class="rm-site-header">
    <div class="rm-site-nav">
      <a href="./index.php" class="rm-wordmark" aria-label="TENNILO Roadmap Startseite">
        <img src="./assets/tennilo-logo-dark.png" alt="TENNILO" width="151" height="45">
        <span>ROADMAP</span>
      </a>
      <nav class="rm-topnav" aria-label="Hauptnavigation">
        <a class="current" href="./index.php" aria-current="page">Roadmap-Board</a>
        <a href="./strategie.php">Gesamtplanung</a>
        <a href="https://tennilo.de/" target="_blank" rel="noopener noreferrer">TENNILO</a>
      </nav>
      <span class="rm-private-mark"><span aria-hidden="true">●</span> PRIVATER BEREICH</span>
    </div>
  </header>

  <section class="rm-project-intro" aria-label="TENNILO Projekte und Demos">
    <div class="rm-project-heading">
      <div><span class="rm-kicker">ONE ECOSYSTEM · FOUR PRODUCTS</span>
      <h2>Ein Projekt. Viele Möglichkeiten.</h2></div>
      <p>Alle Entwicklungsrichtungen, Meilensteine und Entscheidungen an einem Ort. Die Demo-Seiten öffnen sich separat und können eigene Zugangsdaten verlangen.</p>
    </div>
    <div class="rm-demo-grid">
      <article class="rm-demo-card demo-tournament">
        <div class="rm-demo-label"><img src="./assets/tennilo-tournament-cutout.png" alt="TENNILO Tournament" loading="lazy"></div>
        <p>Turniere planen, auslosen und live begleiten.</p>
        <a href="https://app.tennis-schiri.de/index.html" target="_blank" rel="noopener noreferrer">Tournament-Demo öffnen <span aria-hidden="true">↗</span></a>
      </article>
      <article class="rm-demo-card demo-score">
        <div class="rm-demo-label"><img src="./assets/tennilo-score-cutout-dark.png" alt="TENNILO Score" loading="lazy"></div>
        <p>Spielstände am Smartphone und an der Watch erfassen.</p>
        <a href="https://score.tennilo.de/" target="_blank" rel="noopener noreferrer">Score-Demo öffnen <span aria-hidden="true">↗</span></a>
      </article>
      <article class="rm-demo-card demo-umpire">
        <div class="rm-demo-label"><img src="./assets/tennilo-umpire-cutout.png" alt="TENNILO Umpire" loading="lazy"></div>
        <p>Das modulare Cockpit für Schiedsrichter und Scoreboards.</p>
        <span class="rm-demo-upcoming">Demo in Vorbereitung</span>
      </article>
      <article class="rm-demo-card demo-business">
        <div class="rm-demo-label rm-demo-word">TENNILO <strong>Business</strong></div>
        <p>Perspektive für Hotels, Resorts und Reiseveranstalter.</p>
        <span class="rm-demo-upcoming">Konzeptphase</span>
      </article>
    </div>
  </section>

  <div id="roadmap-app" class="roadmap-app" aria-live="polite">
    <main class="roadmap-loading">Geschützte Roadmap wird geladen …</main>
  </div>
  <div id="roadmap-modal"></div>
  <div id="roadmap-toast" class="roadmap-toast" role="status" aria-live="polite"></div>
  <footer class="rm-site-footer">
    <p>TENNILO Roadmap · interne Entwicklungs- und Ideensammlung · Stand wird im Board gepflegt</p>
    <p><a href="./strategie.php">Gesamte Planung</a> · <a href="https://tennilo.de/">tennilo.de</a></p>
  </footer>
</body>
</html>
