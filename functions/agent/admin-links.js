/* Admin deep-link helpers — attach to tool results for agent UI navigation. */

const LINKS = {
  inbox: { adminLink: '/admin.html#bot', label: 'Open Inbox' },
  bot: { adminLink: '/admin.html#bot', label: 'Open AmritBot' },
  projects: { adminLink: '/admin.html#projects', label: 'Preview projects' },
  work: { adminLink: '/admin.html#work', label: 'Open work' },
  hero: { adminLink: '/admin.html#hero', label: 'Open hero' },
  about: { adminLink: '/admin.html#about', label: 'Open about' },
  expertise: { adminLink: '/admin.html#expertise', label: 'Open expertise' },
  analytics: { adminLink: '/admin.html#analytics', label: 'Open analytics' },
  sync: { adminLink: '/admin.html#sync', label: 'Open sync & deploy' },
  agent: { adminLink: '/admin.html#agent', label: 'Open agent' },
  logs: { adminLink: '/admin.html#logs', label: 'Open logs' },
  appearance: { adminLink: '/admin.html#appearance', label: 'Open appearance' },
  media: { adminLink: '/admin.html#media', label: 'Open media' },
};

function buildAdminLink(key) {
  const base = LINKS[key];
  if (!base) return null;
  return { adminLink: base.adminLink, label: base.label };
}

function attachLinks(result, keys) {
  if (!result || result.ok === false) return result;
  const links = (keys || []).map(buildAdminLink).filter(Boolean);
  if (!links.length) return result;
  return { ...result, links };
}

module.exports = { LINKS, buildAdminLink, attachLinks };
