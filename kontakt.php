<?php
/**
 * WEIGL SOCIAL – Kontaktformular
 * Nimmt Anfragen von der Kontaktseite (/kontakt) entgegen und schickt sie per E-Mail weiter.
 * Läuft auf jedem Webspace mit PHP (z. B. Hostinger) ohne weitere Abhängigkeiten.
 */

// ---- Einstellungen ----------------------------------------------------------
const MAIL_TO      = 'info@weigl-social.de';          // hier kommen die Anfragen an
const MAIL_FROM    = 'info@weigl-social.de';          // Absender: muss ein Postfach der eigenen Domain sein
const MAIL_SUBJECT = 'Neue Anfrage über weigl-social.de';
const MIN_SECONDS  = 3;                               // schneller ausgefüllt = vermutlich Bot
const MAX_PER_HOUR = 5;                               // Anfragen pro Besucher (IP) und Stunde
const ALLOWED_HOSTS = ['www.weigl-social.de', 'weigl-social.de']; // nur Anfragen von der eigenen Seite
// -----------------------------------------------------------------------------

date_default_timezone_set('Europe/Berlin');
header('X-Content-Type-Options: nosniff');

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $message, array $errors = [], int $status = 200): void {
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message, 'errors' => (object) $errors], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . ($ok ? 'danke' : 'kontakt?fehler=1'), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Bitte nutze das Kontaktformular.', [], 405);
}

// Nur Anfragen von der eigenen Seite annehmen (Origin, sonst Referer; fehlt beides, ablehnen).
$source = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$sourceHost = strtolower((string) parse_url($source, PHP_URL_HOST));
if (!in_array($sourceHost, ALLOWED_HOSTS, true)) {
    respond(false, 'Bitte nutze das Kontaktformular auf weigl-social.de.', [], 403);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) {
    respond(false, 'Die Nachricht ist zu lang.', [], 413);
}

function field(string $key, int $max): string {
    $v = isset($_POST[$key]) && is_string($_POST[$key]) ? trim($_POST[$key]) : '';
    $v = str_replace("\0", '', $v);
    return mb_substr($v, 0, $max);
}
function oneLine(string $v): string {
    return trim(preg_replace('/[\r\n\t]+/', ' ', $v));
}

// Spam-Schutz: Honeypot-Feld und Mindest-Ausfülldauer
if (field('website', 200) !== '') {
    respond(true, 'Danke! Deine Nachricht ist angekommen.');
}
$ts = (int) field('ts', 20);
if ($ts > 0 && (time() - $ts) < MIN_SECONDS) {
    respond(false, 'Das ging etwas zu schnell. Bitte sende das Formular noch einmal.', [], 429);
}

$name      = oneLine(field('name', 120));
$firma     = oneLine(field('firma', 160));
$email     = oneLine(field('email', 200));
$telefon   = oneLine(field('telefon', 60));
$nachricht = field('nachricht', 5000);
$dsgvo     = field('datenschutz', 10) === 'ja';

$allowed = [
    'basic' => 'Basic', 'standard' => 'Standard', 'premium' => 'Premium', 'content-day' => 'Content Day',
    'strategie' => 'Social Brand Book', 'kennzahlen' => 'Kennzahlenberatung', 'unsicher' => 'Weiß ich noch nicht',
];
$interessen = [];
if (isset($_POST['interesse']) && is_array($_POST['interesse'])) {
    foreach ($_POST['interesse'] as $i) {
        if (is_string($i) && isset($allowed[$i])) $interessen[] = $allowed[$i];
    }
}

// Begrenzung pro Besucher: gehashte IP und Zeitstempel im temporären Verzeichnis, keine Klartext-IP.
function allowRequest(): bool {
    $file = sys_get_temp_dir() . '/weigl-kontakt-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . __FILE__);
    $fh = @fopen($file, 'c+');
    if ($fh === false) return true;
    flock($fh, LOCK_EX);
    $since = time() - 3600;
    $hits = array_filter(array_map('intval', explode("\n", stream_get_contents($fh) ?: '')), fn (int $t): bool => $t > $since);
    $ok = count($hits) < MAX_PER_HOUR;
    if ($ok) {
        $hits[] = time();
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, implode("\n", $hits));
    }
    flock($fh, LOCK_UN);
    fclose($fh);
    return $ok;
}

$errors = [];
if (mb_strlen($name) < 2)                          $errors['name'] = 'Bitte gib deinen Namen an.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))    $errors['email'] = 'Bitte gib eine gültige E-Mail-Adresse an.';
if (mb_strlen($nachricht) < 10)                    $errors['nachricht'] = 'Schreib mir bitte ein paar Worte zu deinem Anliegen.';
if (!$dsgvo)                                       $errors['datenschutz'] = 'Bitte bestätige die Datenschutzhinweise.';
if ($errors) {
    respond(false, 'Bitte prüfe die markierten Felder.', $errors, 422);
}
if (!allowRequest()) {
    respond(false, 'Du hast schon mehrere Nachrichten geschickt. Bitte versuch es in einer Stunde noch einmal oder schreib mir direkt an ' . MAIL_TO . '.', [], 429);
}

$body  = "Neue Anfrage über das Kontaktformular auf weigl-social.de\n";
$body .= str_repeat('-', 56) . "\n\n";
$body .= "Name:       {$name}\n";
$body .= "Betrieb:    " . ($firma !== '' ? $firma : '–') . "\n";
$body .= "E-Mail:     {$email}\n";
$body .= "Telefon:    " . ($telefon !== '' ? $telefon : '–') . "\n";
$body .= "Interesse:  " . ($interessen ? implode(', ', $interessen) : '–') . "\n\n";
$body .= "Nachricht:\n{$nachricht}\n\n";
$body .= str_repeat('-', 56) . "\n";
$body .= 'Gesendet am ' . date('d.m.Y \u\m H:i') . " Uhr\n";

$subject = '=?UTF-8?B?' . base64_encode(MAIL_SUBJECT . ($firma !== '' ? " – {$firma}" : " – {$name}")) . '?=';
$fromName = '=?UTF-8?B?' . base64_encode('WEIGL SOCIAL Website') . '?=';
$replyName = '=?UTF-8?B?' . base64_encode($name) . '?=';

$headers = [
    'From: ' . $fromName . ' <' . MAIL_FROM . '>',
    'Reply-To: ' . $replyName . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$sent = @mail(MAIL_TO, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if (!$sent) {
    respond(false, 'Die Nachricht konnte gerade nicht gesendet werden. Bitte schreib mir direkt an ' . MAIL_TO . '.', [], 500);
}
respond(true, 'Danke, ' . $name . '! Deine Nachricht ist angekommen. Ich melde mich innerhalb von einem Werktag bei dir.');
