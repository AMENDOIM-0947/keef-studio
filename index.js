(function () {
  'use strict';

  const ID = 'keef-studio-v25';
  const USERNAME = 'AMENDOIM-0947';
  const REPO = 'keef-studio';

  const existingInstance = document.getElementById(ID);
  if (existingInstance) {
    existingInstance.style.display = (existingInstance.style.display === 'none') ? 'flex' : 'none';
    return;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

  let copyUnlockAtivo = true;
  let loopAtivo = false;
  let lerImagensAtivo = true;
  let siteAvancaSozinho = false;
  let modoRedacaoAuto = true;
  let currentKeyIndex = 0;
  let lastQuestionSig = '';

  const LK = 'keef_api_keys', LU = 'keef_endpoint_url', LM = 'keef_model', LE = 'keef_expansions', LP = 'keef_proxy_url';
  const defaultExp = '/resp=Responda de forma objetiva.\n/red=Escreva uma redação completa com introdução, desenvolvimento e conclusão.';
  const expansionsRaw = localStorage.getItem(LE) || defaultExp;

  const cssPath = `https://cdn.jsdelivr.net/gh/${USERNAME}/${REPO}@main/styles.css`;
  if (!document.getElementById(ID + '-css')) {
    const link = document.createElement('link');
    link.id = ID + '-css';
    link.rel = 'stylesheet';
    link.href = cssPath + '?v=' + Date.now();
    document.head.appendChild(link);
  }

  // --- DESBLOQUEIOS E DESATIVAÇÃO DE ANTI-TRAPAÇA ---
  (function injectBypasses() {
    try {
      Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      if (typeof document.hasFocus === 'function') {
        document.hasFocus = () => true;
      }
    } catch (e) {}

    const eventsToBlock = ['visibilitychange', 'webkitvisibilitychange', 'blur', 'mouseleave'];
    eventsToBlock.forEach(evt => {
      window.addEventListener(evt, e => e.stopImmediatePropagation(), true);
    });

    ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart', 'ondragstart'].forEach(p => {
      try {
        document[p] = null;
        if (document.body) document.body[p] = null;
        window[p] = null;
      } catch (e) {}
    });

    ['copy', 'cut', 'paste', 'contextmenu', 'selectstart'].forEach(evt => {
      window.addEventListener(evt, e => {
        if (!copyUnlockAtivo) return;
        if (e.target && e.target.closest && e.target.closest('#' + ID)) return;
        e.stopPropagation();
      }, true);
    });
  })();

  const sk = localStorage.getItem(LK) || '';
  const su = localStorage.getItem(LU) || 'https://generativelanguage.googleapis.com/v1beta/models/';
  const sm = localStorage.getItem(LM) || 'gemini-1.5-flash';
  const sp = localStorage.getItem(LP) || '';

  // --- INTERFACE DE USUÁRIO (UI) ---
  const animEl = document.createElement('div');
  animEl.id = 'keef-overlay-anim';
  animEl.innerHTML = '<span>⚡ ANALISANDO QUESTÃO E IMAGENS...</span>';
  (document.body || document.documentElement).appendChild(animEl);

  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'keef-toggle-btn';
  toggleBtn.className = isMobile ? 'mobile-toggle' : '';
  toggleBtn.innerHTML = '&#9830;';
  (document.body || document.documentElement).appendChild(toggleBtn);

  const el = document.createElement('div');
  el.id = ID;
  el.className = isMobile ? 'keef-mobile-sheet' : 'keef-desktop-card';

  el.innerHTML = `
    <div class="hdr">
      <div class="title">
        <span>&#9830;</span> KEEF STUDIO 
        <span class="badge">${isMobile ? 'MOBILE v25.0' : 'v25.0 ULTRA'}</span>
      </div>
      <button class="close" data-act="close">&#10005;</button>
    </div>
    <div class="tabs">
      <div class="tab active" data-tab="ask">Analisador</div>
      <div class="tab" data-tab="exp">Expansão</div>
      <div class="tab" data-tab="cred">Sobre</div>
      <div class="tab" data-tab="cfg">Config</div>
    </div>
    <div class="body">
      <div class="panel active" data-panel="ask">
        <div class="token-info">⚡ Engine Completa | OCR + IA + Auto-Fill</div>
        <div class="tgl"><span>Detector Redação/Título</span><button class="tgl-btn on" id="k-essay">ATIVO</button></div>
        <div class="tgl"><span>Leitura de Imagens (Vision)</span><button class="tgl-btn on" id="k-vis">ATIVO</button></div>
        <div class="tgl"><span>Avançar Automático</span><button class="tgl-btn" id="k-adv">DESATIVADO</button></div>
        <label>Instrução Personalizada</label>
        <textarea rows="2" id="k-prompt">Responda a questão/redação com precisão.</textarea>
        <div class="row">
          <button class="btn-p" data-act="ask">&#9889; Resolver Questão</button>
          <button class="btn-loop" data-act="loop">&#9654; Auto-Loop</button>
        </div>
        <div class="st"></div>
        <div class="ans" style="display:none"></div>
      </div>
      <div class="panel" data-panel="exp">
        <label>Gatilhos de Expansão (gatilho=expansão)</label>
        <textarea rows="4" id="k-exp-in"></textarea>
        <button class="btn-p" id="k-exp-save">Salvar Regras</button>
        <div class="st"></div>
      </div>
      <div class="panel" data-panel="cred">
        <div class="about-card">
          <div style="font-weight:800;font-size:14px;color:#fff">KEEF STUDIO ULTRA</div>
          <div style="font-size:10px;color:#38bdf8;margin:4px 0 8px">GitHub Live Sync & Universal Injector</div>
          <p style="font-size:10px;color:#94a3b8;line-height:1.4">Suporte total a OCR por Base64, rotação automática de API Keys e bypass de proteções em tempo real.</p>
        </div>
      </div>
      <div class="panel" data-panel="cfg">
        <label>API Keys Gemini (separadas por vírgula)</label>
        <textarea rows="2" data-f="key" placeholder="AIzaSy..."></textarea>
        <button class="btn-s" id="k-paste-key" style="width:100%;margin-bottom:8px">&#128203; Colar Key da Área de Transferência</button>
        <label>CORS Proxy (Opcional)</label>
        <input type="text" data-f="proxy" placeholder="https://cors-proxy.org/">
        <label>Endpoint</label>
        <input type="text" data-f="url">
        <label>Modelo</label>
        <input type="text" data-f="model">
        <button class="btn-s" data-act="save" style="width:100%">Salvar Configurações</button>
        <div class="st"></div>
      </div>
    </div>
  `;

  (document.body || document.documentElement).appendChild(el);

  el.querySelector('[data-f="url"]').value = su;
  el.querySelector('[data-f="key"]').value = sk;
  el.querySelector('[data-f="model"]').value = sm;
  el.querySelector('[data-f="proxy"]').value = sp;
  el.querySelector('#k-exp-in').value = expansionsRaw;

  function q(s) { return el.querySelector(s); }
  function ss(p, m, err) {
    const s = el.querySelector('[data-panel="' + p + '"] .st');
    if (s) {
      s.textContent = m || '';
      s.className = 'st' + (err ? ' err' : '');
    }
  }
  function showAnim(v) { animEl.style.display = v ? 'flex' : 'none'; }
  function getKeys() { return (localStorage.getItem(LK) || '').split(',').map(k => k.trim()).filter(k => k.length > 0); }

  q('#k-paste-key').addEventListener('click', async () => {
    let keyVal = '';
    try { if (navigator.clipboard && navigator.clipboard.readText) keyVal = await navigator.clipboard.readText(); } catch (e) {}
    const inputKey = window.prompt("COLE SUA API KEY ABAIXO:", keyVal || "");
    if (inputKey && inputKey.trim()) {
      const cur = q('[data-f="key"]').value.trim();
      const nv = cur ? (inputKey.trim() + ',' + cur) : inputKey.trim();
      q('[data-f="key"]').value = nv;
      localStorage.setItem(LK, nv);
      ss('cfg', '✔ Key Salva!', false);
    }
  });

  toggleBtn.addEventListener('click', () => {
    el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
  });

  const keyHandler = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
      e.preventDefault();
      el.style.display = (el.style.display === 'none') ? 'flex' : 'none';
    }
  };
  document.addEventListener('keydown', keyHandler);

  const btnEssay = q('#k-essay');
  btnEssay.addEventListener('click', () => {
    modoRedacaoAuto = !modoRedacaoAuto;
    btnEssay.textContent = modoRedacaoAuto ? 'ATIVO' : 'DESATIVADO';
    btnEssay.className = 'tgl-btn ' + (modoRedacaoAuto ? 'on' : '');
  });

  const btnVision = q('#k-vis');
  btnVision.addEventListener('click', () => {
    lerImagensAtivo = !lerImagensAtivo;
    btnVision.textContent = lerImagensAtivo ? 'ATIVO' : 'DESATIVADO';
    btnVision.className = 'tgl-btn ' + (lerImagensAtivo ? 'on' : '');
  });

  const btnAutoAdv = q('#k-adv');
  btnAutoAdv.addEventListener('click', () => {
    siteAvancaSozinho = !siteAvancaSozinho;
    btnAutoAdv.textContent = siteAvancaSozinho ? 'ATIVO' : 'DESATIVADO';
    btnAutoAdv.className = 'tgl-btn ' + (siteAvancaSozinho ? 'on' : '');
  });

  function getExpansionsMap() {
    const raw = q('#k-exp-in').value || '';
    const map = {};
    raw.split('\n').forEach(l => {
      const p = l.split('=');
      if (p.length >= 2) {
        const tr = p[0].trim(), ex = p.slice(1).join('=').trim();
        if (tr) map[tr] = ex;
      }
    });
    return map;
  }

  function applyExpansions(t) {
    if (!t) return t;
    const m = getExpansionsMap();
    Object.keys(m).forEach(tr => { if (tr) t = t.split(tr).join(m[tr]); });
    return t;
  }

  q('#k-exp-save').addEventListener('click', () => {
    localStorage.setItem(LE, q('#k-exp-in').value);
    ss('exp', '✔ Regras salvas!', false);
  });

  el.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      el.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      el.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      t.classList.add('active');
      el.querySelector('[data-panel="' + t.dataset.tab + '"]').classList.add('active');
    });
  });

  q('[data-act="close"]').addEventListener('click', () => {
    loopAtivo = false;
    showAnim(false);
    document.removeEventListener('keydown', keyHandler);
    el.remove();
    animEl.remove();
    toggleBtn.remove();
  });

  if (!isMobile) {
    let dg = false, ox = 0, oy = 0;
    const h = q('.hdr');
    h.addEventListener('mousedown', e => {
      dg = true;
      const r = el.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      el.style.left = r.left + 'px';
      el.style.top = r.top + 'px';
      el.style.right = 'auto';
    });
    document.addEventListener('mousemove', e => {
      if (dg) {
        el.style.left = (e.clientX - ox) + 'px';
        el.style.top = (e.clientY - oy) + 'px';
      }
    });
    document.addEventListener('mouseup', () => { dg = false; });
  }

  q('[data-act="save"]').addEventListener('click', () => {
    localStorage.setItem(LU, q('[data-f="url"]').value.trim());
    localStorage.setItem(LK, q('[data-f="key"]').value.trim());
    localStorage.setItem(LM, q('[data-f="model"]').value.trim());
    localStorage.setItem(LP, q('[data-f="proxy"]').value.trim());
    currentKeyIndex = 0;
    ss('cfg', '✔ Configurações salvas!', false);
  });

  // --- CAPTURA DE IMAGENS (VISION / BASE64) ---
  async function extractImagesParts() {
    if (!lerImagensAtivo) return [];
    const parts = [];
    const target = document.querySelector('.questao.active, .question.active, [class*="questao"], [class*="question"], article, main, form') || document.body;
    const imgs = Array.from(target.querySelectorAll('img')).filter(img => img.offsetWidth > 50 && img.offsetHeight > 50);

    for (let i = 0; i < Math.min(imgs.length, 3); i++) {
      const img = imgs[i];
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.offsetWidth;
        canvas.height = img.naturalHeight || img.offsetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];
        if (base64Data) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          });
        }
      } catch (e) {}
    }
    return parts;
  }

  function getQuestionSignature() {
    return (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  function extractMinimalPageText() {
    const target = document.querySelector('.questao.active, .question.active, [class*="questao"], [class*="question"], article, main, form') || document.body;
    const clone = target.cloneNode(true);
    const bads = clone.querySelectorAll('script, style, nav, header, footer, #' + ID + ', [id^="keef"]');
    bads.forEach(b => b.remove());
    return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 1800);
  }

  function triggerFullClick(elItem) {
    if (!elItem) return;
    try { elItem.scrollIntoView({ behavior: 'auto', block: 'center' }); } catch (e) {}
    ['touchstart', 'touchend', 'pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'change', 'input'].forEach(ev => {
      try {
        const evt = (ev === 'change' || ev === 'input') ? new Event(ev, { bubbles: true }) : new MouseEvent(ev, { bubbles: true, cancelable: true, view: window });
        elItem.dispatchEvent(evt);
      } catch (err) {}
    });
    if (elItem.tagName === 'INPUT' && (elItem.type === 'radio' || elItem.type === 'checkbox')) {
      try {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
        if (nativeSetter && nativeSetter.set) nativeSetter.set.call(elItem, true);
        else elItem.checked = true;
        elItem.dispatchEvent(new Event('change', { bubbles: true }));
        elItem.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {}
    }
  }

  function isSafeButton(elItem) {
    if (!elItem || !elItem.tagName) return false;
    if (elItem.closest && elItem.closest('#' + ID)) return false;
    const txt = (elItem.innerText || elItem.textContent || elItem.value || '').toLowerCase().trim();
    const cls = (elItem.className || '').toString().toLowerCase();
    const id = (elItem.id || '').toLowerCase();
    const href = (elItem.getAttribute('href') || '').toLowerCase();
    const bad = ['sair', 'logout', 'logoff', 'voltar', 'home', 'inicio', 'dashboard', 'cancelar', 'fechar', 'menu', 'perfil', 'login'];
    for (let i = 0; i < bad.length; i++) {
      if (txt === bad[i] || cls.includes(bad[i]) || id.includes(bad[i]) || href.includes(bad[i])) return false;
    }
    if (elItem.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      try {
        const u = new URL(elItem.href, location.href);
        if (u.hostname !== location.hostname || u.pathname !== location.pathname) return false;
      } catch (e) { return false; }
    }
    return true;
  }

  // --- SIMULADOR DE DIGITAÇÃO HUMANA ---
  async function simularDigitacaoHumana(campo, texto) {
    if (!campo || !texto) return;
    try { campo.focus(); } catch (e) {}
    let val = '';
    const tag = (campo.tagName || '').toUpperCase();
    const nSetter = (tag === 'INPUT') ? (Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set) : (Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set);
    let i = 0;
    while (i < texto.length) {
      const chunk = texto.slice(i, i + 6);
      val += chunk;
      i += 6;
      if (campo.isContentEditable) campo.innerText = val;
      else if (nSetter) nSetter.call(campo, val);
      else campo.value = val;
      try { campo.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: chunk })); } catch (e) {
        campo.dispatchEvent(new Event('input', { bubbles: true }));
      }
      campo.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 5));
    }
  }

  async function preencherRedacao(titulo, texto) {
    if (!texto && !titulo) return false;
    texto = applyExpansions(texto || '');
    titulo = applyExpansions(titulo || '');
    const nodes = Array.from(document.querySelectorAll('*'));
    let preenchido = false;

    if (titulo) {
      for (let k = 0; k < nodes.length; k++) {
        const elItem = nodes[k];
        if (elItem.closest && elItem.closest('#' + ID)) continue;
        const tag = (elItem.tagName || '').toUpperCase();
        const id = (elItem.id || '').toLowerCase();
        if (tag === 'INPUT' && (id.includes('titul') || id.includes('title'))) {
          await simularDigitacaoHumana(elItem, titulo);
          preenchido = true;
          break;
        }
      }
    }

    const corpo = texto || titulo;
    if (corpo) {
      for (let i = 0; i < nodes.length; i++) {
        const c = nodes[i];
        if (!c || (c.closest && c.closest('#' + ID))) continue;
        const t = (c.tagName || '').toUpperCase();
        const isEd = c.isContentEditable || t === 'TEXTAREA' || (t === 'INPUT' && (c.type === 'text' || !c.type));
        if (isEd && c.offsetWidth > 0 && c.offsetHeight > 0) {
          c.scrollIntoView({ behavior: 'auto', block: 'center' });
          await simularDigitacaoHumana(c, corpo);
          preenchido = true;
          break;
        }
      }
    }
    return preenchido;
  }

  // --- SELEÇÃO INTELIGENTE DE ALTERNATIVAS ---
  function selecionarECircular(textoAlvo, letraAlvo) {
    if (!textoAlvo && !letraAlvo) return false;
    const targetText = (textoAlvo || '').trim().toLowerCase();
    const targetLetter = (letraAlvo || '').trim().toUpperCase();

    const candidateSelectors = [
      'input[type="radio"]',
      'input[type="checkbox"]',
      'label',
      '[role="radio"]',
      '[role="checkbox"]',
      '[role="option"]',
      'li',
      'button',
      'div[class*="option"]',
      'div[class*="alternativa"]',
      'div[class*="choice"]',
      'div[class*="answer"]',
      'div[class*="resposta"]',
      'span[class*="option"]',
      'p[class*="option"]'
    ];
    const elements = Array.from(document.querySelectorAll(candidateSelectors.join(',')));
    let matchFound = false;

    for (let i = 0; i < elements.length; i++) {
      const elItem = elements[i];
      if (!elItem || (elItem.closest && elItem.closest('#' + ID))) continue;
      const txt = (elItem.innerText || elItem.textContent || elItem.value || '').trim();
      if (!txt) continue;
      const cleanTxt = txt.toLowerCase();

      let isLetterMatch = false;
      if (targetLetter) {
        const letterRegex = new RegExp('^\\s*[\\(\\[]?' + targetLetter + '[\\)\\.\\º\\s\\-:]', 'i');
        isLetterMatch = letterRegex.test(txt);
      }

      let isTextMatch = false;
      if (targetText && targetText.length >= 2) {
        const cleanTarget = targetText.replace(/^[a-eA-E][\.\)\s\-:]+/, '').trim();
        isTextMatch = cleanTxt.includes(targetText) || 
                      (cleanTarget.length >= 3 && cleanTxt.includes(cleanTarget)) || 
                      (cleanTxt.length > 3 && targetText.includes(cleanTxt));
      }

      if (isLetterMatch || isTextMatch) {
        matchFound = true;
        triggerFullClick(elItem);
        
        const highlightEl = (elItem.tagName === 'INPUT' && elItem.parentElement) ? elItem.parentElement : elItem;
        highlightEl.style.outline = '3px solid #a855f7';
        highlightEl.style.boxShadow = '0 0 16px rgba(168,85,247,0.9)';
        highlightEl.style.borderRadius = '6px';
        
        if (elItem.tagName === 'INPUT') {
          const parentLabel = elItem.closest('label') || document.querySelector('label[for="' + elItem.id + '"]');
          if (parentLabel) triggerFullClick(parentLabel);
        }
        break;
      }
    }
    return matchFound;
  }

  function clicarProximo() {
    const nodes = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'));
    const keys = ['próxim', 'proxim', 'avançar', 'avancar', 'enviar', 'submit', 'next', 'conclu', 'responder'];
    for (let i = 0; i < nodes.length; i++) {
      const btn = nodes[i];
      if (!isSafeButton(btn)) continue;
      const txt = (btn.innerText || btn.textContent || btn.value || '').toLowerCase().trim();
      const cls = (btn.className || '').toString().toLowerCase();
      const matches = keys.some(k => txt.includes(k) || cls.includes(k));
      if (matches && btn.offsetWidth > 0 && btn.offsetHeight > 0) {
        triggerFullClick(btn);
        return true;
      }
    }
    return false;
  }

  function buildRequestObj(baseUrl, apiKey, model, proxyPrefix, partsArray) {
    let fu = baseUrl.replace(/\/+$/, '');
    const modelTarget = model || 'gemini-1.5-flash';
    if (fu.indexOf(':generateContent') === -1) {
      if (fu.endsWith('/models')) fu += '/' + modelTarget + ':generateContent';
      else if (fu.includes('/models/')) fu += ':generateContent';
      else fu += '/' + modelTarget + ':generateContent';
    }
    let targetUrl = fu + '?key=' + encodeURIComponent(apiKey);
    if (proxyPrefix && proxyPrefix.trim()) targetUrl = proxyPrefix.trim() + encodeURI(targetUrl);
    return {
      url: targetUrl,
      headers: { 'Content-Type': 'application/json' },
      body: { contents: [{ parts: partsArray }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 512 } }
    };
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs || 8000);
    const opts = Object.assign({}, options, { signal: controller.signal });
    try {
      const res = await fetch(url, opts);
      clearTimeout(id);
      return res;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  // --- ENGINE PRINCIPAL DE RESOLUÇÃO ---
  async function ra() {
    const btn = q('[data-act="ask"]'), ans = q('.ans');
    btn.disabled = true;
    showAnim(true);
    ss('ask', '', false);
    try {
      const u = localStorage.getItem(LU) || 'https://generativelanguage.googleapis.com/v1beta/models/';
      const m = localStorage.getItem(LM) || 'gemini-1.5-flash';
      const p = localStorage.getItem(LP) || '';
      let qs = q('#k-prompt').value.trim();
      qs = applyExpansions(qs);
      const keys = getKeys();
      if (keys.length === 0) { ss('ask', '⚠ Cadastre a API Key na aba Config!', true); return false; }

      const pageTxt = extractMinimalPageText();
      const imageParts = await extractImagesParts();
      
      const promptText = 'Questão:\n' + pageTxt + '\nInstrução:' + qs + '\nResponda estritamente neste formato JSON:{"eh_redacao":false,"titulo":"","redacao":"","letra":"A","texto_alternativa":"texto exato da opção selecionada","explicacao":""}';
      
      const partsArray = [{ text: promptText }, ...imageParts];

      let rp, lastEt, sucesso = false;
      for (let attempt = 0; attempt < keys.length; attempt++) {
        const currentKey = keys[currentKeyIndex];
        const rq = buildRequestObj(u, currentKey, m, p, partsArray);
        try {
          rp = await fetchWithTimeout(rq.url, { method: 'POST', headers: rq.headers, body: JSON.stringify(rq.body) }, 8000);
          if (rp.ok) { sucesso = true; break; }
        } catch (e) {
          lastEt = e.message;
          currentKeyIndex = (currentKeyIndex + 1) % keys.length;
          continue;
        }
      }

      if (!sucesso) throw new Error('Erro API/Key: ' + (lastEt || 'Falha na requisição').slice(0, 60));
      const dt = await rp.json();
      let rawText = (dt.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawText = jsonMatch[0];

      let parsed;
      try { parsed = JSON.parse(rawText); } catch (e) { parsed = { eh_redacao: false, texto_alternativa: rawText, explicacao: '' }; }

      let outMsg = '';
      if (modoRedacaoAuto && (parsed.eh_redacao || parsed.redacao)) {
        const pre = await preencherRedacao(parsed.titulo, parsed.redacao);
        ans.innerHTML = (parsed.titulo ? '<b>Título:</b> ' + parsed.titulo + '<br><br>' : '') + (parsed.redacao || '');
        ans.style.display = 'block';
        ss('ask', pre ? '✔ Redação Preenchida!' : '⚠ Redação Gerada', false);
        return true;
      }

      const mFound = selecionarECircular(parsed.texto_alternativa, parsed.letra);
      if (parsed.letra || parsed.texto_alternativa) {
        outMsg += '<b>Resp:</b> ' + (parsed.letra ? parsed.letra + ' - ' : '') + (parsed.texto_alternativa || '');
      }
      ans.innerHTML = outMsg || rawText;
      ans.style.display = 'block';
      ss('ask', mFound ? '✔ Alternativa Selecionada!' : '⚠ Resposta no Painel', false);
      return true;

    } catch (err) {
      ss('ask', '✖ ' + err.message, true);
      return false;
    } finally {
      btn.disabled = false;
      if (!loopAtivo) showAnim(false);
    }
  }

  async function iniciarLoop() {
    while (loopAtivo) {
      const sigBefore = getQuestionSignature();
      if (lastQuestionSig && sigBefore === lastQuestionSig) {
        ss('ask', '⚠ Aguardando mudança...', true);
        await new Promise(r => setTimeout(r, 800));
        if (!loopAtivo) break;
      }
      const ok = await ra();
      if (!ok) { loopAtivo = false; showAnim(false); break; }
      lastQuestionSig = sigBefore;
      await new Promise(r => setTimeout(r, 400));
      if (!siteAvancaSozinho) clicarProximo();
      await new Promise(r => setTimeout(r, 800));
    }
  }

  q('[data-act="ask"]').addEventListener('click', () => { ra(); });
  q('[data-act="loop"]').addEventListener('click', () => {
    if (loopAtivo) {
      loopAtivo = false;
      showAnim(false);
      const btn = q('[data-act="loop"]');
      btn.textContent = '▶ Auto-Loop';
      btn.className = 'btn-loop';
      ss('ask', '⏸ Loop parado.', false);
    } else {
      loopAtivo = true;
      const btn = q('[data-act="loop"]');
      btn.textContent = '⏸ PARAR';
      btn.className = 'btn-stop';
      iniciarLoop();
    }
  });

})();
