// Shared offline page shell for BOM and diff exports.
import { SPEC_VERSION } from "../../src/index.js";

export const escapeHtml = (value: unknown): string =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );

export function htmlPage(
  title: string,
  header: string,
  content: string,
): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · bomkit</title>
<style>
* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font: 13px/1.35 system-ui,-apple-system,sans-serif;
}

.app {
    --bg: #f3f6f8;
    --surface: #fff;
    --ink: #203342;
    --muted: #586d7b;
    --line: #dce4e9;
    --accent: #096f67;
    --tint: #e6f1ef;
    --warning: #96520c;
    color-scheme: light;
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
    padding: 36px 24px;
}

#theme-dark:checked~.app {
    --bg: #10171e;
    --surface: #19232d;
    --ink: #e2ecf3;
    --muted: #a0b2c1;
    --line: #32424f;
    --accent: #77d9c7;
    --tint: #233c3c;
    --warning: #f3be78;
    color-scheme: dark;
}

@media(prefers-color-scheme:dark) {
    #theme-auto:checked~.app {
        --bg: #10171e;
        --surface: #19232d;
        --ink: #e2ecf3;
        --muted: #a0b2c1;
        --line: #32424f;
        --accent: #77d9c7;
        --tint: #233c3c;
        --warning: #f3be78;
        color-scheme: dark;
    }
}

main {
    max-width: 1440px;
    margin: auto;
}

header {
    border-top: 4px solid var(--accent);
    background: var(--surface);
    padding: 28px;
    border-radius: 10px;
    border-bottom: 1px solid var(--line);
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: .16em;
    color: var(--accent);
    font-size: 11px;
    font-weight: 750;
}

h1 {
    font-size: clamp(26px,4vw,40px);
    line-height: 1.2;
    margin: 12px 0;
}

h2 {
    font-size: 20px;
    margin: 20px 0 10px;
}

h3 {
    font-size: 16px;
}

p {
    margin: 10px 0;
}

small {
    display: block;
    color: var(--muted);
    font-size: 12px;
    overflow-wrap: anywhere;
}

.identity {
    color: var(--muted);
    overflow-wrap: anywhere;
}

.stats {
    display: flex;
    gap: 24px;
    flex-wrap: wrap;
    margin-top: 18px;
}

.stats strong {
    font-size: 22px;
}

.badge {
    display: inline-block;
    background: var(--tint);
    color: var(--accent);
    padding: 1px 6px;
    border-radius: 9px;
    font-size: 10px;
    margin: 0 2px 0 0;
}

.control {
    position: absolute;
    width: 1px;
    height: 1px;
    clip-path: inset(50%);
    overflow: hidden;
}

label,summary {
    cursor: pointer;
}

.theme-switch {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    margin: 18px 0;
    color: var(--muted);
    font-size: 12px;
}

.theme-switch label,.view-switch label {
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 6px 12px;
    background: var(--surface);
}

.view-switch {
    display: flex;
    gap: 8px;
    margin: 20px 0 12px;
    font-weight: 650;
}

#theme-auto:checked~.app label[for=theme-auto],
#theme-light:checked~.app label[for=theme-light],
#theme-dark:checked~.app label[for=theme-dark],
#view-manufacturing:checked~.view-switch label[for=view-manufacturing],
#view-purchasing:checked~.view-switch label[for=view-purchasing] {
    border-color: var(--accent);
    background: var(--tint);
    color: var(--accent);
}

#theme-auto:focus-visible~.app label[for=theme-auto],
#theme-light:focus-visible~.app label[for=theme-light],
#theme-dark:focus-visible~.app label[for=theme-dark],
#view-manufacturing:focus-visible~.view-switch label[for=view-manufacturing],
#view-purchasing:focus-visible~.view-switch label[for=view-purchasing] {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
}

.purchasing {
    display: none;
}

#view-purchasing:checked~.purchasing {
    display: block;
}

#view-purchasing:checked~.manufacturing {
    display: none;
}

.note {
    color: var(--muted);
    font-size: 13px;
    white-space: pre-wrap;
}

.warning {
    color: var(--warning);
}

.tree-scroll,.table-scroll {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
}

.tree {
    min-width: 1180px;
}

.row {
    display: grid;
    grid-template-columns: minmax(280px,2.7fr) minmax(100px,.8fr) minmax(130px,1fr) minmax(150px,1.2fr) minmax(110px,.8fr) minmax(140px,1.1fr);
    align-items: center;
    gap: 10px;
    padding: 5px 64px 5px 16px;
    min-height: 30px;
}

.tree-header {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--muted);
    background: var(--tint);
    border-bottom: 1px solid var(--line);
}

.entry {
    position: relative;
    border-bottom: 1px solid var(--line);
}

.node,.leaf {
    margin: 0;
}

.node>summary {
    position: relative;
    list-style: none;
}

.node>summary::-webkit-details-marker {
    display: none;
}

.node>summary::before {
    content: '▸';
    position: absolute;
    left: calc(6px + var(--depth)*18px);
    top: 6px;
    color: var(--accent);
}

.node[open]>summary::before {
    content: '▾';
}

.designation {
    padding-left: calc(10px + var(--depth,0)*18px);
}

.node>summary:hover,.leaf:hover {
    background: var(--bg);
}

.children {
    margin-left: 0;
}

.node-info>details {
    margin: 0;
    font-size: 12px;
}

.node-info>details>summary {
    position: absolute;
    right: 8px;
    top: 6px;
    list-style: none;
    font-size: 11px;
}

.node-info>details>summary::-webkit-details-marker {
    display: none;
}

.node-info>details[open] {
    padding: 8px 16px;
    background: var(--bg);
}

.node-info details details {
    margin: 6px 0;
}

.designation {
    overflow-wrap: anywhere;
}

.designation strong {
    font-weight: 550;
}

.designation small,.part-label small {
    display: inline;
    margin-left: 7px;
    font-size: 11px;
}

.manufacturer,.mpn {
    font-size: 12px;
    overflow-wrap: anywhere;
}

.muted {
    color: var(--muted);
}

.alternates {
    display: inline;
    margin-left: 5px;
    font-size: 10px;
    color: var(--accent);
}

.purchasing td>details {
    display: inline-block;
    margin: 0 0 0 4px;
    font-size: 11px;
}

.position small {
    display: inline;
    margin-left: 5px;
    font-size: 11px;
}

.quantity {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}

.position {
    font-size: 12px;
    overflow-wrap: anywhere;
}

details {
    margin: 14px 0;
    font-size: 13px;
}

summary {
    color: var(--accent);
}

.node>summary {
    color: var(--ink);
}

pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    background: var(--bg);
    padding: 14px;
    border-radius: 6px;
    font-size: 12px;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: var(--muted);
    background: var(--tint);
}

th,td {
    padding: 5px 10px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
}

td:first-child {
    min-width: 230px;
}

td:last-child {
    min-width: 180px;
}

td:nth-child(3),td:nth-child(4) {
    min-width: 125px;
}

footer {
    margin: 28px 0;
    color: var(--muted);
    font-size: 12px;
}

.diff-table .diff-before,
.diff-table .diff-after {
    width: 30%;
}

.diff-table .diff-value,
.diff-table code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.diff-table details {
    margin: 0;
}

.diff-added .diff-after,
.diff-modified .diff-after {
    background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

.diff-removed .diff-before,
.diff-modified .diff-before {
    background: color-mix(in srgb, var(--warning) 8%, var(--surface));
}

.diff-removed .badge {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 15%, var(--surface));
}

@media(max-width:640px) {
    .app {
        padding: 14px 10px;
    }
    header {
        padding: 18px;
    }
    .stats {
        gap: 12px;
    }
    .theme-switch {
        justify-content: flex-start;
    }
}

@media print {
    .app {
        --bg: #fff!important;
        --surface: #fff!important;
        --ink: #111!important;
        --muted: #444!important;
        --line: #ccc!important;
        --accent: #222!important;
        --tint: #eee!important;
        padding: 0;
    }
    .theme-switch {
        display: none;
    }
    .tree-scroll,.table-scroll {
        overflow: visible;
    }
    .tree {
        min-width: 0;
    }
    .row {
        gap: 6px;
        padding: 6px;
        font-size: 11px;
    }
}

</style>
</head>
<body>
<input class="control" type="radio" name="theme" id="theme-auto" checked>
<input class="control" type="radio" name="theme" id="theme-light">
<input class="control" type="radio" name="theme" id="theme-dark">
<div class="app"><main>
<header>${header}</header>
<div class="theme-switch" role="group" aria-label="Color theme">
    <span>Theme</span>
    <label for="theme-auto">System</label>
    <label for="theme-light">Light</label>
    <label for="theme-dark">Dark</label>
</div>
${content}
<footer>Generated with bomkit · Specification ${SPEC_VERSION} · Standalone HTML</footer>
</main></div>
</body></html>\n`;
}
