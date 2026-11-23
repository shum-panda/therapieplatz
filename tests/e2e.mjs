// End-to-End-Test mit Chrome headless (puppeteer-core aus dem Flurfunk-Projekt).
// Aufruf: node tests/e2e.mjs   (Screenshots landen in tests/screenshots/)
import puppeteer from "file:///D:/Projekte/flurfunk/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import http from "node:http";
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "tests", "screenshots");
const dl = path.join(root, "tests", ".downloads");
rmSync(dl, { recursive: true, force: true });
mkdirSync(shots, { recursive: true });
mkdirSync(dl, { recursive: true });

// Kleiner statischer Server (nur localhost), damit Service Worker und Manifest wie im echten Betrieb laufen
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

let pass = 0, fail = 0;
const results = [];
function ok(cond, msg) { (cond ? pass++ : fail++); results.push((cond ? "OK   " : "FAIL ") + msg); console.log((cond ? "  ok   " : "  FAIL ") + msg); }

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--lang=de-DE"] });
const page = await browser.newPage();
await page.emulateTimezone("Europe/Berlin");
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [], external = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("request", (r) => { const u = r.url(); if (!u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
page.on("dialog", (d) => d.accept());
await page.evaluateOnNewDocument(() => {
  window.__printed = 0; window.print = () => { window.__printed++; };
  // tel:/mailto: würden in Chrome headless den Fokus wegnehmen; hier wie die Übergabe an die Telefon-/Mail-App abfangen
  document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest('a[href^="tel:"],a[href^="mailto:"]'); if (a) { window.__ext = a.getAttribute("href"); e.preventDefault(); } });
});
const cdp = await page.target().createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dl }).catch(() => cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name, full = true) => { await sleep(150); await page.screenshot({ path: path.join(shots, name + ".png"), fullPage: full }); };
const printShot = async (name) => {
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.emulateMediaType("print");
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(150);
  await page.screenshot({ path: path.join(shots, name + ".png"), fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
};
const go = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await sleep(120); };
const click = async (sel) => { await page.waitForSelector(sel, { visible: true, timeout: 4000 }); await page.$eval(sel, (el) => el.click()); await sleep(120); };
const text = (sel) => page.$eval(sel, (el) => el.innerText);
const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("tp1.daten")));
const setField = async (form, name, value) => page.$eval(`${form} [name="${name}"]`, (el, v) => { if (el.type === "checkbox") el.checked = !!v; else el.value = v; }, value);

// ---------- 1. Willkommen ----------
console.log("\n1. Erster Start");
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
ok(!!(await page.$('[data-form="welcome"]')), "Willkommensseite erscheint ohne Daten");
await shot("01-willkommen");
await page.type('[data-form="welcome"] input[name=name]', "Lena");
await click('[data-form="welcome"] button[type=submit]');
ok((await text("h1")).includes("Lena"), "Begrüßung mit Namen");
ok((await text(".next")).includes("Sprechstunde"), "Nächster Schritt: Sprechstunde");
ok((await page.$$eval(".step.now .dot", (d) => d.map((x) => x.textContent)))[0] === "1", "Wegweiser markiert Schritt 1");
const fontsOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check("600 20px Fraunces") && document.fonts.check("400 16px Nunito"); });
ok(fontsOk, "Lokale Schriften geladen");
await shot("02-start-leer");

// ---------- 2. Meine Angaben ----------
console.log("\n2. Meine Angaben");
await go("#ich");
const F = '[data-form="ich"]';
await setField(F, "sprechstundeDatum", "2026-10-20");
await setField(F, "sprechstundeBei", "Praxis Sonnenseite");
await setField(F, "ptv11", true);
await setField(F, "zeitnah", true);
await setField(F, "kasse", "AOK Nordost");
await setField(F, "verfuegbarkeit", "flexibel, am liebsten vormittags");
await setField(F, "telefon", "0170 1234567");
await setField(F, "vollname", "Lena Muster");
await setField(F, "adresse", "Beispielstraße 1, 10999 Berlin");
await setField(F, "versNr", "A123456789");
await setField(F, "geburt", "1996-05-04");
await click(`${F} button[type=submit]`);
let S = await store();
ok(S.ich.kasse === "AOK Nordost" && S.ich.ptv11 && S.ich.zeitnah && S.ich.versNr === "A123456789", "Angaben gespeichert");
ok((await page.$$eval(".step.now .dot", (d) => d.map((x) => x.textContent)))[0] === "3", "Wegweiser springt auf Schritt 3 (Kassenplatz suchen)");

// ---------- 3. Praxis von Hand anlegen ----------
console.log("\n3. Praxis anlegen");
await go("#liste");
await click('[data-act="addT"]');
const now = await page.evaluate(() => { const d = new Date(); return { tag: ((d.getDay() + 6) % 7) + 1, min: d.getHours() * 60 + d.getMinutes() }; });
const hm = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const TF = '[data-form="t"]';
await setField(TF, "name", "Dr. Anna Beispiel");
await setField(TF, "anrede", "frau");
await setField(TF, "praxis", "Praxis am Kanal");
await setField(TF, "telefon", "030 1234567");
await setField(TF, "email", "anna@example.org");
await setField(TF, "bezirk", "Friedrichshain-Kreuzberg");
await setField(TF, "typ", "kasse");
await page.$eval(`${TF} input[name=verfahren][value=TP]`, (el) => (el.checked = true));
await click('[data-act="zAdd"]');
await page.$eval(`${TF} select[name=ztag]`, (el, v) => (el.value = v), String(now.tag));
await page.$eval(`${TF} input[name=zvon]`, (el, v) => (el.value = v), hm(Math.max(0, now.min - 30)));
await page.$eval(`${TF} input[name=zbis]`, (el, v) => (el.value = v), hm(Math.min(1439, now.min + 45)));
await shot("03-formular", false);
await click(`${TF} button[type=submit]`);
S = await store();
ok(S.therapists.length === 1 && S.therapists[0].zeiten.length === 1, "Praxis mit Telefonzeit gespeichert");
ok((await page.evaluate(() => location.hash)).startsWith("#t/"), "Detailansicht öffnet sich");
await shot("04-detail");

// ---------- 4. Aus Text einfügen ----------
console.log("\n4. Aus Text einfügen");
await go("#liste");
await click('[data-act="paste"]');
const sample = `Dipl.-Psych. Maria Schmidt
Psychologische Psychotherapeutin
Praxis für Psychotherapie
Oranienstraße 25
10999 Berlin-Kreuzberg
Tel.: 030 / 61 23 45 67
Fax: 030 / 61 23 45 68
E-Mail: praxis.schmidt@example.de
www.praxis-schmidt.example
Verfahren: Tiefenpsychologisch fundierte Psychotherapie, Analytische Psychotherapie
Abrechnung: Alle Kassen
Telefonische Erreichbarkeit:
Mo, Mi 8:30 - 9:30 Uhr
Donnerstag 12.00–13.00 Uhr`;
await page.$eval("#pasteText", (el, v) => (el.value = v), sample);
await click('[data-act="parse"]');
const parsed = await page.$eval(TF, (f) => { const fd = new FormData(f); return { name: fd.get("name"), anrede: fd.get("anrede"), adresse: fd.get("adresse"), bezirk: fd.get("bezirk"), telefon: fd.get("telefon"), email: fd.get("email"), website: fd.get("website"), typ: fd.get("typ"), verfahren: fd.getAll("verfahren"), tage: fd.getAll("ztag"), von: fd.getAll("zvon"), bis: fd.getAll("zbis") }; });
console.log("   erkannt:", JSON.stringify(parsed));
ok(parsed.name === "Maria Schmidt", "Name erkannt (ohne Titelzusatz)");
ok(parsed.anrede === "frau", "Anrede erkannt");
ok(parsed.telefon.replace(/\D/g, "") === "03061234567", "Telefon erkannt (nicht Fax)");
ok(parsed.email === "praxis.schmidt@example.de", "E-Mail erkannt");
ok(parsed.adresse.includes("Oranienstraße 25") && parsed.adresse.includes("10999 Berlin"), "Adresse erkannt");
ok(parsed.bezirk === "Friedrichshain-Kreuzberg", "Bezirk über Ortsteil erkannt");
ok(parsed.typ === "kasse", "Kassensitz erkannt");
ok(parsed.verfahren.includes("TP") && parsed.verfahren.includes("AP"), "Verfahren erkannt");
ok(parsed.tage.join(",") === "1,3,4" && parsed.von.join(",") === "08:30,08:30,12:00" && parsed.bis[2] === "13:00", "Telefonzeiten erkannt (Mo, Mi, Do)");
ok(parsed.website.includes("praxis-schmidt"), "Website erkannt");
await shot("05-erkannt", false);
await click(`${TF} button[type=submit]`);

// Zwei weitere Praxen mit E-Mail, eine davon mit XSS-Versuch im Namen
await page.evaluate(() => {
  const D = JSON.parse(localStorage.getItem("tp1.daten"));
  const mk = (id, name, email, extra = {}) => Object.assign({ id, name, anrede: "", praxis: "", adresse: "", bezirk: "Neukölln", verfahren: ["VT"], typ: "kasse", telefon: "030 999", zeiten: [], email, website: "javascript:alert(1)", notizen: "<b>fett</b>", status: "neu", warteWochen: "", created: new Date().toISOString() }, extra);
  D.therapists.push(mk("x1", '<img src=x onerror="window.__xss=1">Herr Böse', "boese@example.org", { anrede: "herr" }));
  D.therapists.push(mk("x2", "Jonas Weber", "weber@example.org", { anrede: "herr", verfahren: ["TP", "VT"] }));
  D.therapists.push(mk("p1", "Dr. Petra Privat", "", { typ: "privat", anrede: "frau", adresse: "Kantstraße 5, 10623 Berlin", bezirk: "Charlottenburg-Wilmersdorf", verfahren: ["TP"] }));
  localStorage.setItem("tp1.daten", JSON.stringify(D));
});
await page.reload({ waitUntil: "networkidle0" });
await go("#liste");
await sleep(200);
ok((await page.evaluate(() => window.__xss)) === undefined, "Kein XSS über Namen");
ok((await text(".tlist")).includes('<img src=x onerror="window.__xss=1">Herr Böse'), "Name wird als Text angezeigt");
await shot("06-liste");
await page.select('[data-change="fBezirk"]', "Neukölln");
await sleep(150);
ok((await page.$$(".tcard")).length === 2, "Filter Bezirk funktioniert");
await page.select('[data-change="fBezirk"]', "");
await page.select('[data-change="fTyp"]', "privat");
await sleep(150);
ok((await page.$$(".tcard")).length === 1, "Filter Kasse/privat funktioniert");
await page.select('[data-change="fTyp"]', "");
await page.select('[data-change="fVerfahren"]', "TP");
await sleep(150);
ok((await page.$$(".tcard")).length === 4, "Filter Verfahren funktioniert");
await page.select('[data-change="fVerfahren"]', "");
await sleep(100);
await go("#t/x1");
ok(!(await page.$('a[href^="javascript:"]')), "javascript:-Website wird nicht verlinkt");

// ---------- 5. Anrufen ----------
console.log("\n5. Anrufen und Ergebnis");
await go("#anrufen");
const jetzt = await text("main");
ok(jetzt.includes("Dr. Anna Beispiel") && /noch \d/.test(jetzt), "Jetzt erreichbar mit Countdown");
await shot("07-anrufen");
const telHref = await page.$eval('.callrow a[data-act="call"]', (a) => a.getAttribute("href"));
ok(telHref === "tel:0301234567", "tel:-Link korrekt");
await page.$eval('.callrow a[data-act="call"]', (a) => a.click());
await page.waitForSelector("[data-callsheet]", { timeout: 3000 });
ok(true, "Ergebnis-Blatt erscheint nach dem Anruf");
await click('[data-out="warteliste"]');
await page.focus("#wochen"); await page.keyboard.type("20");
await shot("08-ergebnis", false);
await click("#callSave");
S = await store();
const anna = S.therapists.find((t) => t.name === "Dr. Anna Beispiel");

ok(anna.status === "warteliste" && anna.warteWochen === "20", "Status auf Warteliste (20 Wochen) gesetzt");
ok(S.log.some((l) => l.tid === anna.id && l.ergebnis === "warteliste" && l.kanal === "telefon" && l.wochen === "20"), "Anruf im Protokoll mit Zeitstempel");
ok(!(await page.evaluate(() => localStorage.getItem("tp1.pending"))), "Offener Anruf danach entfernt");
// Zweiter Anruf: Absage für Weber
await go("#t/x2");
await page.$eval('a[data-act="call"]', (a) => a.click());
await page.waitForSelector("[data-callsheet]");
await click('[data-out="absage"]');
await click("#callSave");
S = await store();
ok(S.therapists.find((t) => t.id === "x2").status === "absage", "Absage setzt Status");
// Nicht erreicht hebt nur 'neu' auf 'angefragt'
await go("#t/x1");
await page.$eval('a[data-act="call"]', (a) => a.click());
await page.waitForSelector("[data-callsheet]");
await click('[data-out="nicht_erreicht"]');
await click("#callSave");
S = await store();
ok(S.therapists.find((t) => t.id === "x1").status === "angefragt", "Nicht erreicht: Status neu -> angefragt");
// Wiederaufnahme nach Rückkehr aus Telefon-App
await page.evaluate(() => localStorage.setItem("tp1.pending", JSON.stringify({ tid: "x1", at: Date.now() })));
await page.reload({ waitUntil: "networkidle0" });
ok(!!(await page.$("[data-callsheet]")), "Ergebnis-Blatt erscheint nach Neuladen wieder");
await click('[data-act="close"]');
await page.evaluate(() => localStorage.removeItem("tp1.pending"));

// ---------- 6. Sammelanfrage ----------
console.log("\n6. Sammelanfrage");
await page.evaluate(() => { const D = JSON.parse(localStorage.getItem("tp1.daten")); D.therapists.find((t) => t.name === "Maria Schmidt").status = "neu"; localStorage.setItem("tp1.daten", JSON.stringify(D)); });
await page.reload({ waitUntil: "networkidle0" });
await go("#mails");
await click('[data-act="pickAll"]');
const nPick = await page.$$eval('[data-change="pick"]:checked', (x) => x.length);
ok(nPick === 3, "Alle aktiven Praxen mit E-Mail auswählbar (3)");
await shot("09-sammel");
await click('[data-act="queueStart"]');
const mails = [];
for (let n = 0; n < 5; n++) {
  const a = await page.$('[data-act="queueSend"]');
  if (!a) break;
  const href = await page.$eval('[data-act="queueSend"]', (x) => x.getAttribute("href"));
  mails.push(decodeURIComponent(href));
  if (n === 0) await shot("10-queue");
  await page.$eval('[data-act="queueSend"]', (x) => x.addEventListener("click", (e) => e.preventDefault(), { once: true }));
  await page.$eval('[data-act="queueSend"]', (x) => x.click());
  await sleep(550);
}
ok(mails.length === 3, "Drei E-Mails nacheinander geöffnet");
ok(mails.some((m) => m.startsWith("mailto:anna@example.org") && m.includes("Sehr geehrte Frau Dr. Beispiel")), "Persönliche Anrede mit Titel");
ok(mails.some((m) => m.includes("Sehr geehrte Frau Schmidt")), "Anrede für geparste Praxis");
ok(mails.every((m) => m.includes("AOK Nordost") && m.includes("PTV 11") && m.includes("zeitnah erforderlich")), "Platzhalter Kasse/PTV11 ersetzt");
ok(mails.every((m) => !m.includes("{")), "Keine offenen Platzhalter");
ok((await text("main")).includes("Fertig"), "Abschluss der Sammelanfrage");
S = await store();
ok(S.log.filter((l) => l.ergebnis === "gesendet").length === 3, "3 E-Mails als gesendet protokolliert");

// ---------- 7. Nachfassen und Antwort ----------
console.log("\n7. Nachfassen und Antworten");
await page.evaluate(() => { const D = JSON.parse(localStorage.getItem("tp1.daten")); const old = new Date(Date.now() - 8 * 86400000).toISOString(); D.log.filter((l) => l.ergebnis === "gesendet").forEach((l) => (l.ts = old)); localStorage.setItem("tp1.daten", JSON.stringify(D)); });
await page.reload({ waitUntil: "networkidle0" });
await go("#start");
ok((await text(".next")).includes("Woche auf Antwort") || (await text(".next")).includes("seit über einer Woche"), "Startseite erinnert ans Nachfassen");
ok(!!(await page.$('.tabs a[data-nav="mails"] .badge')), "Badge an E-Mails");
await go("#mails");
await click('[data-act="mailTab"][data-tab="nach"]');
const fuCount = await page.$$eval('[data-act="followDone"]', (x) => x.length);
ok(fuCount >= 1, "Nachfassen-Liste zeigt fällige Anfragen (" + fuCount + ")");
await shot("11-nachfassen");
// Antwort eintragen für Schmidt
const schmidtId = (await store()).therapists.find((t) => t.name === "Maria Schmidt").id;
await go("#t/" + schmidtId);
await click('[data-act="logReply"]');
await page.select('[data-form="log"] select[name=ergebnis]', "absage");
await page.$eval('[data-form="log"] textarea[name=text]', (el) => (el.value = "Liebe Frau Muster,\nleider habe ich derzeit keine Kapazitäten. <script>x</script>"));
await click('[data-form="log"] button[type=submit]');
S = await store();
ok(S.therapists.find((t) => t.id === schmidtId).status === "absage", "Antwort (Absage) setzt Status");
ok((await text(".timeline")).includes("keine Kapazitäten"), "Antwort in der Zeitleiste der Praxis");
await shot("12-zeitleiste");

// ---------- 8. Protokoll und Druck ----------
console.log("\n8. Protokoll");
await go("#protokoll");
const rows = await page.$$eval(".ptable tbody tr", (r) => r.length);
ok(rows >= 7, "Protokoll zeigt alle Versuche (" + rows + ")");
await shot("13-protokoll");
await click('[data-act="printLog"]');
await sleep(150);
ok((await page.evaluate(() => window.__printed)) === 1, "window.print aufgerufen");
const printRows = await page.$$eval("#print tbody tr", (r) => r.length);
ok(printRows === rows, "Druckansicht enthält alle Zeilen");
ok((await page.$eval("#print", (e) => e.innerText)).includes("A123456789"), "Druckansicht mit Versichertennummer");
await page.emulateMediaType("print");
await printShot("14-protokoll-druck");
await page.pdf({ path: path.join(shots, "protokoll.pdf"), format: "A4" });
await page.emulateMediaType("screen");

// ---------- 9. Antrag ----------
console.log("\n9. Antrag");
await go("#antrag");
await page.select('[data-change="privatTid"]', "p1");
await sleep(150);
const brief = await page.$eval('textarea[data-input="brief"]', (t) => t.value);
ok(brief.includes("A123456789") && brief.includes("AOK Nordost"), "Antrag mit Versichertennummer und Kasse");
ok(/2 Absagen/.test(brief) && /20 Wochen/.test(brief), "Antrag nennt Absagen und Wartezeit");
ok(brief.includes("Frau Dr. Petra Privat"), "Antrag nennt Privatpraxis");
ok(brief.includes("zeitnah erforderlich") && brief.includes("20.10.2026"), "Antrag nennt Sprechstunde und Dringlichkeit");
await page.$eval('textarea[data-input="brief"]', (t) => { t.value += "\nPS: eigene Ergänzung"; t.dispatchEvent(new Event("input", { bubbles: true })); });
S = await store();
ok(S.antrag.brief.includes("eigene Ergänzung"), "Änderungen am Brief werden gespeichert");
await page.$eval('[data-change="antragF"][data-k="gestelltAm"]', (el) => { el.value = "2026-11-10"; el.dispatchEvent(new Event("change", { bubbles: true })); });
await sleep(150);
ok((await page.$eval('[data-k="frist"]', (e) => e.value)) === "2026-12-01", "Frist wird vorgeschlagen (3 Wochen)");
await page.select('[data-change="antragF"][data-k="antwort"]', "abgelehnt");
await page.$eval('[data-change="antragF"][data-k="antwortAm"]', (el) => { el.value = "2026-11-20"; el.dispatchEvent(new Event("change", { bubbles: true })); });
await sleep(150);
const wider = await page.$eval('textarea[data-input="widerspruch"]', (t) => t.value);
ok(wider.includes("Widerspruch gegen Ihren Bescheid vom 20.11.2026") && wider.includes("10.11.2026"), "Widerspruch-Vorlage mit Daten");
ok((await text("main")).includes("innerhalb eines Monats"), "Hinweis auf Widerspruchsfrist");
await shot("15-antrag");
await click('[data-act="printLetter"][data-which="brief"]');
await sleep(100);
ok((await page.$eval("#print", (e) => e.innerText)).includes("eigene Ergänzung"), "Brief-Druck nutzt bearbeiteten Text");
await page.emulateMediaType("print");
await printShot("15b-antrag-druck");
await page.pdf({ path: path.join(shots, "antrag.pdf"), format: "A4" });
await page.emulateMediaType("screen");

// ---------- 10. Start mit Daten ----------
await go("#start");
await shot("16-start-voll");
const statsTxt = await text(".stats");
ok(/2\s*Absagen/.test(statsTxt.replace(/\n/g, " ")), "Zähler Absagen auf Start");

// ---------- 11. Export / Löschen / Import ----------
console.log("\n11. Export, Löschen, Import");
await go("#daten");
ok(!(await text("main")).includes("Profil"), "Keine Profilverwaltung mehr");
await shot("17-daten");
await click('[data-act="exportOne"]');
let file = null;
for (let n = 0; n < 30 && !file; n++) { await sleep(200); file = readdirSync(dl).find((f) => f.endsWith(".json")); }
ok(!!file, "Sicherung heruntergeladen (" + file + ")");
const exp = JSON.parse(readFileSync(path.join(dl, file), "utf8"));
ok(exp.app === "therapieplatz" && exp.daten.therapists.length === 5 && exp.daten.ich.versNr === "A123456789", "Sicherung enthält alle Daten");
await click('[data-act="wipe"]');
await click("#okBtn");
ok(!!(await page.$('[data-form="welcome"]')), "Nach „Alle Daten löschen“ wieder Willkommensseite");
ok((await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tp1.")).length)) === 0, "localStorage ist leer");
// Neues Gerät: Name eingeben, dann importieren
await page.type('[data-form="welcome"] input[name=name]', "Test");
await click('[data-form="welcome"] button[type=submit]');
await go("#daten");
const input = await page.$('input[type=file][data-change="import"]');
await input.uploadFile(path.join(dl, file));
await sleep(400);
S = await store();
ok(S && S.therapists.length === 5 && S.log.length === exp.daten.log.length && S.ich.name === "Lena", "Import stellt alles wieder her");
// Import über vorhandene Daten fragt nach
await go("#daten");
await (await page.$('input[type=file][data-change="import"]')).uploadFile(path.join(dl, file));
await sleep(300);
ok(!!(await page.$("#okBtn")), "Import über vorhandene Daten fragt nach");
await click("#okBtn");
// Kaputte Datei
const bad = path.join(dl, "kaputt.json");
writeFileSync(bad, '{"app":"etwas anderes"}');
await go("#daten");
await (await page.$('input[type=file][data-change="import"]')).uploadFile(bad);
await sleep(300);
ok((await page.$eval(".toast", (t) => t.textContent)).includes("keine Sicherung"), "Fremde Datei wird abgelehnt");

// ---------- 12. PWA ----------
console.log("\n12. PWA");
await page.reload({ waitUntil: "networkidle0" });
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
ok(sw, "Service Worker registriert");
const man = await page.evaluate(async () => (await fetch("manifest.webmanifest")).json());
ok(man.display === "standalone" && man.icons.length === 4, "Manifest gültig");
await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return r.active && r.active.state; });
await sleep(500);
await page.reload({ waitUntil: "networkidle0" });
await page.setOfflineMode(true);
await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
await sleep(400);
ok(!!(await page.$(".tabs")), "App lädt offline aus dem Cache");
await page.setOfflineMode(false);

// ---------- 13. Desktop ----------
await page.setViewport({ width: 1280, height: 900 });
for (const [h, n] of [["#start", "d1-start"], ["#liste", "d2-liste"], ["#anrufen", "d3-anrufen"], ["#protokoll", "d4-protokoll"], ["#antrag", "d5-antrag"]]) { await go(h); await shot(n); }
// Dunkelmodus
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await go("#start");
await shot("18-dunkel", false);

// Breite: kein horizontales Scrollen auf dem Handy
const overflow = [];
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
for (const h of ["#start", "#liste", "#anrufen", "#mails", "#protokoll", "#antrag", "#ich", "#daten", "#t/" + schmidtId]) {
  await go(h);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  if (w > 390) overflow.push(h + "=" + w);
}
ok(!overflow.length, "Kein horizontales Scrollen bei 390px " + overflow.join(" "));

ok(external.length === 0, "Keine externen Anfragen " + external.slice(0, 3).join(" "));
const realErrors = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource|net::ERR/.test(e));
ok(realErrors.length === 0, "Keine JS-Fehler " + realErrors.slice(0, 3).join(" | "));

await browser.close();
server.close();
rmSync(dl, { recursive: true, force: true });
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
writeFileSync(path.join(root, "tests", "last-run.txt"), results.join("\n") + `\n\n${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
