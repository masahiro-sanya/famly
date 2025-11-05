#!/usr/bin/env node
// Generate hosting/privacy/index.html from template with env substitutions.
// Env vars:
// - FAMLY_PRIVACY_CONTACT_EMAIL (required for production)
// - FAMLY_OPERATOR_NAME (optional)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const tplPath = path.join(root, 'hosting', 'privacy', 'index.template.html');
const outPath = path.join(root, 'hosting', 'privacy', 'index.html');

function loadEnv(file) {
  try {
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) return;
    const content = fs.readFileSync(abs, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (_e) {}
}

function main() {
  // Load env from local files if not provided by the shell/CI
  loadEnv('.env');
  loadEnv('.env.local');
  loadEnv('.env.production');
  const contact = process.env.FAMLY_PRIVACY_CONTACT_EMAIL || 'support@example.com';
  const operator = process.env.FAMLY_OPERATOR_NAME || '';
  let html = fs.readFileSync(tplPath, 'utf8');
  html = html.replace(/__CONTACT_EMAIL__/g, contact);
  if (operator) {
    html = html
      .replace(/__OPERATOR_BLOCK_START__/g, '')
      .replace(/__OPERATOR_BLOCK_END__/g, '')
      .replace(/__OPERATOR_NAME__/g, operator);
  } else {
    // Remove operator block entirely
    html = html.replace(/__OPERATOR_BLOCK_START__[\s\S]*?__OPERATOR_BLOCK_END__/g, '');
  }
  fs.writeFileSync(outPath, html);
  console.log(`[privacy] Built ${path.relative(process.cwd(), outPath)} with contact=${contact}${operator ? `, operator=${operator}` : ''}`);
}

main();
