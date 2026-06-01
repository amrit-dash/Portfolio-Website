#!/usr/bin/env node
/* `npm run help` — list the project's commands, grouped and described. */

const c = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const accent = (s) => c('38;5;191', s); // lime-ish
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);

const GROUPS = [
  ['Develop', [
    ['dev', 'Serve public/ locally at http://localhost:3000'],
    ['start', 'Alias of dev'],
  ]],
  ['Build', [
    ['build', 'Assemble the two bundles → dist/site (portfolio) + dist/admin (console)'],
  ]],
  ['Deploy', [
    ['deploy:site', 'Build + deploy ONLY the portfolio → amritdash.web.app'],
    ['deploy:admin', 'Build + deploy ONLY the admin console → amritos-admin.web.app'],
    ['deploy:hosting', 'Build + deploy BOTH sites (amritdash + amritos-admin)'],
    ['deploy:backend', 'Deploy Cloud Functions + Firestore rules + Storage rules (no build)'],
  ]],
  ['Help', [
    ['help', 'Show this list'],
  ]],
];

const all = GROUPS.flatMap(([, cmds]) => cmds.map(([name]) => name));
const pad = Math.max(...all.map((n) => n.length)) + 2;

console.log('');
console.log(bold(accent('amrit.os')) + dim(' — available commands'));
console.log(dim('run with:  ') + 'npm run <command>');
for (const [group, cmds] of GROUPS) {
  console.log('');
  console.log(dim(group.toUpperCase()));
  for (const [name, desc] of cmds) {
    console.log('  ' + accent(name.padEnd(pad)) + dim(desc));
  }
}
console.log('');
console.log(dim('notes: ') + 'deploys use your local `firebase` login. Backend deploy is');
console.log('       local-only (functions need broader IAM than the hosting CI).');
console.log('       Vanilla v1 (amrit-dash-portfolio) is never a deploy target.');
console.log('');
