import {PRO_FEATURES, canUse, featureById, lockBody, resolveTier} from './entitlements.js';

const COACH = [
  {id:'record', title:'Record', body:'Hit REC and spit a take. Headphones help.', cta:'Record a take'},
  {id:'tune', title:'Tune', body:'Snap pitch to the key. Start with Auto-Tune — go deeper anytime.', cta:'Auto-tune take'},
  {id:'mix', title:'Mix', body:'One tap balances levels and loudness. Open Mixer to tweak.', cta:'One-click mix'},
  {id:'export', title:'Export', body:'Bounce WAV or MP3. Stems need Pro.', cta:'Export WAV'}
];
const CHECKS = [
  {id:'record', label:'Record'},
  {id:'tune', label:'Tune'},
  {id:'mix', label:'Mix'},
  {id:'export', label:'Export'}
];
const BASIC_ACTIONS = [
  {id:'tune', title:'Auto-Tune', copy:'Clean pitch, still sounds like you', run:'autoTune'},
  {id:'beat', title:'Lock to Beat', copy:'Nudge timing to the pocket', run:'lockBeat'},
  {id:'mix', title:'Smart Mix + Master', copy:'Radio-ready loudness, fast', run:'smartMix'}
];
const PRO_ACTIONS = [
  {id:'isolate', title:'Isolate Vocal', copy:'Pull the vocal stem'},
  {id:'stems', title:'Export stems', copy:'Every track as WAV'}
];
const GUARDS = {
  'Export aligned processed stems':'stems',
  'Export aligned dry stems':'stems',
  'Open stem separation':'isolate',
  'Open parameter assistant':'ai-mix'
};

const E = (tag, text) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function mountCreate({shell, config}) {
  const capStore = config.platform === 'ios' || config.platform === 'android';
  const showStripe = !capStore;
  let accountKey = 'device';
  let mode = 'create';
  let view = 'home';
  let checks = {record:false, tune:false, mix:false, export:false};
  let coachStep = 0;
  let coachOpen = false;
  let coachSkipped = false;
  let dontAgain = false;
  let clockTimer = 0;
  let toastTimer = 0;

  const rail = E('div');
  rail.className = 'iv-rail';
  const modeSwitch = E('div');
  modeSwitch.className = 'iv-mode';
  modeSwitch.setAttribute('role', 'tablist');
  modeSwitch.setAttribute('aria-label', 'Create or Studio');
  const createTab = E('button', 'Create');
  const studioTab = E('button', 'Studio');
  for (const tab of [createTab, studioTab]) {
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
  }
  createTab.id = 'ivModeCreate';
  studioTab.id = 'ivModeStudio';
  modeSwitch.append(createTab, studioTab);
  const more = E('button', 'More');
  more.type = 'button';
  more.id = 'ivMore';
  rail.append(modeSwitch, more);
  const header = document.querySelector('.app-header') || document.querySelector('.mobile-classic-top') || document.body;
  header.append(rail);

  const root = E('section');
  root.id = 'ivCreate';
  const shellNode = document.getElementById('appShell');
  if (shellNode) shellNode.prepend(root);
  else document.body.insertBefore(root, document.getElementById('studioShell'));

  const coach = E('div');
  coach.id = 'ivCoach';
  coach.hidden = true;
  document.body.append(coach);
  const lock = E('dialog');
  lock.id = 'ivLockSheet';
  lock.className = 'detail-dialog mobile-native-dialog iv-lock-sheet';
  document.body.append(lock);
  const moreDialog = E('dialog');
  moreDialog.id = 'ivMoreSheet';
  moreDialog.className = 'detail-dialog mobile-native-dialog';
  document.body.append(moreDialog);
  const toast = E('div');
  toast.id = 'ivToast';
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  document.body.append(toast);

  const nav = E('nav');
  nav.id = 'ivCreateNav';
  nav.className = 'iv-create-nav';
  nav.setAttribute('aria-label', 'Create steps');
  for (const item of [{id:'home', label:'Home'}, ...CHECKS]) {
    const button = E('button', item.label);
    button.type = 'button';
    button.dataset.view = item.id;
    button.onclick = () => showView(item.id);
    nav.append(button);
  }
  document.body.append(nav);

  function storageKey(name) { return 'iv-create-' + name + ':' + accountKey; }
  function readJSON(name, fallback) {
    try { return JSON.parse(localStorage.getItem(storageKey(name))) ?? fallback; }
    catch { return fallback; }
  }
  function signal() {
    const user = window.ivStudioBridge?.currentUser?.() || {};
    const badge = document.getElementById('accessBadge')?.textContent?.trim() || '';
    return {
      plan: user.plan || user.tier,
      kind: user.kind || badge,
      badge,
      allowed: !!(user.userId || user.id || user.email || badge),
      pro: user.pro === true,
      capabilities: user.capabilities
    };
  }
  function tier() { return resolveTier(signal()); }
  function allowed(featureId) { return canUse(featureId, {...signal(), tier: tier()}); }
  function loadAccount() {
    const user = window.ivStudioBridge?.currentUser?.() || {};
    accountKey = String(user.userId || user.id || user.email || 'device');
    mode = localStorage.getItem(storageKey('mode')) || 'create';
    if (mode !== 'studio') mode = 'create';
    checks = {record:false, tune:false, mix:false, export:false, ...readJSON('checks', {})};
  }
  function saveMode() { localStorage.setItem(storageKey('mode'), mode); }
  function saveChecks() { localStorage.setItem(storageKey('checks'), JSON.stringify(checks)); }
  function dismissed() { return localStorage.getItem(storageKey('coach')) === 'hidden'; }
  function surfaceReady() {
    const studio = document.getElementById('appShell');
    const classic = document.getElementById('studioShell');
    if (document.body.classList.contains('auth-pending')) return false;
    if (studio) return !studio.hidden;
    if (classic) return !classic.hidden;
    return false;
  }
  function arrangement() { return !!document.getElementById('steps'); }
  function allDone() { return CHECKS.every(item => checks[item.id]); }

  function applyChrome() {
    document.body.classList.toggle('iv-mode-create', mode === 'create' && surfaceReady());
    document.body.classList.toggle('iv-mode-studio', mode !== 'create' || !surfaceReady());
    createTab.setAttribute('aria-selected', mode === 'create' ? 'true' : 'false');
    studioTab.setAttribute('aria-selected', mode === 'studio' ? 'true' : 'false');
    root.hidden = !(mode === 'create' && surfaceReady());
    nav.hidden = root.hidden;
    for (const button of nav.querySelectorAll('button')) button.classList.toggle('is-current', button.dataset.view === view);
  }

  function showView(next) {
    view = next;
    render();
    if (next !== 'home') root.querySelector('.iv-screen')?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  function setMode(next) {
    mode = next === 'studio' ? 'studio' : 'create';
    saveMode();
    applyChrome();
    render();
    if (mode === 'create') maybeCoach();
  }

  createTab.onclick = () => setMode('create');
  studioTab.onclick = () => setMode('studio');
  more.onclick = openMore;

  function waitIdle(timeout = 12000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (!document.body.classList.contains('busy')) resolve();
        else if (Date.now() - start > timeout) reject(Error('The studio is still busy.'));
        else setTimeout(tick, 40);
      };
      tick();
    });
  }
  function clickNamed(text, scope = document) {
    const button = [...scope.querySelectorAll('button')].find(node => !node.classList.contains('info') && node.textContent.trim() === text);
    button?.click();
    return !!button;
  }
  function clickStage(index) {
    document.querySelectorAll('#steps button')[index]?.click();
  }
  async function setEngine(id, value) {
    const input = document.getElementById(id);
    if (!input) return false;
    input.value = value;
    input.dispatchEvent(new Event('change'));
    await waitIdle();
    return true;
  }
  function selectVocal() {
    const card = document.querySelector('.track-card[data-kind="vocal"]');
    card?.click();
    return !!card;
  }
  function statusText() { return document.getElementById('status')?.textContent || ''; }
  function assertStatus() {
    const text = statusText();
    if (/fail|error|could not|not active|select a vocal|sign in|finish the current/i.test(text)) throw Error(text);
  }

  async function autoTune() {
    if (arrangement()) {
      selectVocal();
      await setEngine('tuneEngine', 'infected');
      clickStage(4);
      await sleep(30);
      if (!clickNamed('Clean rap', document.getElementById('inspectorBody') || document)) throw Error('Select a vocal track, then Auto-Tune can apply the Natural preset.');
      await waitIdle();
      const retune = document.querySelector('#inspectorBody input[aria-label="Retune / ms"]');
      if (retune) {
        retune.value = '80';
        retune.dispatchEvent(new Event('change'));
        await waitIdle();
      }
    } else {
      const preset = [...document.querySelectorAll('#presets button')].find(button => /clean|natural|rap/i.test(button.textContent));
      if (!preset) throw Error('Open a vocal preset in Classic Studio, then try Auto-Tune again.');
      preset.click();
      await waitIdle();
    }
    checks.tune = true;
    saveChecks();
    toastMessage('Auto-Tune applied.', () => openAdvanced('tune'));
    render();
  }
  async function lockBeat() {
    if (arrangement()) {
      selectVocal();
      await setEngine('timingEngine', 'infected');
      clickStage(3);
      await sleep(30);
      const preset = document.querySelector('#inspectorBody select[aria-label="Timing preset"]');
      if (preset) {
        preset.value = 'Natural rap';
        preset.dispatchEvent(new Event('change'));
        await waitIdle();
      }
      if (!clickNamed('Preview alignment')) throw Error('Select a vocal clip, then Lock to Beat can preview the pocket.');
      await waitIdle();
      assertStatus();
    } else {
      const align = document.getElementById('align');
      if (!align) throw Error('Lock to Beat is not on this screen.');
      align.click();
      await waitIdle();
    }
    toastMessage('Lock to Beat preview is ready.', () => openAdvanced('beat'));
  }
  async function smartMix() {
    if (arrangement()) {
      await setEngine('masterEngine', 'infected');
      clickStage(5);
      await sleep(30);
      if (!clickNamed('Analyze starting balance')) throw Error('Smart Mix needs the mixer stage.');
      await waitIdle();
      assertStatus();
      clickStage(6);
      await sleep(30);
      if (!clickNamed('Rap', document.getElementById('inspectorBody') || document)) throw Error('Master preset is not open.');
      await waitIdle();
    } else {
      const master = document.getElementById('master');
      if (!master) throw Error('Smart Mix is not on this screen.');
      master.click();
      await waitIdle();
    }
    checks.mix = true;
    saveChecks();
    toastMessage('Smart Mix + Master applied.', () => openAdvanced('mix'));
    render();
  }
  async function exportWav() {
    if (arrangement()) {
      clickStage(7);
      await sleep(30);
      if (!clickNamed('Export master · 24-bit WAV')) throw Error('Export WAV is not available yet.');
      await waitIdle();
      assertStatus();
    } else {
      const format = document.getElementById('format');
      if (format) { format.value = 'wav24'; format.dispatchEvent(new Event('change')); }
      document.getElementById('export')?.click();
      await waitIdle();
    }
    checks.export = true;
    saveChecks();
    toastMessage('Export started.', () => openAdvanced('export'));
    render();
  }
  function exportMp3() {
    if (!arrangement()) {
      const format = document.getElementById('format');
      if (format) format.value = 'mp3';
      showView('export');
      document.getElementById('format')?.dispatchEvent(new Event('change'));
      return;
    }
    location.href = 'lab/index.html#mp3';
  }
  async function exportStems() {
    if (!allowed('stems')) return openLock('stems');
    if (arrangement()) {
      clickStage(7);
      await sleep(30);
      if (!clickNamed('Export aligned processed stems')) throw Error('Stem export is not available yet.');
      await waitIdle();
    } else {
      document.getElementById('exportStem')?.click();
      await waitIdle();
    }
    toastMessage('Stem export started.', () => openAdvanced('export'));
  }
  function openAi(featureId) {
    if (!allowed(featureId)) return openLock(featureId);
    if (document.getElementById('aiTab')) {
      setMode('studio');
      document.getElementById('aiTab').click();
      return;
    }
    openAdvanced('producer');
  }
  function openAdvanced(which) {
    setMode('studio');
    const stages = {tune:4, beat:3, mix:5, master:6, export:7};
    if (arrangement() && which === 'mixer') document.getElementById('core3Mixer')?.click();
    else if (arrangement() && which === 'producer') document.getElementById('core5Producer')?.click();
    else if (arrangement() && stages[which] !== undefined) clickStage(stages[which]);
    else if (which === 'export') document.querySelector('.panel.export')?.scrollIntoView({behavior:'smooth', block:'start'});
    else if (which === 'tune') document.querySelector('.panel.sound')?.scrollIntoView({behavior:'smooth', block:'start'});
    else if (which === 'beat') document.querySelector('.panel.timing')?.scrollIntoView({behavior:'smooth', block:'start'});
    else if (which === 'mix') document.querySelector('.mixbox')?.scrollIntoView({behavior:'smooth', block:'start'});
    document.querySelector('.inspector')?.scrollIntoView({behavior:'smooth', block:'start'});
  }
  async function recordTake() {
    showView('record');
    document.getElementById('enableMic')?.click();
    await waitIdle();
    const rec = document.getElementById('record');
    if (!rec) throw Error('Record is not available on this screen.');
    rec.click();
  }
  const runners = {autoTune, lockBeat, smartMix, exportWav, exportStems, recordTake};

  function toastMessage(text, advanced) {
    toast.hidden = false;
    toast.replaceChildren();
    toast.append(E('p', text));
    const link = E('button', 'Open advanced settings');
    link.type = 'button';
    link.className = 'ghost';
    link.onclick = () => { toast.hidden = true; advanced?.(); };
    toast.append(link);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 8000);
  }
  async function runAction(name) {
    try { await runners[name](); }
    catch (error) { alert(error.message); }
  }

  function openLock(featureId) {
    const feature = featureById(featureId);
    lock.replaceChildren();
    const head = E('div');
    head.className = 'dialog-top iv-sheet-top';
    const titles = E('div');
    titles.className = 'iv-sheet-titles';
    const kicker = E('p', 'Pro');
    kicker.className = 'iv-kicker';
    titles.append(kicker, E('h2', 'Unlock with Pro'));
    const close = E('button', 'Close');
    close.type = 'button';
    close.className = 'iv-sheet-close';
    close.setAttribute('aria-label', 'Close');
    close.onclick = () => lock.close();
    head.append(titles, close);
    const body = E('div');
    body.className = 'mobile-native-body';
    body.append(E('p', lockBody(feature?.name || 'This feature')));
    const list = E('ul');
    list.className = 'iv-perks';
    for (const item of PRO_FEATURES) list.append(E('li', item.name));
    body.append(list);
    const actions = E('div');
    actions.className = 'iv-sheet-actions';
    if (showStripe) {
      const buy = E('button', 'Get Pro — $40');
      buy.type = 'button';
      buy.className = 'primary';
      buy.onclick = () => { lock.close(); showView('subscribe'); setMode('create'); };
      actions.append(buy);
    } else {
      const web = E('button', 'Pro on web/desktop');
      web.type = 'button';
      web.className = 'primary';
      web.onclick = () => openWeb();
      actions.append(web);
    }
    const later = E('button', 'Maybe later');
    later.type = 'button';
    later.className = 'ghost';
    later.onclick = () => lock.close();
    actions.append(later);
    body.append(actions);
    if (!showStripe) {
      const meta = E('p', 'Pro on web/desktop');
      meta.className = 'iv-sheet-meta';
      body.append(meta);
    }
    lock.append(head, body);
    if (!lock.open) lock.showModal();
  }
  async function openWeb() {
    const origin = String(config.serverOrigin || 'https://infectedvoices.space').replace(/\/$/, '');
    await shell.openExternal(origin + '/#account');
  }
  function openMore() {
    const items = [
      ['Guided tour', () => { moreDialog.close(); coachSkipped = false; openCoach(0); }],
      ['Record', () => { moreDialog.close(); setMode('studio'); document.getElementById('record')?.click(); }],
      ['Producer', () => { moreDialog.close(); openAdvanced('producer'); }],
      ['GRIM rack', () => { moreDialog.close(); openAdvanced('producer'); }],
      ['Precision Tune', () => { moreDialog.close(); openAdvanced('tune'); }],
      ['Pocket', () => { moreDialog.close(); openAdvanced('beat'); }],
      ['Plugins', () => { moreDialog.close(); setMode('studio'); document.getElementById('pluginsTab')?.click(); }],
      ['Release & connect', () => { moreDialog.close(); setMode('studio'); document.getElementById('integrationsTab')?.click(); }],
      ['AI tools', () => { moreDialog.close(); setMode('studio'); document.getElementById('aiTab')?.click(); }],
      ['Mastering', () => { moreDialog.close(); openAdvanced('master'); }],
      ['Export', () => { moreDialog.close(); openAdvanced('export'); }],
      ['Tutorial', () => { moreDialog.close(); setMode('studio'); document.getElementById('tutorial')?.click(); }],
      ['Saved projects', () => { moreDialog.close(); setMode('studio'); document.getElementById('openSaved')?.click(); }],
      [arrangement() ? 'Classic Studio' : 'Arrangement Studio', () => { location.href = arrangement() ? 'lab/index.html' : '../studio.html'; }],
      ['Vocal Lab', () => { location.href = arrangement() ? 'index.html' : '../index.html'; }],
      ['Subscribe', () => { moreDialog.close(); setMode('create'); showView('subscribe'); }]
    ];
    moreDialog.replaceChildren();
    const head = E('div');
    head.className = 'dialog-top iv-sheet-top';
    head.append(E('h2', 'More'));
    const close = E('button', 'Close');
    close.type = 'button';
    close.className = 'iv-sheet-close';
    close.onclick = () => moreDialog.close();
    head.append(close);
    const body = E('div');
    body.className = 'mobile-native-body';
    const search = E('input');
    search.type = 'search';
    search.placeholder = 'Search features';
    search.setAttribute('aria-label', 'Search features');
    const list = E('div');
    list.className = 'iv-more-list';
    const paint = () => {
      const query = search.value.trim().toLowerCase();
      list.replaceChildren();
      for (const [label, fn] of items) {
        if (query && !label.toLowerCase().includes(query)) continue;
        const button = E('button', label);
        button.type = 'button';
        button.onclick = fn;
        list.append(button);
      }
      if (!list.childElementCount) list.append(E('p', 'No matching features'));
    };
    search.oninput = paint;
    paint();
    body.append(search, list);
    moreDialog.append(head, body);
    if (!moreDialog.open) moreDialog.showModal();
  }

  function card(title, copy, onClick, {pro = false} = {}) {
    const button = E('button');
    button.type = 'button';
    button.className = 'iv-cta' + (pro ? ' is-pro' : '');
    const heading = E('strong', title);
    const line = E('span', copy);
    button.append(heading, line);
    if (pro) button.append(E('em', 'Pro'));
    button.onclick = onClick;
    return button;
  }
  function render() {
    applyChrome();
    root.replaceChildren();
    if (view === 'home') root.append(homeView());
    else if (view === 'record') root.append(recordView());
    else if (view === 'tune') root.append(tuneView());
    else if (view === 'mix') root.append(mixView());
    else if (view === 'export') root.append(exportView());
    else if (view === 'subscribe') root.append(subscribeView());
    syncClock();
    paintCoach();
    for (const button of nav.querySelectorAll('button')) button.classList.toggle('is-current', button.dataset.view === view);
  }
  function homeView() {
    const screen = E('div');
    screen.className = 'iv-screen';
    const kicker = E('p', 'Create');
    kicker.className = 'iv-kicker';
    screen.append(kicker, checklist());
    const grid = E('div');
    grid.className = 'iv-cta-grid';
    for (const action of BASIC_ACTIONS) grid.append(card(action.title, action.copy, () => runAction(action.run)));
    for (const action of PRO_ACTIONS) {
      grid.append(card(action.title, action.copy, () => action.id === 'isolate' ? openAi('isolate') : runAction('exportStems'), {pro:true}));
    }
    const note = E('p', 'Sounds good fast — tweak later in Studio');
    note.className = 'iv-note';
    const open = E('button', 'Open full Studio');
    open.type = 'button';
    open.className = 'primary iv-wide';
    open.onclick = () => setMode('studio');
    screen.append(grid, note, open);
    return screen;
  }
  function checklist() {
    const box = E('div');
    box.className = 'iv-checklist';
    if (allDone()) {
      const done = E('button', 'Tour complete — open Studio for advanced.');
      done.type = 'button';
      done.className = 'iv-tour-done';
      done.onclick = () => setMode('studio');
      box.append(done);
      return box;
    }
    const list = E('div');
    list.className = 'iv-checks';
    for (const item of CHECKS) {
      const button = E('button', item.label);
      button.type = 'button';
      button.setAttribute('aria-pressed', checks[item.id] ? 'true' : 'false');
      const mark = E('span', checks[item.id] ? '✓' : '');
      mark.className = 'iv-box';
      mark.setAttribute('aria-hidden', 'true');
      button.prepend(mark);
      button.onclick = () => showView(item.id);
      list.append(button);
    }
    box.append(list);
    return box;
  }
  function recordView() {
    const screen = E('div');
    screen.className = 'iv-screen';
    screen.append(E('h2', 'Record'));
    const rec = E('button', 'Record a take');
    rec.type = 'button';
    rec.id = 'ivRecordButton';
    rec.className = 'primary iv-rec';
    rec.onclick = () => runAction('recordTake');
    const clock = E('p', '0:00.00');
    clock.id = 'ivClock';
    clock.className = 'iv-clock';
    const loop = E('button', 'Loop');
    loop.type = 'button';
    loop.id = 'ivLoop';
    loop.className = 'iv-pill';
    loop.onclick = () => {
      const input = document.getElementById('loop');
      if (!input) return;
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change'));
      loop.setAttribute('aria-pressed', input.checked ? 'true' : 'false');
      loop.classList.toggle('is-on', input.checked);
    };
    screen.append(rec, clock, loop);
    return screen;
  }
  function tuneView() {
    const screen = E('div');
    screen.className = 'iv-screen';
    screen.append(E('h2', 'Tune'));
    const grid = E('div');
    grid.className = 'iv-cta-grid';
    grid.append(card('Auto-Tune', 'Clean pitch, still sounds like you', () => runAction('autoTune')));
    grid.append(card('Lock to Beat', 'Nudge timing to the pocket', () => runAction('lockBeat')));
    grid.append(card('AI Auto-Tune', 'Clean pitch, still sounds like you', () => openAi('ai-tune'), {pro:true}));
    grid.append(card('AI Beat-Lock', 'Nudge timing to the pocket', () => openAi('ai-beat'), {pro:true}));
    const advanced = E('button', 'Advanced tune');
    advanced.type = 'button';
    advanced.className = 'ghost iv-wide';
    advanced.onclick = () => openAdvanced('tune');
    screen.append(grid, advanced);
    return screen;
  }
  function mixView() {
    const screen = E('div');
    screen.className = 'iv-screen';
    screen.append(E('h2', 'Mix'));
    const grid = E('div');
    grid.className = 'iv-cta-grid';
    grid.append(card('Smart Mix + Master', 'Radio-ready loudness, fast', () => runAction('smartMix')));
    grid.append(card('AI Mix / Master', 'Radio-ready loudness, fast', () => openAi('ai-mix'), {pro:true}));
    const mixer = E('button', 'Open mixer');
    mixer.type = 'button';
    mixer.className = 'ghost iv-wide';
    mixer.onclick = () => openAdvanced('mixer');
    screen.append(grid, mixer);
    return screen;
  }
  function exportView() {
    const screen = E('div');
    screen.className = 'iv-screen';
    screen.append(E('h2', 'Export'));
    const wav = E('button', 'Export WAV');
    wav.type = 'button';
    wav.id = 'ivExportWav';
    wav.className = 'primary iv-wide';
    wav.onclick = () => runAction('exportWav');
    const mp3 = E('button', 'Export MP3');
    mp3.type = 'button';
    mp3.className = 'iv-wide';
    mp3.onclick = exportMp3;
    screen.append(wav, mp3, card('Export stems', 'Every track as WAV', () => runAction('exportStems'), {pro:true}));
    return screen;
  }
  function subscribeView() {
    const screen = E('div');
    screen.className = 'iv-screen';
    const kicker = E('p', 'Plans');
    kicker.className = 'iv-kicker';
    screen.append(kicker, E('h2', 'Basic and Pro'));
    const plans = E('div');
    plans.className = 'iv-plans';
    plans.append(planCard('basic', 'Basic', '$20', ['Core studio — record, arrange, classic FX', 'Auto-Tune, Lock to Beat, Smart Mix', 'Export master WAV / MP3']));
    plans.append(planCard('pro', 'Pro', '$40', PRO_FEATURES.map(feature => feature.name)));
    screen.append(plans);
    if (!showStripe) {
      const meta = E('p', 'Pro on web/desktop');
      meta.className = 'iv-sheet-meta';
      const link = E('button', 'Pro on web/desktop');
      link.type = 'button';
      link.className = 'ghost iv-wide';
      link.onclick = () => openWeb();
      screen.append(meta, link);
    }
    const manage = E('button', 'Manage');
    manage.type = 'button';
    manage.className = 'ghost iv-wide';
    manage.onclick = () => openWeb();
    if (showStripe) screen.append(manage);
    return screen;
  }
  function planCard(id, title, price, lines) {
    const current = tier() === id || (id === 'basic' && tier() === 'basic');
    const article = E('article');
    article.className = 'iv-plan' + (id === 'basic' ? ' is-raised' : '') + (id === 'pro' && tier() !== 'pro' ? ' is-featured' : '');
    article.append(E('h3', title), E('p', price));
    const list = E('ul');
    for (const line of lines) list.append(E('li', line));
    article.append(list);
    if (current && tier() !== 'none') {
      const button = E('button', 'Current plan');
      button.type = 'button';
      button.disabled = true;
      article.append(button);
    } else if (showStripe && id === 'pro') {
      const button = E('button', 'Get Pro — $40');
      button.type = 'button';
      button.className = 'primary';
      button.onclick = () => openWeb();
      article.append(button);
    } else if (showStripe && id === 'basic') {
      const button = E('button', 'Get Basic — $20');
      button.type = 'button';
      button.onclick = () => openWeb();
      article.append(button);
    }
    return article;
  }

  function openCoach(step) {
    if (!surfaceReady()) { mode = 'create'; saveMode(); }
    coachStep = Math.max(0, Math.min(COACH.length - 1, step));
    coachOpen = true;
    view = COACH[coachStep].id;
    mode = 'create';
    saveMode();
    dontAgain = false;
    render();
  }
  function closeCoach(persist) {
    coachOpen = false;
    if (persist || dontAgain) localStorage.setItem(storageKey('coach'), 'hidden');
    coach.hidden = true;
    document.querySelectorAll('.iv-spotlight').forEach(node => node.classList.remove('iv-spotlight'));
  }
  function paintCoach() {
    document.querySelectorAll('.iv-spotlight').forEach(node => node.classList.remove('iv-spotlight'));
    if (!coachOpen) { coach.hidden = true; return; }
    coach.hidden = false;
    const step = COACH[coachStep];
    coach.replaceChildren();
    const scrim = E('div');
    scrim.className = 'iv-coach-scrim';
    const card = E('aside');
    card.className = 'iv-coach-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-labelledby', 'ivCoachTitle');
    const dots = E('div');
    dots.className = 'iv-dots';
    COACH.forEach((item, index) => {
      const dot = E('button', String(index + 1));
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Step ' + (index + 1));
      if (index === coachStep) dot.setAttribute('aria-current', 'step');
      dot.onclick = () => openCoach(index);
      dots.append(dot);
    });
    const title = E('h2', step.title);
    title.id = 'ivCoachTitle';
    const go = E('button', step.cta);
    go.type = 'button';
    go.className = 'primary iv-wide';
    go.onclick = () => {
      if (step.id === 'record') runAction('recordTake');
      else if (step.id === 'tune') runAction('autoTune');
      else if (step.id === 'mix') runAction('smartMix');
      else runAction('exportWav');
    };
    const navRow = E('div');
    navRow.className = 'iv-coach-nav';
    const back = E('button', 'Back');
    back.type = 'button';
    back.disabled = coachStep === 0;
    back.onclick = () => openCoach(coachStep - 1);
    const skip = E('button', 'Skip tour');
    skip.type = 'button';
    skip.className = 'ghost';
    skip.hidden = coachStep === COACH.length - 1;
    skip.onclick = () => { coachSkipped = true; closeCoach(false); };
    const next = E('button', coachStep === COACH.length - 1 ? 'Done' : 'Next');
    next.type = 'button';
    next.onclick = () => {
      if (coachStep === COACH.length - 1) { coachSkipped = true; closeCoach(false); }
      else openCoach(coachStep + 1);
    };
    navRow.append(back, skip, next);
    card.append(dots, title, E('p', step.body), go, navRow);
    if (coachStep === COACH.length - 1) {
      const label = E('label');
      label.className = 'iv-coach-again';
      const input = E('input');
      input.type = 'checkbox';
      input.checked = dontAgain;
      input.onchange = () => { dontAgain = input.checked; };
      label.append(input, document.createTextNode("Don't show again"));
      card.append(label);
    }
    coach.append(scrim, card);
    const target = step.id === 'record' ? document.getElementById('ivRecordButton')
      : step.id === 'export' ? document.getElementById('ivExportWav')
      : root.querySelector('.iv-cta');
    target?.classList.add('iv-spotlight');
  }
  function maybeCoach() {
    if (coachOpen || coachSkipped || dismissed() || allDone() || mode !== 'create' || !surfaceReady()) return;
    const guide = document.getElementById('guideDialog');
    if (guide?.open) {
      guide.addEventListener('close', () => maybeCoach(), {once:true});
      return;
    }
    openCoach(0);
  }
  function syncClock() {
    clearInterval(clockTimer);
    if (view !== 'record') return;
    const tick = () => {
      const node = document.getElementById('ivClock');
      if (!node) return;
      const clock = document.getElementById('clock')?.textContent || document.getElementById('seconds')?.textContent || '0:00.00';
      const seconds = document.getElementById('seconds')?.textContent || '';
      node.textContent = seconds && clock !== seconds ? clock + ' · ' + seconds : clock;
      const loop = document.getElementById('ivLoop');
      const input = document.getElementById('loop');
      if (loop && input) {
        loop.setAttribute('aria-pressed', input.checked ? 'true' : 'false');
        loop.classList.toggle('is-on', input.checked);
      }
    };
    tick();
    clockTimer = setInterval(tick, 250);
  }
  function guardedFeature(button) {
    if (!button || button.closest('#ivCreate, #ivCoach, #ivLockSheet, #ivMoreSheet, #ivToast, .iv-rail, #ivCreateNav')) return '';
    return button.id === 'exportStem' ? 'stems' : (GUARDS[button.textContent.trim()] || '');
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    const feature = guardedFeature(button);
    if (!feature || allowed(feature)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openLock(feature);
  }, true);
  function sync() {
    const previous = accountKey;
    loadAccount();
    if (accountKey !== previous && previous) {
      /* loadAccount already read the new account's mode and checklist. */
    }
    applyChrome();
    render();
    maybeCoach();
  }

  const recordButton = document.getElementById('record');
  let wasRecording = false;
  if (recordButton) {
    new MutationObserver(() => {
      const on = recordButton.classList.contains('active');
      if (wasRecording && !on) { checks.record = true; saveChecks(); render(); }
      wasRecording = on;
    }).observe(recordButton, {attributes:true, attributeFilter:['class']});
  }
  const watch = document.getElementById('appShell') || document.getElementById('studioShell');
  if (watch) {
    new MutationObserver(() => {
      const user = window.ivStudioBridge?.currentUser?.() || {};
      const next = String(user.userId || user.id || user.email || 'device');
      if (next !== accountKey) { sync(); return; }
      applyChrome();
      if (surfaceReady()) maybeCoach();
    }).observe(watch, {attributes:true, attributeFilter:['hidden']});
  }
  const badge = document.getElementById('accessBadge');
  if (badge) {
    new MutationObserver(() => {
      const user = window.ivStudioBridge?.currentUser?.() || {};
      const next = String(user.userId || user.id || user.email || 'device');
      if (next !== accountKey) sync();
    }).observe(badge, {childList:true, characterData:true, subtree:true});
  }
  const guide = document.getElementById('guideDialog');
  if (guide) {
    guide.addEventListener('close', () => maybeCoach());
    new MutationObserver(() => { if (guide.open && coachOpen) { coachOpen = false; coach.hidden = true; } }).observe(guide, {attributes:true});
  }
  document.addEventListener('iv-bridge', () => sync());
  if (location.hash === '#mp3') view = 'export';
  loadAccount();
  render();
  maybeCoach();
  return {setMode, openCoach, openLock, tier, allowed};
}
