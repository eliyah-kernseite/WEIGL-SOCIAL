# WEIGL SOCIAL – Website

Statische Multi-Page-Website für **www.weigl-social.de**: reines HTML, CSS und JavaScript, ohne Build-Schritt, ohne Frameworks. Das Kontaktformular läuft über eine kleine PHP-Datei.

## Seiten

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite mit Reel-Mosaik, Leistungen, Content Day, Paketen, Ablauf, Branchen |
| `leistungen.html` | Social Brand Book, Content Day, Betreuung, Reels, Kennzahlenberatung |
| `preise.html` | Pakete Basic / Standard / Premium, einmalige Bausteine, FAQ |
| `ueber-mich.html` | Emily Weigl, Versprechen, Region |
| `kontakt.html` | Kontaktformular, Erreichbarkeit |
| `impressum.html`, `datenschutz.html` | Rechtliches inkl. Bildnachweis |
| `danke.html`, `404.html` | Bestätigungs- und Fehlerseite |
| `kontakt.php` | Versand der Formular-Anfragen per E-Mail |

## Bereitstellen auf Hostinger

1. In hPanel unter **Websites → Verwalten → Git** dieses Repository verbinden, Branch `main`, Installationspfad leer lassen (= `public_html`).
2. Bereitstellen. Alle Dateien liegen im Hauptordner des Repositorys, es gibt nichts zu bauen.
3. In hPanel unter **E-Mails** das Postfach `kontakt@weigl-social.de` anlegen. Es dient als Absender der Formular-Mails (ohne Postfach der eigenen Domain landen Mails oft im Spam).
4. SSL-Zertifikat für die Domain aktivieren. Die `.htaccess` leitet danach automatisch auf `https://www.weigl-social.de` um.
5. Einmal das Formular auf der Live-Seite testen und prüfen, ob die Mail bei `weigl.social@gmail.com` ankommt (auch im Spam-Ordner nachsehen).

Empfänger und Absender stehen oben in `kontakt.php` (`MAIL_TO`, `MAIL_FROM`).

## Nach dem Livegang

- In der Google Search Console die Domain bestätigen und `https://www.weigl-social.de/sitemap.xml` einreichen.
- Google-Unternehmensprofil mit Standort Bernhardswald und Einzugsgebiet Regensburg anlegen.

## Bilder

Alle Fotos stammen von Unsplash (Unsplash-Lizenz, kommerzielle Nutzung erlaubt) und liegen lokal als WebP in `assets/img/`. Die Fotografinnen und Fotografen sind im Impressum unter „Bildnachweis“ genannt. Das Bild auf „Über mich“ ist ein Platzhalter und soll durch ein Porträt von Emily ersetzt werden.

## Schriften

Cormorant und Montserrat (SIL Open Font License) sind lokal in `assets/fonts/` eingebunden, damit keine Daten an Google übertragen werden.

## Barrierefreiheit

- Button „Aa“ unten links: Schriftgröße 100–150 %, mehr Kontrast, Bewegung reduzieren. Die Auswahl wird im Browser gespeichert.
- Systemeinstellung „Bewegung reduzieren“ wird automatisch berücksichtigt.
- Semantisches HTML, Sprunglink zum Inhalt, sichtbarer Tastaturfokus, Alternativtexte, Formular mit Fehlermeldungen pro Feld.
