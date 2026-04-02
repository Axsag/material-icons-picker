/*!
 * Zero-dependency icon picker for the Material Symbols variable font.
 *
 * USAGE
 *   // Auto-init via attribute
 *   MaterialSymbolsPicker.init('[data-icon-picker]');
 *
 *   // Manual
 *   const picker = new MaterialSymbolsPicker(inputElement, options);
 *
 * OPTIONS
 *   variant     'outlined' | 'rounded' | 'sharp'    default: 'outlined'
 *   variants    string[] – which variants to offer   default: ['outlined','rounded','sharp']
 *   fill        0 | 1                               default: 0
 *   weight      100 – 700                           default: 400
 *   grade       -25 | 0 | 200                       default: 0
 *   size        number (px, used in the trigger)    default: 24
 *   theme       'light' | 'dark' | 'auto'           default: 'auto'
 *   fetchIcons  boolean – fetch full list + meta    default: true
 *   icons       string[] – skip fetch, use list     default: null
 *   onChange    function(name: string)              default: null
 *   strings     Partial<typeof DEFAULT_STRINGS>     default: {}
 *
 * PUBLIC API
 *   picker.getValue()        → string
 *   picker.setValue(name)
 *   picker.setTheme(theme)   'light' | 'dark' | 'auto'
 *   picker.destroy()
 *   MaterialSymbolsPicker.init(selector, opts) → instances[]
 *
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.MaterialSymbolsPicker = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* ── Fallback icon list (used when fetchIcons:false or fetch fails) ─── */
  const FALLBACK_ICONS = [
    'home','menu','close','search','settings','info','help','warning','error','check_circle',
    'add','remove','edit','delete','share','download','upload','refresh','sync','undo','redo',
    'arrow_back','arrow_forward','arrow_upward','arrow_downward','expand_more','expand_less',
    'chevron_left','chevron_right','more_vert','more_horiz','open_in_new','launch','link',
    'star','star_border','favorite','favorite_border','bookmark','bookmark_border','flag',
    'visibility','visibility_off','lock','lock_open','check','cancel','block','report',
    'person','people','group','account_circle','person_add','person_remove','contacts',
    'notifications','notifications_none','notifications_off','mail','email','send','inbox',
    'chat','message','forum','comment','phone','call','call_end','voicemail','reply',
    'image','photo','photo_camera','videocam','mic','volume_up','volume_off','headphones',
    'music_note','play_arrow','pause','stop','skip_next','skip_previous','repeat','shuffle',
    'folder','folder_open','insert_drive_file','description','article','attach_file','cloud',
    'cloud_upload','cloud_download','save','print','content_copy','content_paste','content_cut',
    'smartphone','tablet','laptop','computer','monitor','keyboard','mouse','watch','devices',
    'wifi','wifi_off','bluetooth','location_on','location_off','gps_fixed','signal_cellular_alt',
    'battery_full','power','outlet','dark_mode','light_mode','brightness_high','brightness_low',
    'shopping_cart','store','storefront','payments','credit_card','receipt','sell','discount',
    'bar_chart','pie_chart','show_chart','trending_up','trending_down','analytics','table_chart',
    'map','terrain','explore','directions','flight','hotel','restaurant','local_cafe','park',
    'calendar_today','schedule','timer','alarm','history','event','date_range','access_time',
    'code','terminal','api','bug_report','storage','database','security','shield','verified',
    'tune','filter_list','sort','category','label','style','palette','brush','draw','colorize',
    'bolt','rocket_launch','science','psychology','hub','extension','construction','handyman',
    'format_list_bulleted','checklist','task_alt','assignment','grading','fact_check','rule',
    'drag_handle','drag_indicator','swap_vert','swap_horiz','fullscreen','fullscreen_exit',
  ];

  /* ── Default i18n strings ─────────────────────────────────────────────── */
  const DEFAULT_STRINGS = {
    placeholder:     'Choose icon…',
    searchLabel:     'Search icons',
    searchPlaceholder: 'Search…',
    clear:           'Clear',
    noResults:       'No icons found',
    allCategories:   'All categories',
    loading:         'Loading icons…',
    toggleDark:      'Switch to dark',
    toggleLight:     'Switch to light',
  };

  let _iconCache = null;        // { icons: IconMeta[], categories: string[] }
  let _fetchPromise = null;     // in-flight promise

  let _fontReadyPromise = null;
  function _waitForFonts() {
    if (_fontReadyPromise) return _fontReadyPromise;
    _fontReadyPromise = (document.fonts?.ready ?? Promise.resolve()).then(() => {});
    return _fontReadyPromise;
  }

  /* ── Canvas-based broken-icon detection (cached per font-family) ────────
   * Material Symbols renders icon names as ligatures → single glyph ≈ fontSize px wide.
   * If a name has no ligature the font falls back to individual chars → much wider.
   * We measure with canvas (one reflow-free pass) and cache the result.           */
  let _measureCanvas   = null;
  const _brokenIconCache = new Map();   // fontFamily → Set<name>

  function _detectBrokenIcons(icons, variant) {
    const family = _fontFamily(variant);
    if (_brokenIconCache.has(family)) return _brokenIconCache.get(family);

    if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
    const ctx      = _measureCanvas.getContext('2d');
    const fontSize = 18;
    ctx.font       = `400 ${fontSize}px '${family}'`;
    const threshold = fontSize * 1.6;
    const broken    = new Set();
    for (const icon of icons) {
      if (ctx.measureText(icon.name).width > threshold) broken.add(icon.name);
    }
    _brokenIconCache.set(family, broken);
    return broken;
  }

  /* ── Per-variant Google Fonts injection (deduped across instances) ─────── */
  const _loadedFontVariants = new Set();

  function _injectFontsForVariants(variants) {
    const needed = [...new Set(['outlined', ...variants])]
        .filter(v => !_loadedFontVariants.has(v));
    if (!needed.length) return;
    needed.forEach(v => _loadedFontVariants.add(v));

    const familyMap = {
      outlined: 'Material+Symbols+Outlined',
      rounded:  'Material+Symbols+Rounded',
      sharp:    'Material+Symbols+Sharp',
    };
    const params = needed
        .map(v => `family=${familyMap[v]}:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200`)
        .join('&');

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.mspFonts = needed.join(',');
    link.href = `https://fonts.googleapis.com/css2?${params}&display=block`;
    document.head.appendChild(link);
  }

  /* ── One-time CSS injection ──────────────────────────────────────────── */
  const STYLE_SENTINEL = 'msp-styles-loaded';
  let _stylesInjected = false;

  function _injectStyles() {
    if (_stylesInjected || document.querySelector('.' + STYLE_SENTINEL)) return;
    _stylesInjected = true;

    const style = document.createElement('style');
    style.dataset.mspStyles = '';
    style.textContent = `
.msp-wrap{position:relative;display:inline-block}
.msp-trigger,.msp-panel{--msp-accent:#6366f1;--msp-accent-ring:rgba(99,102,241,.15);--msp-bg:#fff;--msp-surface:#f8fafc;--msp-border:#e2e8f0;--msp-divider:#f1f5f9;--msp-text:#0f172a;--msp-muted:#64748b;--msp-subtle:#94a3b8;--msp-hover:#f1f5f9;--msp-selected-bg:rgba(99,102,241,.1);--msp-selected-fg:#4f46e5;--msp-shadow:0 4px 6px -1px rgba(0,0,0,.07),0 20px 40px -8px rgba(0,0,0,.12)}
.msp-trigger[data-msp-theme=dark],.msp-panel[data-msp-theme=dark]{--msp-bg:#1e1e2e;--msp-surface:#181825;--msp-border:#313244;--msp-divider:#24243e;--msp-text:#cdd6f4;--msp-muted:#9399b2;--msp-subtle:#6c7086;--msp-hover:#313244;--msp-selected-bg:rgba(99,102,241,.2);--msp-selected-fg:#a5b4fc;--msp-shadow:0 4px 6px -1px rgba(0,0,0,.3),0 20px 40px -8px rgba(0,0,0,.5)}
.msp-trigger{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;background:var(--msp-bg);border:1.5px solid var(--msp-border);border-radius:8px;min-width:180px;cursor:pointer;user-select:none;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;font-size:13px;color:var(--msp-text)}
.msp-trigger:focus-visible,.msp-trigger.is-open{border-color:var(--msp-accent);box-shadow:0 0 0 3px var(--msp-accent-ring)}
.msp-trigger-icon{color:var(--msp-accent);flex-shrink:0;line-height:1;font-style:normal;-webkit-font-smoothing:antialiased}
.msp-trigger-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.msp-trigger-label[data-empty]{color:var(--msp-subtle)}
.msp-trigger-caret{font-family:"Material Symbols Outlined";font-variation-settings:"FILL" 0,"wght" 400,"GRAD" 0,"opsz" 20;font-size:18px;line-height:1;font-style:normal;color:var(--msp-subtle);transition:transform .2s;flex-shrink:0}
.msp-trigger.is-open .msp-trigger-caret{transform:rotate(180deg)}
.msp-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:99999;width:312px;background:var(--msp-bg);border:1px solid var(--msp-border);border-radius:12px;box-shadow:var(--msp-shadow);display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(-6px) scale(.98);pointer-events:none;transition:opacity .15s ease,transform .15s ease}
.msp-panel.is-visible{opacity:1;transform:none;pointer-events:all}
.msp-search-row{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid var(--msp-divider)}
.msp-search-icon{font-family:"Material Symbols Outlined";font-variation-settings:"FILL" 0,"wght" 400,"GRAD" 0,"opsz" 20;font-size:16px;line-height:1;font-style:normal;color:var(--msp-subtle);flex-shrink:0}
.msp-search{flex:1;background:transparent;border:none;outline:none;color:var(--msp-text);font-size:13px;font-family:inherit;caret-color:var(--msp-accent);min-width:0}
.msp-search::placeholder{color:var(--msp-subtle)}
.msp-count{font-size:11px;color:var(--msp-subtle);font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0}
.msp-filter-row{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px 10px;border-bottom:1px solid var(--msp-divider);overflow:hidden}
.msp-filter-sep{width:1px;height:16px;background:var(--msp-border);margin:0 2px;flex-shrink:0}
.msp-pill{display:inline-flex;align-items:center;padding:2px 9px;border-radius:99px;border:1px solid var(--msp-border);background:transparent;color:var(--msp-muted);font-size:11px;font-family:inherit;cursor:pointer;white-space:nowrap;line-height:1.6;transition:border-color .12s,background .12s,color .12s}
.msp-pill:hover{border-color:var(--msp-accent);color:var(--msp-accent)}
.msp-pill.is-active{background:var(--msp-accent);border-color:var(--msp-accent);color:#fff}
.msp-theme-btn{margin-left:auto;flex-shrink:0;display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid var(--msp-border);background:transparent;color:var(--msp-muted);cursor:pointer;transition:border-color .12s,color .12s;font-family:"Material Symbols Outlined";font-variation-settings:"FILL" 0,"wght" 400,"GRAD" 0,"opsz" 20;font-size:14px;line-height:1;font-style:normal}
.msp-theme-btn:hover{border-color:var(--msp-accent);color:var(--msp-accent)}
.msp-category-row{padding:6px 10px;border-bottom:1px solid var(--msp-divider)}
.msp-category-select{width:100%;background:var(--msp-surface);border:1px solid var(--msp-border);border-radius:6px;color:var(--msp-text);font-size:12px;font-family:inherit;padding:4px 8px;outline:none;cursor:pointer;transition:border-color .12s}
.msp-category-select:focus{border-color:var(--msp-accent)}
.msp-grid{max-height:228px;overflow-y:auto;overflow-x:hidden;padding:8px;scrollbar-width:thin;scrollbar-color:var(--msp-border) transparent}
.msp-grid::-webkit-scrollbar{width:4px}
.msp-grid::-webkit-scrollbar-track{background:transparent}
.msp-grid::-webkit-scrollbar-thumb{background:var(--msp-border);border-radius:4px}
.msp-grid-spacer{position:relative;width:100%}
.msp-grid-row{position:absolute;left:0;display:flex;gap:2px}
.msp-icon-btn{width:32px;height:32px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:transparent;color:var(--msp-muted);cursor:pointer;transition:background .1s,color .1s,transform .1s}
.msp-icon-btn:hover{background:var(--msp-hover);color:var(--msp-text);transform:scale(1.12)}
.msp-icon-btn.is-selected{background:var(--msp-selected-bg);color:var(--msp-selected-fg)}
.msp-empty,.msp-loading{padding:32px 16px;text-align:center;color:var(--msp-subtle);font-size:12px}
.msp-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-top:1px solid var(--msp-divider);min-height:38px}
.msp-footer-name{font-size:12px;color:var(--msp-selected-fg);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .1s}
.msp-footer-name[data-empty]{color:var(--msp-subtle)}
.msp-clear-btn{flex-shrink:0;background:transparent;border:1px solid var(--msp-border);color:var(--msp-muted);border-radius:6px;padding:3px 10px;font-size:11px;font-family:inherit;cursor:pointer;transition:border-color .12s,color .12s}
.msp-clear-btn:hover{border-color:#ef4444;color:#ef4444}
.msp-fonts-pending .msp-trigger-caret,.msp-fonts-pending .msp-trigger-icon,.msp-fonts-pending .msp-search-icon,.msp-fonts-pending .msp-theme-btn{visibility:hidden}
    `;
    document.head.appendChild(style);
  }

  /* ── Font-family helper ───────────────────────────────────────────────── */
  function _fontFamily(variant) {
    return (
        variant === 'rounded' ? 'Material Symbols Rounded' :
            variant === 'sharp'   ? 'Material Symbols Sharp'   :
                'Material Symbols Outlined'
    );
  }

  function _iconCss(opts, size) {
    const sz = size != null ? size : opts.size;
    return (
        `font-family:'${_fontFamily(opts.variant)}';`
        + `font-variation-settings:'FILL' ${opts.fill},'wght' ${opts.weight},'GRAD' ${opts.grade},'opsz' ${sz};`
        + `font-size:${sz}px;line-height:1;font-style:normal;-webkit-font-smoothing:antialiased;`
    );
  }

  /* ── Theme helpers ────────────────────────────────────────────────────── */
  function _resolveTheme(theme) {
    if (theme === 'dark')  return 'dark';
    if (theme === 'light') return 'light';
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'dark' : 'light';
  }

  /* ════════════════════════════════════════════════════════════════════════
     MaterialSymbolsPicker class
     ════════════════════════════════════════════════════════════════════════ */
  class MaterialSymbolsPicker {
    constructor(el, opts = {}) {
      _injectStyles();

      this._nativeInput = el.tagName === 'INPUT' ? el : null;

      this.opts = {
        variant:    'outlined',
        variants:   ['outlined', 'rounded', 'sharp'],
        fill:       0,
        weight:     400,
        grade:      0,
        size:       24,
        theme:      'auto',
        fetchIcons: true,
        icons:      null,
        onChange:   null,
        strings:    {},
        ...opts,
      };

      // Normalize variants — must be a non-empty array of known values
      const VALID_VARIANTS = ['outlined', 'rounded', 'sharp'];
      this.opts.variants = (this.opts.variants || []).filter(v => VALID_VARIANTS.includes(v));
      if (!this.opts.variants.length) this.opts.variants = ['outlined'];

      // Active variant must be in the allowed set; fall back to first
      if (!this.opts.variants.includes(this.opts.variant)) {
        this.opts.variant = this.opts.variants[0];
      }

      // Inject only the font families this instance actually needs
      _injectFontsForVariants(this.opts.variants);

      this._s      = { ...DEFAULT_STRINGS, ...this.opts.strings };
      this._value  = this._nativeInput?.value || '';
      this._open   = false;
      this._theme  = _resolveTheme(this.opts.theme);

      this._allIcons   = [];
      this._categories = [];
      this._filtered   = [];

      this._cols = 8;
      this._rowH = 34;

      this._build();
      this._bindEvents();
      this._loadIcons();
    }

    /* ── Build DOM ──────────────────────────────────────────────────────── */
    _build() {
      const wrap = document.createElement('div');
      wrap.className = 'msp-wrap';
      wrap.classList.add('msp-fonts-pending');

      if (this._nativeInput) {
        this._nativeInput.parentNode.insertBefore(wrap, this._nativeInput);
        this._nativeInput.style.display = 'none';
        wrap.appendChild(this._nativeInput);
      }

      // Trigger
      this._trigger = document.createElement('div');
      this._trigger.className = 'msp-trigger';
      this._trigger.tabIndex  = 0;
      this._trigger.setAttribute('role', 'combobox');
      this._trigger.setAttribute('aria-expanded', 'false');
      this._trigger.innerHTML = `
        <span class="msp-trigger-icon"  aria-hidden="true"></span>
        <span class="msp-trigger-label" data-empty></span>
        <span class="msp-trigger-caret" aria-hidden="true">expand_more</span>
      `;
      wrap.appendChild(this._trigger);

      const showVariantPills = this.opts.variants.length > 1;
      const variantPillsHtml = showVariantPills
          ? this.opts.variants.map(v =>
          `<button type="button" class="msp-pill" data-variant="${v}">${
              v.charAt(0).toUpperCase() + v.slice(1)
          }</button>`
      ).join('') + '<div class="msp-filter-sep"></div>'
          : '';

      // Panel
      this._panel = document.createElement('div');
      this._panel.className = 'msp-panel';
      this._panel.setAttribute('role', 'dialog');
      this._panel.setAttribute('aria-label', this._s.searchLabel);
      this._panel.innerHTML = `
        <div class="msp-search-row">
          <span class="msp-search-icon" aria-hidden="true">search</span>
          <input class="msp-search" type="text" autocomplete="off" spellcheck="false"
            placeholder="${this._s.searchPlaceholder}"
            aria-label="${this._s.searchLabel}">
          <span class="msp-count"></span>
          <button type="button" class="msp-theme-btn" aria-label="Toggle theme"></button>
        </div>
        <div class="msp-filter-row">
          ${variantPillsHtml}
          <button type="button" class="msp-pill" data-fill="0">Line</button>
          <button type="button" class="msp-pill" data-fill="1">Fill</button>
        </div>
        <div class="msp-category-row" hidden></div>
        <div class="msp-grid" role="listbox" aria-label="${this._s.searchLabel}"></div>
        <div class="msp-footer">
          <span class="msp-footer-name" data-empty>—</span>
          <button type="button" class="msp-clear-btn">${this._s.clear}</button>
        </div>
      `;
      wrap.appendChild(this._panel);

      this._wrap        = wrap;
      this._searchEl    = this._panel.querySelector('.msp-search');
      this._countEl     = this._panel.querySelector('.msp-count');
      this._gridEl      = this._panel.querySelector('.msp-grid');
      this._footerName  = this._panel.querySelector('.msp-footer-name');
      this._clearBtn    = this._panel.querySelector('.msp-clear-btn');
      this._themeBtn    = this._panel.querySelector('.msp-theme-btn');
      this._categoryRow = this._panel.querySelector('.msp-category-row');

      this._syncPillStates();
      this._applyTheme();
      this._updateTrigger();
    }

    /* ── Events ─────────────────────────────────────────────────────────── */
    _bindEvents() {
      this._trigger.addEventListener('click', () => this._toggle());
      this._trigger.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggle(); }
        if (e.key === 'Escape') this._close();
      });

      this._searchEl.addEventListener('input', () => this._applyFilters());

      // Variant pills (querySelectorAll returns [] when none exist — safe)
      this._panel.querySelectorAll('[data-variant]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.opts.variant = btn.dataset.variant;
          this._syncPillStates();
          this._refilterByVariant();
          this._applyFilters();
          this._updateTrigger();
        });
      });

      // Fill pills
      this._panel.querySelectorAll('[data-fill]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.opts.fill = Number(btn.dataset.fill);
          this._syncPillStates();
          this._renderGrid();
          this._updateTrigger();
        });
      });

      this._themeBtn.addEventListener('click', () => {
        this.opts.theme = this._theme === 'dark' ? 'light' : 'dark';
        this._applyTheme();
      });

      this._clearBtn.addEventListener('click', () => {
        this._setValue('');
        this._close();
      });

      this._outsideHandler = e => {
        if (!this._wrap.contains(e.target)) this._close();
      };

      if (this.opts.theme === 'auto' && window.matchMedia) {
        this._mq = window.matchMedia('(prefers-color-scheme: dark)');
        this._mqHandler = () => this._applyTheme();
        this._mq.addEventListener('change', this._mqHandler);
      }
    }

    /* ── Icon data loading ───────────────────────────────────────────────── */
    _loadIcons() {
      if (this.opts.icons) {
        _waitForFonts().then(() => {
          this._wrap.classList.remove('msp-fonts-pending');
          this._setIconData(
              this.opts.icons.map(n => ({ name: n, categories: [], tags: [] })),
              []
          );
        });
        return;
      }

      if (!this.opts.fetchIcons) {
        _waitForFonts().then(() => {
          this._wrap.classList.remove('msp-fonts-pending');
          this._setIconData(
              FALLBACK_ICONS.map(n => ({ name: n, categories: [], tags: [] })),
              []
          );
        });
        return;
      }

      this._gridEl.innerHTML = `<div class="msp-loading">${this._s.loading}</div>`;

      Promise.all([_fetchGoogleIcons(), _waitForFonts()])
          .then(([{ icons, categories }]) => {
            this._wrap.classList.remove('msp-fonts-pending');
            this._setIconData(icons, categories);
          })
          .catch(() => {
            _waitForFonts().then(() => {
              this._wrap.classList.remove('msp-fonts-pending');
              this._setIconData(
                  FALLBACK_ICONS.map(n => ({ name: n, categories: [], tags: [] })),
                  []
              );
            });
          });
    }

    /* ── Re-filter broken icons when variant changes ─────────────────────── */
    _refilterByVariant() {
      if (!this._sourceIcons?.length) return;
      const broken   = _detectBrokenIcons(this._sourceIcons, this.opts.variant);
      this._allIcons = this._sourceIcons.filter(i => !broken.has(i.name));
    }

    _setIconData(icons, categories) {
      this._sourceIcons = icons;
      const broken      = _detectBrokenIcons(icons, this.opts.variant);
      this._allIcons    = icons.filter(i => !broken.has(i.name));
      this._categories  = categories;
      this._filtered    = [...this._allIcons];

      if (categories.length) this._buildCategorySelect();

      if (this._open) {
        this._countEl.textContent = this._allIcons.length;
        this._renderGrid();
      }
    }

    /* ── Category select ─────────────────────────────────────────────────── */
    _buildCategorySelect() {
      const sel = document.createElement('select');
      sel.className = 'msp-category-select';
      sel.setAttribute('aria-label', this._s.allCategories);

      const allOpt = document.createElement('option');
      allOpt.value       = '';
      allOpt.textContent = this._s.allCategories;
      sel.appendChild(allOpt);

      this._categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value       = cat;
        opt.textContent = cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        sel.appendChild(opt);
      });

      sel.addEventListener('change', () => this._applyFilters());

      this._categorySelect = sel;
      this._categoryRow.appendChild(sel);
      this._categoryRow.hidden = false;
    }

    /* ── Open / close ────────────────────────────────────────────────────── */
    _toggle() { this._open ? this._close() : this._openPanel(); }

    _openPanel() {
      this._open = true;
      this._trigger.classList.add('is-open');
      this._trigger.setAttribute('aria-expanded', 'true');
      this._panel.classList.add('is-visible');

      this._searchEl.value = '';
      if (this._categorySelect) this._categorySelect.value = '';
      this._filtered = [...this._allIcons];
      this._countEl.textContent = this._allIcons.length;
      this._gridEl.scrollTop = 0;

      this._calcCols();
      if (this._allIcons.length) this._renderGrid();

      setTimeout(() => this._searchEl.focus(), 40);
      document.addEventListener('mousedown', this._outsideHandler);
    }

    _close() {
      this._open = false;
      this._trigger.classList.remove('is-open');
      this._trigger.setAttribute('aria-expanded', 'false');
      this._panel.classList.remove('is-visible');
      document.removeEventListener('mousedown', this._outsideHandler);
      this._trigger.focus();
    }

    /* ── Filtering ───────────────────────────────────────────────────────── */
    _applyFilters() {
      const raw = this._searchEl.value.trim().toLowerCase();
      const q   = raw.replace(/\s+/g, '_');
      const cat = this._categorySelect?.value || '';

      this._filtered = this._allIcons.filter(icon => {
        if (cat && !icon.categories.includes(cat)) return false;
        if (!raw) return true;
        return icon.name.includes(q) || icon.tags.some(t => t.includes(raw));
      });

      this._gridEl.scrollTop = 0;
      this._renderGrid();
    }

    /* ── Virtual grid rendering ──────────────────────────────────────────── */
    _calcCols() {
      const available = this._gridEl.clientWidth - 16 - 6;
      this._cols = Math.max(1, Math.floor(available / this._rowH));
    }

    _renderGrid() {
      const { _cols: COLS, _rowH: ROW_H, _filtered: list } = this;
      const OVERSCAN = 2;

      this._countEl.textContent = list.length;

      if (!list.length) {
        this._gridEl.innerHTML = `<div class="msp-empty">${this._s.noResults}</div>`;
        this._gridEl.onscroll  = null;
        return;
      }

      const iconCss   = _iconCss(this.opts, 18);
      const totalRows = Math.ceil(list.length / COLS);
      const totalH    = totalRows * ROW_H;

      this._gridEl.innerHTML = '';
      const spacer = document.createElement('div');
      spacer.className    = 'msp-grid-spacer';
      spacer.style.height = totalH + 'px';
      this._gridEl.appendChild(spacer);

      const renderRows = () => {
        const scrollTop = this._gridEl.scrollTop;
        const viewH     = this._gridEl.clientHeight;
        const firstRow  = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
        const lastRow   = Math.min(totalRows - 1, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN);

        spacer.querySelectorAll('.msp-grid-row').forEach(r => {
          const ri = Number(r.dataset.r);
          if (ri < firstRow || ri > lastRow) r.remove();
        });

        const rendered = new Set(
            [...spacer.querySelectorAll('.msp-grid-row')].map(r => Number(r.dataset.r))
        );

        for (let r = firstRow; r <= lastRow; r++) {
          if (rendered.has(r)) continue;

          const rowEl        = document.createElement('div');
          rowEl.className    = 'msp-grid-row';
          rowEl.dataset.r    = r;
          rowEl.style.top    = r * ROW_H + 'px';

          for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            if (idx >= list.length) break;

            const icon = list[idx];
            const btn  = document.createElement('button');
            btn.type      = 'button';
            btn.className = 'msp-icon-btn' + (this._value === icon.name ? ' is-selected' : '');
            btn.setAttribute('aria-label', icon.name.replace(/_/g, ' '));
            btn.setAttribute('aria-selected', String(this._value === icon.name));

            const span = document.createElement('span');
            span.style.cssText  = iconCss;
            span.textContent    = icon.name;
            span.setAttribute('aria-hidden', 'true');
            btn.appendChild(span);

            btn.addEventListener('mouseenter', () => {
              this._footerName.textContent = icon.name.replace(/_/g, ' ');
              delete this._footerName.dataset.empty;
            });
            btn.addEventListener('mouseleave', () => {
              this._footerName.textContent = this._value
                  ? this._value.replace(/_/g, ' ')
                  : '—';
              if (!this._value) this._footerName.dataset.empty = '';
            });
            btn.addEventListener('click', () => {
              this._setValue(icon.name);
              this._close();
            });

            rowEl.appendChild(btn);
          }
          spacer.appendChild(rowEl);
        }
      };

      this._gridEl.onscroll = renderRows;
      renderRows();
    }

    /* ── Value ───────────────────────────────────────────────────────────── */
    _setValue(name) {
      this._value = name;

      if (this._nativeInput) {
        this._nativeInput.value = name;
        this._nativeInput.dispatchEvent(new Event('change', { bubbles: true }));
        this._nativeInput.dispatchEvent(new Event('input',  { bubbles: true }));
      }

      this.opts.onChange?.(name);
      this._updateTrigger();

      this._footerName.textContent = name ? name.replace(/_/g, ' ') : '—';
      if (name) delete this._footerName.dataset.empty;
      else      this._footerName.dataset.empty = '';
    }

    /* ── Trigger display ─────────────────────────────────────────────────── */
    _updateTrigger() {
      const iconEl  = this._trigger.querySelector('.msp-trigger-icon');
      const labelEl = this._trigger.querySelector('.msp-trigger-label');

      if (this._value) {
        iconEl.style.cssText = _iconCss(this.opts, 18);
        iconEl.textContent   = this._value;
        labelEl.textContent  = this._value.replace(/_/g, ' ');
        delete labelEl.dataset.empty;
      } else {
        iconEl.style.cssText = '';
        iconEl.textContent   = '';
        labelEl.textContent  = this._s.placeholder;
        labelEl.dataset.empty = '';
      }
    }

    /* ── Theme ───────────────────────────────────────────────────────────── */
    _applyTheme() {
      this._theme = _resolveTheme(this.opts.theme);
      this._trigger.dataset.mspTheme = this._theme;
      this._panel.dataset.mspTheme   = this._theme;
      this._themeBtn.textContent     = this._theme === 'dark' ? 'light_mode' : 'dark_mode';
      this._themeBtn.title = this._theme === 'dark' ? this._s.toggleLight : this._s.toggleDark;
    }

    /* ── Pill sync ───────────────────────────────────────────────────────── */
    _syncPillStates() {
      this._panel.querySelectorAll('[data-variant]').forEach(b =>
        b.classList.toggle('is-active', b.dataset.variant === this.opts.variant));
      this._panel.querySelectorAll('[data-fill]').forEach(b =>
        b.classList.toggle('is-active', Number(b.dataset.fill) === this.opts.fill));
    }

    /* ════════════════════════════════════════════════════════════════════
       Public API
       ════════════════════════════════════════════════════════════════════ */

    getValue() { return this._value; }
    setValue(name) { this._setValue(name); }

    setTheme(theme) {
      this.opts.theme = theme;
      this._applyTheme();
    }

    destroy() {
      this._close();
      this._mq?.removeEventListener('change', this._mqHandler);
      if (this._nativeInput) {
        this._nativeInput.style.display = '';
        this._wrap.before(this._nativeInput);
      }
      this._wrap.remove();
    }

    static init(selector, opts = {}) {
      return [...document.querySelectorAll(selector)]
          .map(el => new MaterialSymbolsPicker(el, opts));
    }
  }

  function _fetchGoogleIcons() {
    if (_iconCache) return Promise.resolve(_iconCache);
    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = fetch('https://cdn.jsdelivr.net/gh/Axsag/material-icons-picker@latest/material-design-icons.json')
        .then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(json => {
          const raw = (json.icons || [])
              .slice()
              .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

          const icons = raw.map(i => ({
            name:       i.name,
            categories: i.categories || [],
            tags:       (i.tags || []).map(t => t.toLowerCase()),
          }));

          const catSet = new Set();
          icons.forEach(i => i.categories.forEach(c => catSet.add(c)));

          _iconCache = { icons, categories: [...catSet].sort() };
          return _iconCache;
        });

    return _fetchPromise;
  }

  return MaterialSymbolsPicker;
});