/* global React */
/* =====================================================
   amrit.os ADMIN — content editors (part 2)
   Work history (tabs / sub-roles / multi-tag) · Projects (dual images)
   ===================================================== */
const { useState: useStateWP } = React;

function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('id-' + Math.random().toString(36).slice(2, 6)); }

/* ============ WORK ============ */
function WorkItemBody({ e, onChange }) {
  const { Field, Input, TextArea, Btn, BulletEditor, TagInput, ToggleRow, AdminIcon } = window.ADMIN_UI;
  const [roleTab, setRoleTab] = useStateWP(0);
  const hasRoles = Array.isArray(e.roles) && e.roles.length > 0;
  const set = (key, val) => onChange({ ...e, [key]: val });

  const setRole = (i, key, val) => onChange({ ...e, roles: e.roles.map((r, j) => j === i ? { ...r, [key]: val } : r) });
  const addRole = () => { const roles = [...(e.roles || []), { id: slug('role ' + ((e.roles || []).length + 1)), name: 'New role', date: '', bullets: [] }]; onChange({ ...e, roles }); setRoleTab(roles.length - 1); };
  const delRole = (i) => { const roles = e.roles.filter((_, j) => j !== i); onChange({ ...e, roles }); setRoleTab(0); };

  return (
    <>
      <div className="row">
        <Field label="Company"><Input value={e.company} onChange={(v) => set('company', v)} /></Field>
        <Field label="Short label" hint="sidebar tab"><Input value={e.short} onChange={(v) => set('short', v)} /></Field>
      </div>
      <div className="row">
        <Field label="Role / title"><Input value={e.role} onChange={(v) => set('role', v)} /></Field>
        <Field label="Subtitle"><Input value={e.sub} onChange={(v) => set('sub', v)} /></Field>
      </div>
      <div className="row">
        <Field label="Date range"><Input value={e.date} onChange={(v) => set('date', v)} /></Field>
        <Field label="" hint=""><div style={{ paddingTop: 22 }}><ToggleRow title="Current role" sub="green dot on tab" value={!!e.current} onChange={(v) => set('current', v)} /></div></Field>
      </div>
      <Field label="Description" hint="✨ to refine"><window.ADMIN_REFINER.RefineField label="Work experience description" context="The role description paragraph shown when a work history entry is selected — scope, impact, and what was built at this company." rows={2} value={e.desc} onChange={(v) => set('desc', v)} /></Field>

      <div className="divider" />
      <ToggleRow title="Split into sub-roles" sub="for a progression of titles within one company (e.g. Intern → Consultant → Lead)"
        value={hasRoles}
        onChange={(on) => {
          if (on) onChange({ ...e, roles: [{ id: slug('role 1'), name: 'Role 1', date: e.date || '', bullets: e.bullets || [] }] });
          else { const { roles, ...rest } = e; onChange({ ...rest, bullets: (e.roles && e.roles[0] && e.roles[0].bullets) || e.bullets || [] }); }
        }} />

      {hasRoles ? (
        <div style={{ marginTop: 12 }}>
          <div className="subtabs">
            {e.roles.map((r, i) => (
              <span key={i} className="subtab" data-on={roleTab === i} onClick={() => setRoleTab(i)}>
                {r.name || 'role ' + (i + 1)}
                <button onClick={(ev) => { ev.stopPropagation(); delRole(i); }} title="Delete sub-role">×</button>
              </span>
            ))}
            <span className="subtab" onClick={addRole} style={{ borderStyle: 'dashed' }}><AdminIcon name="plus" size={12} />sub-role</span>
          </div>
          {e.roles && e.roles.at(roleTab) && (
            <div className="item" style={{ background: 'var(--bg-card)' }}>
              <div className="item__bd" style={{ borderTop: 0, paddingTop: 14 }}>
                <div className="row">
                  <Field label="Sub-role name"><Input value={e.roles.at(roleTab).name} onChange={(v) => setRole(roleTab, 'name', v)} /></Field>
                  <Field label="Date"><Input value={e.roles.at(roleTab).date} onChange={(v) => setRole(roleTab, 'date', v)} /></Field>
                </div>
                <Field label="Bullets"><BulletEditor items={e.roles.at(roleTab).bullets || []} onChange={(v) => setRole(roleTab, 'bullets', v)} /></Field>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Field label="Bullets" hint=""><BulletEditor items={e.bullets || []} onChange={(v) => set('bullets', v)} /></Field>
      )}

      <div className="divider" />
      <Field label="Tech stack" hint="multiple tags"><TagInput value={e.stack || []} onChange={(v) => set('stack', v)} placeholder="Add tech + Enter" /></Field>
    </>
  );
}

function WorkEditor({ content, setAt }) {
  const { PageHead, Panel, AdminIcon, Reorderable, ListItem } = window.ADMIN_UI;
  const list = content.experience;
  const [open, setOpen] = useStateWP(0);
  const update = (i, next) => setAt('experience', list.map((e, j) => j === i ? next : e));
  const add = () => { const next = [...list, { id: slug('role ' + (list.length + 1)), company: 'New company', role: 'Role', sub: '', date: '', short: 'New', desc: '', bullets: [], stack: [] }]; setAt('experience', next); setOpen(next.length - 1); };

  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/WORK.HISTORY" title="Work history">Each company is a tab in the work folder. Expand one to edit titles, dates, bullets, multi-tag tech stacks and optional sub-roles. Drag to reorder.</PageHead>
      <Panel className="panel--work" title="Experience entries" sub={`${list.length} companies`} actions={<div className="panel__actions">
        <button className="btn btn--sm btn--tall btn--primary" type="button" title="Add company" onClick={add}><AdminIcon name="plus" size={13} /><span className="btn__label">Add company</span></button>
      </div>}>
        <Reorderable items={list} getKey={(e, i) => e.id || i} onReorder={(next) => setAt('experience', next)}
          renderItem={(e, i, { gripProps }) => (
            <ListItem layout="card" gripProps={gripProps} icon={<AdminIcon name="work" size={15} />}
              title={<span>{e.company}{e.current && <span style={{ color: 'var(--ok)', fontFamily: 'var(--font-mono)', fontSize: 10, marginLeft: 8 }}>● current</span>}</span>}
              sub={`${e.role} · ${e.date}${e.roles ? ' · ' + e.roles.length + ' sub-roles' : ''}`}
              open={open === i} onToggle={() => setOpen(open === i ? null : i)}
              onDelete={() => { setAt('experience', list.filter((_, j) => j !== i)); setOpen(null); }}>
              <WorkItemBody e={e} onChange={(next) => update(i, next)} />
            </ListItem>
          )} />
      </Panel>
    </div>
  );
}

/* ============ PROJECTS ============ */
function ProjectBody({ p, expertise, onChange }) {
  const { Field, Input, TagInput, AdminIcon } = window.ADMIN_UI;
  const { ImageSlot } = window.ADMIN_CROP;
  const { TARGETS } = window.ADMIN_EDITORS;
  const set = (key, val) => onChange({ ...p, [key]: val });
  const skills = p.skills || [];
  const toggleSkill = (icon) => set('skills', skills.includes(icon) ? skills.filter((s) => s !== icon) : [...skills, icon]);
  const setLink = (i, key, val) => set('links', p.links.map((l, j) => j === i ? { ...l, [key]: val } : l));

  return (
    <>
      <div className="row">
        <Field label="Title"><Input value={p.title} onChange={(v) => set('title', v)} /></Field>
        <Field label="Category"><Input value={p.cat} onChange={(v) => set('cat', v)} /></Field>
        <Field label="Type" hint=".ext badge"><Input value={p.type} onChange={(v) => set('type', v)} /></Field>
      </div>
      <Field label="Description" hint="✨ to refine"><window.ADMIN_REFINER.RefineField label="Project description" context="The project description shown in the portfolio project folder modal — what it is, what was built, and the outcome." rows={3} value={p.desc} onChange={(v) => set('desc', v)} /></Field>
      <div className="grid2">
        <ImageSlot label="Folder / thumbnail image" value={p.image} target={TARGETS.projThumb} outputType="image/png" storageKey={'projects/' + (p.id || 'p') + '-thumb'}
          hint="Shown on the project desktop" onChange={(url) => set('image', url)} />
        <ImageSlot label="Gallery image (modal)" value={p.gallery} target={TARGETS.projGallery} outputType="image/jpeg" storageKey={'projects/' + (p.id || 'p') + '-gallery'}
          hint="Large image inside the open modal" onChange={(url) => set('gallery', url)} />
      </div>
      <Field label="Tags" hint="drag to reorder"><TagInput reorderable value={p.tags || []} onChange={(v) => set('tags', v)} placeholder="Add tag + Enter" /></Field>
      <Field label="Filter skills" hint="which expertise modules surface this project">
        <div className="tags" style={{ minHeight: 0, gap: 6 }}>
          {expertise.map((e) => (
            <span key={e.icon} className="subtab" data-on={skills.includes(e.icon)} onClick={() => toggleSkill(e.icon)} style={{ cursor: 'pointer' }}>
              {skills.includes(e.icon) && <AdminIcon name="check" size={11} />}{e.title}
            </span>
          ))}
        </div>
      </Field>
      <Field label="Links">
        {(p.links || []).map((l, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <Input value={l.label} placeholder="Label (e.g. Live Site)" onChange={(v) => setLink(i, 'label', v)} />
            <Input value={l.href} placeholder="https://" onChange={(v) => setLink(i, 'href', v)} />
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
              <span className="iconbtn iconbtn--danger" onClick={() => set('links', p.links.filter((_, j) => j !== i))}><AdminIcon name="trash" size={14} /></span>
            </div>
          </div>
        ))}
        {React.createElement(window.ADMIN_UI.Btn, { sm: true, icon: 'plus', kind: 'ghost', onClick: () => set('links', [...(p.links || []), { label: '', href: '' }]) }, 'Add link')}
      </Field>
    </>
  );
}

function ProjectsEditor({ content, setAt }) {
  const { PageHead, Panel, AdminIcon, Reorderable, ListItem } = window.ADMIN_UI;
  const list = content.projects;
  const [open, setOpen] = useStateWP(null);
  const update = (i, next) => setAt('projects', list.map((p, j) => j === i ? next : p));
  const add = () => { const next = [...list, { id: slug('project ' + (list.length + 1)), title: 'New project', cat: '', type: '.app', image: '', gallery: '', desc: '', tags: [], skills: [], links: [] }]; setAt('projects', next); setOpen(next.length - 1); };

  return (
    <div className="canvas--narrow">
      <PageHead eyebrow="/PROJECTS.DIR" title="Projects">Each project is a folder on the desktop. Upload a folder thumbnail and a larger gallery image (both crop to the exact front-end size), set tags, links and which expertise modules filter to it. Drag to reorder.</PageHead>
      <Panel className="panel--projects" title="Project folders" sub={`${list.length} items`} actions={<div className="panel__actions">
        <button className="btn btn--sm btn--tall btn--primary" type="button" title="Add project" onClick={add}><AdminIcon name="plus" size={13} /><span className="btn__label">Add project</span></button>
      </div>}>
        <Reorderable items={list} getKey={(p, i) => p.id || i} onReorder={(next) => setAt('projects', next)}
          renderItem={(p, i, { gripProps }) => (
            <ListItem layout="card" gripProps={gripProps}
              thumb={p.image || undefined}
              icon={!p.image ? <AdminIcon name="projects" size={15} /> : undefined}
              title={p.title} sub={`${p.cat || '—'}  ${p.type || ''}`}
              open={open === i} onToggle={() => setOpen(open === i ? null : i)}
              onDelete={() => { setAt('projects', list.filter((_, j) => j !== i)); setOpen(null); }}>
              <ProjectBody p={p} expertise={content.expertise} onChange={(next) => update(i, next)} />
            </ListItem>
          )} />
      </Panel>
    </div>
  );
}

window.ADMIN_EDITORS_WP = { WorkEditor, ProjectsEditor };
