<?php
/**
 * WEIGL SOCIAL – Kontaktformular
 * Nimmt Anfragen aus kontakt.html entgegen und schickt sie per E-Mail weiter.
 * Läuft auf jedem Webspace mit PHP (z. B. Hostinger) ohne weitere Abhängigkeiten.
 */

// ---- Einstellungen ----------------------------------------------------------
const MAIL_TO      = 'weigl.social@gmail.com';        // hier kommen die Anfragen an
const MAIL_FROM    = 'kontakt@weigl-social.de';       // Absender: muss ein Postfach der eigenen Domain sein
const MAIL_SUBJECT = 'Neue Anfrage über weigl-social.de';
const MIN_SECONDS  = 3;                               // schneller ausgefüllt = vermutlich Bot
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
        header('Location: ' . ($ok ? 'danke.html' : 'kontakt.html?fehler=1'), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Bitte nutze das Kontaktformular.', [], 405);
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

$errors = [];
if (mb_strlen($name) < 2)                          $errors['name'] = 'Bitte gib deinen Namen an.';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))    $errors['email'] = 'Bitte gib eine gültige E-Mail-Adresse an.';
if (mb_strlen($nachricht) < 10)                    $errors['nachricht'] = 'Schreib mir bitte ein paar Worte zu deinem Anliegen.';
if (!$dsgvo)                                       $errors['datenschutz'] = 'Bitte bestätige die Datenschutzhinweise.';
if ($errors) {
    respond(false, 'Bitte prüfe die markierten Felder.', $errors, 422);
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
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = @mail(MAIL_TO, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);

if (!$sent) {
    respond(false, 'Die Nachricht konnte gerade nicht gesendet werden. Bitte schreib mir direkt an ' . MAIL_TO . '.', [], 500);
}
respond(true, 'Danke, ' . $name . '! Deine Nachricht ist angekommen. Ich melde mich innerhalb von einem Werktag bei dir.');
