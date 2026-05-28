#!/usr/bin/env node
// scripts/sync-github.mjs
// ----------------------------------------------------------------------
// Pull live metadata for every portfolio project that links to a GitHub
// repository, and bake it into public/data/portfolio.json under each
// project's `github` field. The renderer then surfaces real descriptions,
// repository topics, language breakdowns, star/fork counts and the
// social-preview image.
//
// Authentication: uses the `gh` CLI (preferred — higher rate limit and
// already configured for this VM) and falls back to unauthenticated
// `curl` against the public REST API.
//
// Usage:
//   node scripts/sync-github.mjs           # syncs and writes the file
//   node scripts/sync-github.mjs --dry-run # prints the diff, no writes
//   node scripts/sync-github.mjs --report  # prints a per-project report
//
// The script is idempotent and safe to re-run on a schedule (e.g. via a
// GitHub Action) so descriptions and stars stay fresh without touching
// any of the curated copy (title/category/summary/links).

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = resolve(__dirname, "..", "public", "data", "portfolio.json");

const DRY = process.argv.includes("--dry-run");
const REPORT = process.argv.includes("--report");

const FIELDS = [
  "name",
  "description",
  "repositoryTopics",
  "languages",
  "primaryLanguage",
  "stargazerCount",
  "forkCount",
  "updatedAt",
  "pushedAt",
  "createdAt",
  "licenseInfo",
  "defaultBranchRef",
  "homepageUrl",
  "openGraphImageUrl",
  "usesCustomOpenGraphImage",
  "url",
].join(",");

function parseRepoFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i);
  if (!m) return null;
  // Skip profile-only links such as github.com/the-AoG-guy
  if (m[2].length < 2) return null;
  return `${m[1]}/${m[2]}`;
}

function pickRepoFromProject(project) {
  const links = project.links || [];
  for (const l of links) {
    const r = parseRepoFromUrl(l.href);
    if (r) return r;
  }
  return null;
}

async function ghAvailable() {
  try {
    await exec("gh", ["--version"]);
    return true;
  } catch (_) {
    return false;
  }
}

async function fetchWithGh(nameWithOwner) {
  const { stdout } = await exec("gh", [
    "repo",
    "view",
    nameWithOwner,
    "--json",
    FIELDS,
  ]);
  return JSON.parse(stdout);
}

async function fetchWithCurl(nameWithOwner) {
  // Unauthenticated REST fallback — fewer fields, lower rate limit.
  const { stdout: repoRaw } = await exec("curl", [
    "-sSL",
    "-H",
    "Accept: application/vnd.github+json",
    `https://api.github.com/repos/${nameWithOwner}`,
  ]);
  const repo = JSON.parse(repoRaw);
  if (repo.message) throw new Error(`${nameWithOwner}: ${repo.message}`);
  const { stdout: langRaw } = await exec("curl", [
    "-sSL",
    "-H",
    "Accept: application/vnd.github+json",
    `https://api.github.com/repos/${nameWithOwner}/languages`,
  ]);
  const langs = JSON.parse(langRaw);
  return {
    name: repo.name,
    description: repo.description,
    repositoryTopics: (repo.topics || []).map((name) => ({ name })),
    languages: Object.entries(langs).map(([n, size]) => ({ size, node: { name: n } })),
    primaryLanguage: repo.language ? { name: repo.language } : null,
    stargazerCount: repo.stargazers_count,
    forkCount: repo.forks_count,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    createdAt: repo.created_at,
    licenseInfo: repo.license ? { key: repo.license.spdx_id, name: repo.license.name } : null,
    defaultBranchRef: { name: repo.default_branch },
    homepageUrl: repo.homepage,
    openGraphImageUrl: `https://opengraph.githubassets.com/1/${nameWithOwner}`,
    usesCustomOpenGraphImage: false,
    url: repo.html_url,
  };
}

function normalize(raw, nameWithOwner) {
  const totalBytes = (raw.languages || []).reduce((a, l) => a + (l.size || 0), 0) || 1;
  const languages = (raw.languages || [])
    .map((l) => ({
      name: l.node?.name,
      bytes: l.size,
      pct: Math.round(((l.size || 0) / totalBytes) * 1000) / 10,
    }))
    .filter((l) => l.name)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 6);

  return {
    nameWithOwner,
    url: raw.url || `https://github.com/${nameWithOwner}`,
    description: raw.description || "",
    topics: (raw.repositoryTopics || []).map((t) => t.name).slice(0, 10),
    languages,
    primaryLanguage: raw.primaryLanguage?.name || null,
    stars: raw.stargazerCount || 0,
    forks: raw.forkCount || 0,
    createdAt: raw.createdAt || null,
    pushedAt: raw.pushedAt || null,
    updatedAt: raw.updatedAt || null,
    license: raw.licenseInfo ? { key: raw.licenseInfo.key, name: raw.licenseInfo.name } : null,
    defaultBranch: raw.defaultBranchRef?.name || "main",
    homepage: raw.homepageUrl || null,
    socialImage: raw.openGraphImageUrl || `https://opengraph.githubassets.com/1/${nameWithOwner}`,
    usesCustomSocialImage: !!raw.usesCustomOpenGraphImage,
    syncedAt: new Date().toISOString(),
  };
}

async function main() {
  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"));
  const projects = data.projects || [];
  const useGh = await ghAvailable();

  const log = (...args) => console.log("•", ...args);
  const targets = projects
    .map((p, i) => ({ p, i, repo: pickRepoFromProject(p) }))
    .filter((t) => !!t.repo);

  log(`Found ${targets.length}/${projects.length} projects with GitHub links.`);
  log(`Using ${useGh ? "gh CLI" : "anonymous REST"}.`);

  let changed = 0;
  const report = [];
  for (const { p, i, repo } of targets) {
    try {
      const raw = useGh ? await fetchWithGh(repo) : await fetchWithCurl(repo);
      const enriched = normalize(raw, repo);
      const before = JSON.stringify(p.github || null);
      const after = JSON.stringify(enriched);
      if (before !== after) {
        projects[i].github = enriched;
        changed += 1;
      }
      report.push({
        title: p.title,
        repo,
        topics: enriched.topics.length,
        languages: enriched.languages.length,
        primary: enriched.primaryLanguage,
        stars: enriched.stars,
      });
      log(`✓ ${p.title}  ←  ${repo}  (${enriched.primaryLanguage || "?"}, ⭐${enriched.stars})`);
    } catch (e) {
      log(`× ${p.title}  ←  ${repo}  : ${e.message}`);
    }
  }

  if (REPORT) {
    console.log("\nReport:\n" + JSON.stringify(report, null, 2));
  }

  if (DRY) {
    log(`Dry-run: ${changed} project(s) would be updated. Not writing.`);
    return;
  }

  data.lastGithubSync = new Date().toISOString();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
  log(`Wrote ${DATA_FILE}.`);
  log(`${changed} project(s) updated, ${targets.length - changed} unchanged.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
