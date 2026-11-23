// Erzeugt die App-Icons aus einem SVG (mit Chrome headless). Aufruf: node tools/make-icons.mjs
import puppeteer from "file:///D:/Projekte/flurfunk/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(path.join(root, "icons"), { recursive: true });

// Warme Sonne über zwei Salbei-Hügeln. maskable: Motiv kleiner, Fläche randlos
const svg = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  ${maskable ? "" : '<clipPath id="c"><rect width="64" height="64" rx="15"/></clipPath>'}
  <g ${maskable ? "" : 'clip-path="url(#c)"'}>
    <rect width="64" height="64" fill="#F1E2CD"/>
    <g ${maskable ? 'transform="translate(6.4 6.4) scale(0.8)"' : ""}>
      <circle cx="32" cy="30" r="13" fill="#C8714E"/>
    </g>
    <path d="M0 44c10-7 20-9 32-6s22 2 32-4v30H0z" fill="#86A07F"/>
    <path d="M0 52c12-5 24-5 36-2s20 2 28-1v15H0z" fill="#5F7C5E"/>
  </g>
</svg>`;

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage();
const jobs = [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["maskable-192.png", 192, true], ["maskable-512.png", 512, true], ["apple-touch-icon.png", 180, true]];
for (const [name, size, maskable] of jobs) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(maskable)}</body></html>`);
  await page.screenshot({ path: path.join(root, "icons", name), omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log("Icons erzeugt.");
