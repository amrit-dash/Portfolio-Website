/* global React */
/* =====================================================
   amrit.os ADMIN — Collapsible LLM provider card
   Shared by Agent settings + AmritBot LLM Providers tab.
   ===================================================== */

const DEFAULT_SEGMENTS = [
  { id: 'agent', label: 'Agent', title: 'Agent default only' },
  { id: 'both', label: 'Both', title: 'Agent + Refiner default' },
  { id: 'refiner', label: 'Refiner', title: 'Refiner default only' },
];

function DefaultCycleBtn({ state, onSelect }) {
  const activeIndex = state === 'agent' ? 0 : (state === 'both' ? 1 : (state === 'refiner' ? 2 : -1));
  const pillStyle = activeIndex >= 0
    ? { '--seg-index': activeIndex }
    : { '--seg-index': 0, '--seg-visible': 0 };

  return (
    <div
      className="default-seg"
      role="radiogroup"
      aria-label="Default provider role"
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="default-seg__pill"
        aria-hidden="true"
        data-active={activeIndex >= 0 ? 'true' : 'false'}
        style={pillStyle}
      />
      {DEFAULT_SEGMENTS.map((seg) => (
        <button
          key={seg.id}
          type="button"
          role="radio"
          aria-checked={state === seg.id}
          className={'default-seg__btn' + (state === seg.id ? ' default-seg__btn--active' : '')}
          title={seg.title}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(seg.id);
          }}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  apiKey,
  model,
  curatedDefault,
  expanded,
  onToggle,
  extraTags,
  defaultMode,
  defaultState,
  onSetDefaultState,
  isDefault,
  onSetDefault,
  children,
}) {
  const { AdminIcon, Btn } = window.ADMIN_UI;
  const endpoint = provider.endpoint.replace('{model}', model || curatedDefault || '');
  const cardClass = [
    'provcard',
    expanded ? 'provcard--open' : '',
    defaultMode === 'three-state'
      ? (defaultState === 'both' ? 'provcard--both' : (defaultState === 'agent' ? 'provcard--active' : (defaultState === 'refiner' ? 'provcard--refiner' : '')))
      : (isDefault ? 'provcard--active' : ''),
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass} data-open={expanded ? 'true' : 'false'}>
      <div
        className={'provcard__hd' + (onToggle ? ' provcard__hd--clickable' : '')}
        onClick={onToggle ? () => onToggle() : undefined}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        onKeyDown={onToggle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } } : undefined}
      >
        <span className="chev provcard__chev" data-open={expanded ? 'true' : 'false'} aria-hidden="true">
          <AdminIcon name="chev" size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="provrow__nm">
            {provider.label}
            {extraTags}
            {defaultMode === 'simple' && isDefault && <span className="tag tag--accent">DEFAULT</span>}
            {defaultMode === 'three-state' && defaultState === 'agent' && <span className="tag tag--accent">AGENT</span>}
            {defaultMode === 'three-state' && defaultState === 'both' && <span className="tag tag--accent">AGENT + REFINER</span>}
            {defaultMode === 'three-state' && defaultState === 'refiner' && <span className="tag tag--refiner">REFINER</span>}
          </div>
          <div className="provrow__ep">{endpoint}</div>
        </div>
        <span className={'keystate' + (apiKey ? ' has' : '')} onClick={(e) => e.stopPropagation()}>
          <span className="d" />{apiKey ? 'key set' : 'no key'}
        </span>
        <span onClick={(e) => e.stopPropagation()}>
          {defaultMode === 'three-state'
            ? <DefaultCycleBtn state={defaultState || 'none'} onSelect={onSetDefaultState} />
            : (isDefault
              ? <span className="provcard__badge">✓ default</span>
              : <Btn sm kind="ghost" onClick={onSetDefault}>Set as default</Btn>)}
        </span>
      </div>
      {expanded && (
        <div className="provcard__bd">
          {children}
        </div>
      )}
    </div>
  );
}

function providerDefaultState(providerId, cfg) {
  const isAgent = cfg.active === providerId;
  const isRefiner = cfg.refinerActive === providerId;
  if (isAgent && isRefiner) return 'both';
  if (isAgent) return 'agent';
  if (isRefiner) return 'refiner';
  return 'none';
}

function cycleProviderDefault(providerId, cfg) {
  const state = providerDefaultState(providerId, cfg);
  let active = cfg.active || '';
  let refinerActive = cfg.refinerActive || '';
  if (state === 'none') {
    active = providerId;
  } else if (state === 'agent') {
    refinerActive = providerId;
  } else if (state === 'both') {
    refinerActive = providerId;
    if (active === providerId) active = '';
  } else {
    active = providerId;
    if (refinerActive === providerId) refinerActive = '';
  }
  return { ...cfg, active, refinerActive };
}

function setProviderDefault(providerId, cfg, target) {
  let active = cfg.active || '';
  let refinerActive = cfg.refinerActive || '';
  if (target === 'agent') {
    active = providerId;
    if (refinerActive === providerId) refinerActive = '';
  } else if (target === 'both') {
    active = providerId;
    refinerActive = providerId;
  } else if (target === 'refiner') {
    refinerActive = providerId;
    if (active === providerId) active = '';
  }
  return { ...cfg, active, refinerActive };
}

window.ADMIN_PROVIDER_CARD = {
  ProviderCard,
  DefaultCycleBtn,
  providerDefaultState,
  cycleProviderDefault,
  setProviderDefault,
};
