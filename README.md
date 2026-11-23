# Therapieplatz

Eine kleine Web-App (PWA) für die Suche nach einem Psychotherapieplatz in Berlin. Sie führt Schritt für Schritt durch den Weg: Sprechstunde, PTV 11, Kassenplatz suchen, probatorische Sitzungen und, wenn nichts klappt, Kostenerstattung über eine Privatpraxis.

Was drin ist:

- **Wegweiser** mit dem aktuellen Schritt und einem Hinweis, was als Nächstes dran ist
- **Liste der Therapeut:innen** mit Status, Filtern und „Aus Text einfügen“ (erkennt Name, Telefon, E-Mail, Adresse, Bezirk und Telefonzeiten aus kopiertem Text)
- **Anrufen**: wer gerade telefonisch erreichbar ist, Tagesplan mit Countdown, Ergebnis nach dem Anruf mit einem Tipp
- **E-Mails**: Vorlagen mit Platzhaltern, Sammelanfrage (eine persönliche Mail nach der anderen), Erinnerung zum Nachfassen nach 7 Tagen
- **Kontaktprotokoll** als Nachweis, druckbar oder als PDF
- **Antrag Kostenerstattung**: Checkliste, vorausgefülltes Antragsschreiben, Fristen, Vorlage für einen Widerspruch

Die Texte sind allgemeine Informationen, keine Rechtsberatung.

## Datenschutz

- Pro Gerät eine Person. Alle Daten liegen nur im Browser auf diesem Gerät (`localStorage`).
- Kein Server, kein Konto, kein Tracking. Die App lädt nichts aus dem Internet nach; die Schriften (Fraunces, Nunito, SIL Open Font License) liegen im Ordner `fonts/`. Eine Content-Security-Policy im `index.html` blockiert Verbindungen zu anderen Servern.
- Unter **Daten & Sicherung** (Zahnrad oben rechts): Sicherung als JSON-Datei exportieren, auf einem anderen Gerät importieren, oder **Alle Daten löschen**.
- Die Sicherungsdatei ist nicht verschlüsselt. Sorgsam aufbewahren.
- Achtung: Wer im Browser die Websitedaten löscht, löscht auch die Einträge.

## Öffnen auf dem PC

Schnell anschauen: `index.html` im Browser öffnen (Doppelklick). Alles funktioniert, nur Installation und Offline-Modus nicht.

Mit Installation und Offline-Modus (braucht einen lokalen Webserver):

```
cd D:\Projekte\therapieplatz
python -m http.server 8080
```

Dann im Browser <http://localhost:8080> öffnen. In Chrome oder Edge erscheint in der Adressleiste ein Symbol zum Installieren.

## Auf dem Handy installieren

Dafür muss die App über HTTPS erreichbar sein (z. B. GitHub Pages). Dann die Seite im Handy-Browser öffnen und „Zum Startbildschirm hinzufügen“ wählen (Android: Chrome-Menü, iPhone: Safari-Teilen-Menü). Die Daten bleiben trotzdem nur auf dem Handy.

## Entwicklung

- Keine Build-Schritte: `index.html` (HTML, CSS, JavaScript in einer Datei), `manifest.webmanifest`, `sw.js` (erst Netz, offline aus dem Cache), `icons/`, `fonts/`.
- Icons neu erzeugen: `node tools/make-icons.mjs`
- Tests (Chrome headless, puppeteer-core aus `D:\Projekte\flurfunk\node_modules`): `node tests/e2e.mjs`. Screenshots und PDFs landen in `tests/screenshots/`.
- Nach Änderungen an Dateien die Versionsnummer `CACHE` in `sw.js` erhöhen, damit installierte Apps das Update laden.
