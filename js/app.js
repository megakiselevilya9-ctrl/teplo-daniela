/* Тепло — дневник питания с готовым планом.
   Vanilla JS, без сборки и внешних запросов. */
(function () {
  'use strict';

  const { PROFILE_DEFAULT, MEAL_META, MONTH_WEEKS, PLAN, TIPS, SHOP, FOODS, CATS } = window.TEPLO_DATA;

  const KEY = 'teplo.v1';
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MEAL_IDS = ['breakfast', 'lunch', 'snack', 'dinner'];
  const TABS = [
    { id: 'today', label: 'Сегодня', icon: 'home' },
    { id: 'plan', label: 'План', icon: 'calendar' },
    { id: 'diary', label: 'Дневник', icon: 'book' },
    { id: 'progress', label: 'Прогресс', icon: 'chart' }
  ];
  const CAT_LABEL = Object.fromEntries(CATS.map(c => [c.id, c.label]));

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const pad2 = n => String(n).padStart(2, '0');
  const nf = new Intl.NumberFormat('ru-RU');

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  function genitiveName(name) {
    const n = String(name || '').trim();
    if (!n) return 'тебя';
    if (/[ая]$/i.test(n)) return n.slice(0, -1) + (n.slice(-1).toLowerCase() === 'я' ? 'и' : 'ы');
    return n;
  }
  const fmt = n => nf.format(Math.round(Number(n) || 0));
  const fmt1 = n => {
    const v = Math.round((Number(n) || 0) * 10) / 10;
    return v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
  };
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const round1 = n => Math.round((Number(n) || 0) * 10) / 10;
  const signed = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt1(Math.abs(n))}`;

  function iso(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function todayISO() { return iso(new Date()); }
  function parseISO(s) {
    if (!s) return new Date();
    const p = String(s).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function addDays(key, n) {
    const d = parseISO(key); d.setDate(d.getDate() + n); return iso(d);
  }
  function diffDays(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function weekdayIndex(key) { return (parseISO(key).getDay() + 6) % 7; }
  function startOfWeek(key) { const d = parseISO(key); d.setDate(d.getDate() - weekdayIndex(key)); return iso(d); }
  function humanDate(key, withYear) {
    const d = parseISO(key);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear || d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
  }
  function shortDate(key) { const d = parseISO(key); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; }
  function dateFull(key) { return `${cap(WEEKDAYS[weekdayIndex(key)])}, ${humanDate(key)}`; }
  function dayOfYear() {
    const n = new Date();
    return Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
  }
  function ageNow() {
    const b = parseISO(S.profile.birthDate);
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  function plural(n, one, few, many) {
    const x = Math.abs(n) % 100, y = x % 10;
    if (x > 10 && x < 20) return many;
    if (y > 1 && y < 5) return few;
    if (y === 1) return one;
    return many;
  }

  /* ------------------------------------------------------------------ icons */
  const ICONS = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.12.37.4.7.77.9.3.16.64.24.98.24H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5.86z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.2s6.4 6.1 6.4 10.5a6.4 6.4 0 0 1-12.8 0C5.6 9.3 12 3.2 12 3.2Z"/></svg>',
    sunrise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16M6.5 14.5a5.5 5.5 0 0 1 11 0M12 3v3M4.9 7.4l2.1 2.1M19.1 7.4 17 9.5M2.5 14.5h2M19.5 14.5h2"/></svg>',
    bowl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M8 7c0-1.2 1-1.8 1-3M12 7c0-1.2 1-1.8 1-3M16 7c0-1.2 1-1.8 1-3"/><path d="M3 20h18"/></svg>',
    apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.2c-1-2.2-3.4-2.7-5-1.3-2.2 2-1.4 6.4.7 9.7 1.2 1.9 2.6 3.4 4.3 3.4 1.7 0 3.1-1.5 4.3-3.4 2.1-3.3 2.9-7.7.7-9.7-1.6-1.4-4-.9-5 1.3Z"/><path d="M12 7V4.5M12 4.5c1.7 0 3-1.1 3-2.5-1.7 0-3 1.1-3 2.5Z"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.2A8.6 8.6 0 0 1 9.8 3.6a8.6 8.6 0 1 0 10.6 10.6Z"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 8-7 8 7v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-9Z"/><path d="M9.5 20.5v-6h5v6"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M7.5 3v4M16.5 3v4M3.5 10h17"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16.5H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M8 7h8M8 11h5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V4.5M4 19.5h16"/><path d="m7 15 3.5-4 3 2.5 5.5-7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.9a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/><circle cx="9.2" cy="19" r="1.3"/><circle cx="17.5" cy="19" r="1.3"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.8l-1.6-5.6L5 10.6 10.4 9 12 3.5Z"/><path d="M19 17.5v3M17.5 19h3"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h14v17H5z"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 5.6a5 5 0 0 0-7.1 0L12 6.9l-1.3-1.3a5 5 0 0 0-7.1 7.1L12 21l8.4-8.3a5 5 0 0 0 0-7.1Z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 10.5V17M12 7.2h.01"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12"/></svg>',
    scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 9a4 4 0 0 1 8 0"/><path d="M12 9v3"/></svg>',
    sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.2 4.3L17.5 8.5l-4.3 1.2L12 14l-1.2-4.3L6.5 8.5l4.3-1.2L12 3Z"/><path d="M19 14.5 19.6 17l2.4.6-2.4.6L19 20.7l-.6-2.5-2.4-.6 2.4-.6.6-2.5Z"/></svg>'
  };
  const ic = (name, cls = '') => `<span class="${cls}" aria-hidden="true">${ICONS[name] || ''}</span>`;

  /* ------------------------------------------------------------------ state */
  function defaults() {
    const t = todayISO();
    return {
      v: 1,
      onboarded: false,
      profile: Object.assign({}, PROFILE_DEFAULT, { startDate: t }),
      log: {},
      weights: [{ date: t, kg: PROFILE_DEFAULT.startWeight }],
      ui: { tab: 'today', planWeek: 0, planDay: 0, diaryDate: t, chart: '3m', foodCat: 'all' },
      shop: {}
    };
  }

  function normalize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    const s = Object.assign(d, raw);
    s.profile = Object.assign({}, PROFILE_DEFAULT, d.profile, raw.profile || {});
    s.profile.startDate = s.profile.startDate || d.profile.startDate;
    s.profile.name = String(s.profile.name || '').slice(0, 24);
    s.profile.height = clamp(Number(s.profile.height) || 175, 120, 220);
    s.profile.goalWeight = clamp(Number(s.profile.goalWeight) || 68, 40, 150);
    s.profile.activity = clamp(Number(s.profile.activity) || 1.375, 1.2, 1.5);
    s.profile.kcal = clamp(Number(s.profile.kcal) || 1650, 1500, 3000);
    s.profile.protein = clamp(Number(s.profile.protein) || 135, 60, 250);
    s.profile.fat = clamp(Number(s.profile.fat) || 58, 30, 150);
    s.profile.carbs = clamp(Number(s.profile.carbs) || 147, 50, 400);
    s.profile.water = clamp(Number(s.profile.water) || 2000, 1000, 4000);
    s.log = raw.log && typeof raw.log === 'object' ? raw.log : {};
    s.weights = Array.isArray(raw.weights) && raw.weights.length ? raw.weights.filter(x => x && x.date && Number(x.kg) > 0) : d.weights;
    s.ui = Object.assign(d.ui, raw.ui || {});
    s.ui.planWeek = clamp(Number(s.ui.planWeek) || 0, 0, 3);
    s.ui.planDay = clamp(Number(s.ui.planDay) || 0, 0, 6);
    s.shop = raw.shop && typeof raw.shop === 'object' ? raw.shop : {};
    s.v = 1;
    return s;
  }

  let S;
  try { S = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch (e) { S = defaults(); }

  let saveTimer = null;
  function save(soon) {
    clearTimeout(saveTimer);
    const write = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* приватный режим */ } };
    if (soon) saveTimer = setTimeout(write, 260); else write();
  }

  function getLog(date) {
    if (!S.log[date] || typeof S.log[date] !== 'object') S.log[date] = {};
    const l = S.log[date];
    if (!l.meals || typeof l.meals !== 'object') l.meals = {};
    if (!Array.isArray(l.extras)) l.extras = [];
    if (typeof l.water !== 'number') l.water = 0;
    if (typeof l.note !== 'string') l.note = '';
    return l;
  }
  function portion(date, mealId) { return Number(getLog(date).meals[mealId]) || 0; }
  function setPortion(date, mealId, p) {
    const l = getLog(date);
    if (p > 0) l.meals[mealId] = p; else delete l.meals[mealId];
    save();
  }
  function planIndexForDate(date) {
    const start = S.profile.startDate || todayISO();
    const diff = diffDays(start, date);
    if (diff < 0) return 0;
    return diff % 28;
  }
  function planForDate(date) { return PLAN[planIndexForDate(date)]; }

  /* Порции меню подстраиваются под калории. Белок сохраняем,
     а жиры и углеводы масштабируем — иначе при снижении калорий
     первым проседал бы белок. */
  const CARB_ITEM = /(овсян|гречк|рис|киноа|паст|хлеб|мук|гранол|картоф|банан|яблок|груш|апельсин|ягод|черник|мёд|мед|какао|хлебец|суп)/i;
  const FAT_ITEM = /(масл|авокадо|орех|миндал|арахис|семечк|чиа)/i;

  function kcalTarget() { return clamp(Number(S.profile.kcal) || 1650, 1500, 3000); }

  function basePlanTotals(plan) {
    return plan.meals.reduce((a, m) => {
      a.kcal += m.kcal; a.p += m.protein; a.f += m.fat; a.c += m.carbs; a.fi += m.fiber; return a;
    }, { kcal: 0, p: 0, f: 0, c: 0, fi: 0 });
  }

  function planScale(plan, target) {
    const base = basePlanTotals(plan).kcal;
    return clamp((target || kcalTarget()) / base, 0.65, 1.8);
  }

  function scaleItemText(text, ratio) {
    if (Math.abs(ratio - 1) < 0.02) return text;
    const lower = text.toLowerCase();
    if (!CARB_ITEM.test(lower) && !FAT_ITEM.test(lower)) return text;
    return text.replace(/(\d+(?:[.,]\d+)?)\s*(г|мл)(?=\s|$|[),.;])/gi, (all, num, unit) => {
      const n = parseFloat(String(num).replace(',', '.')) * ratio;
      let v;
      if (n < 10) v = Math.round(n * 2) / 2;
      else if (n < 30) v = Math.round(n);
      else v = Math.round(n / 5) * 5;
      if (v < 1) v = 1;
      return `${String(v).replace('.', ',')} ${unit}`;
    });
  }

  function scaledMeal(meal, plan, target) {
    const s = planScale(plan, target);
    const targetKcal = meal.kcal * s;
    const proteinKcal = meal.protein * 4;
    const baseFatCarbKcal = Math.max(1, meal.fat * 9 + meal.carbs * 4);
    const ratio = clamp((targetKcal - proteinKcal) / baseFatCarbKcal, 0.4, 2.4);
    return Object.assign({}, meal, {
      kcal: Math.round(targetKcal),
      protein: round1(meal.protein),
      fat: round1(meal.fat * ratio),
      carbs: round1(meal.carbs * ratio),
      fiber: round1(meal.fiber * ratio),
      portionScale: s,
      fatCarbRatio: ratio,
      items: meal.items.map(x => scaleItemText(x, ratio))
    });
  }

  function scaledMeals(plan, target) {
    return plan.meals.map(m => scaledMeal(m, plan, target));
  }

  function planTotals(plan, target) {
    return scaledMeals(plan, target).reduce((a, m) => {
      a.kcal += m.kcal; a.p += m.protein; a.f += m.fat; a.c += m.carbs; a.fi += m.fiber; return a;
    }, { kcal: 0, p: 0, f: 0, c: 0, fi: 0 });
  }

  function scaledPlanAverages(target) {
    const sums = { kcal: 0, p: 0, f: 0, c: 0, fi: 0 };
    PLAN.forEach(day => {
      const t = planTotals(day, target);
      sums.kcal += t.kcal; sums.p += t.p; sums.f += t.f; sums.c += t.c; sums.fi += t.fi;
    });
    const n = PLAN.length || 1;
    return { kcal: sums.kcal / n, p: sums.p / n, f: sums.f / n, c: sums.c / n, fi: sums.fi / n };
  }

  function totalsFor(date) {
    const plan = planForDate(date);
    const t = { kcal: 0, p: 0, f: 0, c: 0, fi: 0, meals: 0 };
    scaledMeals(plan).forEach(m => {
      const p = portion(date, m.id);
      if (p > 0) { t.meals++; t.kcal += m.kcal * p; t.p += m.protein * p; t.f += m.fat * p; t.c += m.carbs * p; t.fi += m.fiber * p; }
    });
    getLog(date).extras.forEach(x => {
      t.kcal += Number(x.kcal) || 0; t.p += Number(x.p) || 0; t.f += Number(x.f) || 0; t.c += Number(x.c) || 0; t.fi += Number(x.fi) || 0;
    });
    return t;
  }
  function extrasFor(date, mealId) { return getLog(date).extras.filter(x => (x.mealId || 'snack') === mealId); }
  function mealTotal(date, mealId) {
    const plan = planForDate(date);
    const m = scaledMeals(plan).find(x => x.id === mealId);
    let t = { kcal: 0, p: 0, f: 0, c: 0 };
    if (m) {
      const p = portion(date, mealId);
      t.kcal = m.kcal * p; t.p = m.protein * p; t.f = m.fat * p; t.c = m.carbs * p;
    }
    extrasFor(date, mealId).forEach(x => { t.kcal += x.kcal || 0; t.p += x.p || 0; t.f += x.f || 0; t.c += x.c || 0; });
    return t;
  }
  function currentWeight() {
    const list = weightsSorted();
    return list.length ? list[list.length - 1] : { date: todayISO(), kg: S.profile.startWeight };
  }
  function startWeight() {
    const list = weightsSorted();
    return list.length ? list[0] : { date: S.profile.startDate, kg: S.profile.startWeight };
  }
  function weightsSorted() { return [...S.weights].filter(x => x && x.date && Number(x.kg) > 0).sort((a, b) => a.date.localeCompare(b.date)); }
  function bmr(weight) { return 10 * weight + 6.25 * Number(S.profile.height) - 5 * ageNow() - 161; }
  function tdee(weight) { return bmr(weight) * (Number(S.profile.activity) || 1.375); }
  function calcTargets() {
    const w = currentWeight().kg;
    const b = bmr(w), t = tdee(w);
    const kcal = Math.max(1500, Math.round((t - 575) / 10) * 10);
    const protein = Math.round(w * 1.7 / 5) * 5;
    const fat = Math.round(w * 0.72);
    const carbs = Math.max(100, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { bmr: b, tdee: t, kcal, protein, fat, carbs };
  }
  function ratePerWeek(list) {
    if (!list || list.length < 2) return null;
    const last = list[list.length - 1];
    const cut = addDays(last.date, -14);
    const recent = list.filter(x => x.date >= cut);
    const first = recent.length > 1 ? recent[0] : list[0];
    const days = diffDays(first.date, last.date);
    if (days < 2) return null;
    return (last.kg - first.kg) / (days / 7);
  }
  function projectionLabel() {
    const list = weightsSorted();
    const r = ratePerWeek(list);
    const cur = currentWeight().kg;
    const goal = Number(S.profile.goalWeight);
    if (!r || r >= -0.03 || cur <= goal) return '—';
    const weeks = (cur - goal) / Math.abs(r);
    const d = new Date(); d.setDate(d.getDate() + Math.round(weeks * 7));
    return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ------------------------------------------------------------------ UI bits */
  function pageHead(kicker, title, sub) {
    return `<header class="page-head">
      <div class="topline">
        <div class="brand"><span class="logo-mark">${ICONS.sun}</span>Тепло</div>
        <button class="icon-btn" data-act="settings" aria-label="Настройки">${ICONS.gear}</button>
      </div>
      <p class="kicker">${esc(kicker)}</p>
      <h1>${title}<span class="dot">.</span></h1>
      ${sub ? `<p class="subline">${sub}</p>` : ''}
    </header>`;
  }
  function navBar() {
    return `<nav class="nav" aria-label="Разделы"><div class="nav-inner">${TABS.map(t => `
      <button class="nav-btn ${S.ui.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}" ${S.ui.tab === t.id ? 'aria-current="page"' : ''}>
        <span class="nav-ico">${ICONS[t.icon]}</span><span>${t.label}</span>
      </button>`).join('')}</div></nav>`;
  }
  function macroLine(label, value, target) {
    const pct = target > 0 ? clamp(value / target * 100, 0, 100) : 0;
    return `<div class="macro-line">
      <span class="m-name">${label}</span><span class="m-val">${fmt(value)} / ${fmt(target)} г</span>
      <span class="macro-track"><i style="width:${pct}%"></i></span>
    </div>`;
  }
  function greeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Доброе утро';
    if (h >= 12 && h < 18) return 'Добрый день';
    if (h >= 18 && h < 23) return 'Добрый вечер';
    return 'Тихой ночи';
  }
  function defaultMeal() {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 14) return 'lunch';
    if (h < 18) return 'snack';
    return 'dinner';
  }
  function mealIcon(id) { return ICONS[MEAL_META[id].icon] || ICONS.bowl; }
  function mealMark(id) { return `<span class="meal-ico">${mealIcon(id)}</span>`; }
  function portionText(p) { return p === 0.5 ? '½ порции' : p === 1.5 ? '1½ порции' : '1 порция'; }
  function tipForToday() { return TIPS[(dayOfYear() + 3) % TIPS.length]; }

  let toastTimer = null;
  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
  }

  /* ------------------------------------------------------------------ render */
  function render(animate, keepScroll) {
    const app = $('#app');
    if (!S.onboarded) {
      app.innerHTML = onboarding();
      document.body.classList.remove('locked');
      window.scrollTo(0, 0);
      return;
    }
    const y = window.scrollY;
    let body = '';
    if (S.ui.tab === 'today') body = viewToday();
    else if (S.ui.tab === 'plan') body = viewPlan();
    else if (S.ui.tab === 'diary') body = viewDiary();
    else body = viewProgress();
    app.innerHTML = `<div class="${animate ? 'app-in' : ''}">${body}</div>${navBar()}`;
    if (keepScroll !== false && animate !== 'top') window.scrollTo(0, y);
  }

  function setTab(tab, push) {
    if (!TABS.some(t => t.id === tab)) return;
    S.ui.tab = tab;
    if (tab === 'diary') S.ui.diaryDate = S.ui.diaryDate || todayISO();
    if (tab === 'plan') {
      const idx = planIndexForDate(todayISO());
      S.ui.planWeek = Math.floor(idx / 7);
      S.ui.planDay = idx % 7;
    }
    save();
    try { history.replaceState(null, '', '#' + tab); } catch (e) {}
    render(true, false);
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ onboarding */
  function onboarding() {
    const p = S.profile;
    const age = ageNow();
    return `<div class="onboard">
      <div class="onboard-top">
        <div class="onboard-brand"><span class="logo-mark">${ICONS.sun}</span>Тепло</div>
        <span class="tiny muted">дневник питания</span>
      </div>
      <div class="onboard-hero">
        <p class="onboard-kicker">персональный план для ${esc(genitiveName(p.name))}</p>
        <h1>Питание<br>без <em>давления</em>.</h1>
        <p class="onboard-lead">Тёплый дневник, который помогает держать курс: готовое меню, простые рецепты и бережный темп — без запретов и чувства вины.</p>
        <div class="feature-list">
          <div class="feature"><span class="f-ico">${ICONS.calendar}</span><span><b>План на месяц</b>28 дней, 4 приёма пищи, рецепты и список покупок.</span></div>
          <div class="feature"><span class="f-ico">${ICONS.book}</span><span><b>Дневник в один касание</b>Отмечай приёмы по плану или добавляй своё.</span></div>
          <div class="feature"><span class="f-ico">${ICONS.chart}</span><span><b>Бережный темп</b>0,4–0,6 кг в неделю — без голодовок и чувства вины.</span></div>
        </div>
        <div class="profile-card">
          <div class="profile-grid">
            <div class="pg"><b>${age}</b><span>${plural(age, 'год', 'года', 'лет')}</span></div>
            <div class="pg"><b>${p.height}</b><span>см</span></div>
            <div class="pg"><b>${fmt(p.startWeight)}</b><span>кг сейчас</span></div>
            <div class="pg"><b>${fmt(p.goalWeight)}</b><span>кг цель</span></div>
          </div>
          <div class="profile-note">Ориентир: <b>${fmt(p.kcal)} ккал</b> · <b>${p.protein} г белка</b> · <b>2 л воды</b> в день. Дефицит около 575 ккал — достаточно, чтобы худеть, и мягко, чтобы удержать результат.</div>
        </div>
        <label class="name-label" for="onboard-name">Имя</label>
        <input class="input" id="onboard-name" maxlength="24" autocomplete="given-name" value="${esc(p.name)}" placeholder="Как тебя зовут">
        <button class="btn wide onboard-cta" data-act="onboard-start">${ICONS.sparkles} Начать</button>
        <p class="safety-note"><b>Важно.</b> План рассчитан на здоровую взрослую девушку. Он не заменяет консультацию врача. При беременности, расстройстве пищевого поведения, проблемах со щитовидной железой, ЖКТ или приёме лекарств сначала обсуди питание со специалистом.</p>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ today */
  function viewToday() {
    const date = todayISO();
    const plan = planForDate(date);
    const t = totalsFor(date);
    const p = S.profile;
    const targets = planTotals(plan);
    const remaining = p.kcal - t.kcal;
    const over = remaining < 0;
    const pct = clamp(t.kcal / p.kcal * 100, 0, 100);
    const water = getLog(date).water;
    const cupCount = Math.max(1, Math.round(p.water / 250));
    const cups = Array.from({ length: cupCount }, (_, i) => {
      const filled = water >= (i + 1) * 250;
      return `<button class="cup ${filled ? 'on' : ''}" data-act="water" data-i="${i}" aria-label="${filled ? 'Убрать' : 'Добавить'} 250 мл воды">${ICONS.drop}</button>`;
    }).join('');
    const mealRows = scaledMeals(plan).map(m => {
      const por = portion(date, m.id);
      return `<div class="meal-row ${por > 0 ? 'done' : ''}">
        <button class="meal-open" data-act="open-meal" data-date="${date}" data-meal="${m.id}" aria-label="${MEAL_META[m.id].name}: ${esc(m.dish)}">
          ${mealMark(m.id)}
          <span class="meal-body">
            <span class="meal-top"><span class="meal-name">${MEAL_META[m.id].name}</span><span class="meal-time">${MEAL_META[m.id].time}</span></span>
            <span class="meal-dish">${esc(m.dish)}</span>
            <span class="meal-meta">${fmt(m.kcal)} ккал · ${m.protein} г белка${por > 0 && por !== 1 ? ' · ' + portionText(por) : ''}</span>
          </span>
        </button>
        <button class="check ${por > 0 ? 'on' : ''}" data-act="toggle-meal" data-date="${date}" data-meal="${m.id}" aria-label="${por > 0 ? 'Убрать' : 'Записать'} ${MEAL_META[m.id].name}">${ICONS.check}</button>
      </div>`;
    }).join('');
    const name = S.profile.name ? `, ${esc(S.profile.name)}` : '';
    return pageHead(dateFull(date), `${greeting()}${name}`, 'Сегодня — с заботой о себе. Без спешки и чувства вины.') + `
      <div class="pad">
        <section class="hero">
          <div class="hero-grid">
            <div class="ring-wrap">
              <div class="ring" style="--p:${pct}">
                <div class="ring-center">
                  <div class="ring-num">${over ? '+' : ''}${fmt(Math.abs(remaining))}</div>
                  <div class="ring-lab">${over ? 'перебор' : 'осталось'}</div>
                  <div class="ring-sub">из ${fmt(p.kcal)} ккал</div>
                </div>
              </div>
            </div>
            <div class="hero-side">
              <div class="hero-over">${over ? 'Чуть больше цели' : 'Твой ориентир'}</div>
              <div class="hero-eaten"><b>${fmt(t.kcal)}</b> ккал съедено</div>
              <div class="hero-remain">${over ? `на ${fmt(-remaining)} ккал больше` : `${fmt(remaining)} ккал можно ещё`}</div>
              <div class="hero-macros">
                ${macroLine('Белки', t.p, targets.p)}
                ${macroLine('Жиры', t.f, targets.f)}
                ${macroLine('Углеводы', t.c, targets.c)}
              </div>
            </div>
          </div>
          <div class="hero-actions">
            <button class="btn" data-act="add-food" data-date="${date}" data-meal="${defaultMeal()}">${ICONS.plus} Добавить еду</button>
            <button class="btn soft" data-act="water-quick">${ICONS.drop} +250 мл</button>
          </div>
        </section>

        <div class="section">
          <div class="section-head">
            <h2>Приёмы пищи</h2>
            <span class="side">${t.meals} из 4 · ${fmt(kcalTarget())} ккал</span>
          </div>
          <div class="meal-stack">${mealRows}</div>
        </div>

        <div class="section">
          <div class="section-head"><h2>Вода</h2><span class="side">${(water / 1000).toFixed(1).replace('.', ',')} из ${(p.water / 1000).toFixed(1).replace('.', ',')} л</span></div>
          <div class="card water-card">
            <div class="water-head">
              <div class="water-title">${ICONS.drop} Сегодня</div>
              <div class="water-value"><b>${(water / 1000).toFixed(1).replace('.', ',')}</b> / ${(p.water / 1000).toFixed(1).replace('.', ',')} л</div>
            </div>
            <div class="cups">${cups}</div>
            <div class="water-note">Нажимай на стакан, чтобы отметить 250 мл. Последний — чтобы убрать.</div>
          </div>
        </div>

        <div class="section">
          <div class="tip-card">
            <span class="tip-ico">${ICONS.spark}</span>
            <div class="t"><b>Маленький шаг</b>${esc(tipForToday())}</div>
          </div>
        </div>

        <p class="footer-note">Тепло · всё хранится только на этом телефоне<br>План не заменяет консультацию врача</p>
      </div>`;
  }

  /* ------------------------------------------------------------------ plan */
  function viewPlan() {
    const w = clamp(Number(S.ui.planWeek) || 0, 0, 3);
    const d = clamp(Number(S.ui.planDay) || 0, 0, 6);
    const flat = w * 7 + d;
    const plan = PLAN[flat];
    const meta = MONTH_WEEKS[w] || MONTH_WEEKS[0];
    const t = planTotals(plan);
    const currentIndex = planIndexForDate(todayISO());
    const isToday = flat === currentIndex;
    const logDate = isToday ? todayISO() : '';
    const weekAvg = Math.round(kcalTarget() / 10) * 10;
    const weekTabs = MONTH_WEEKS.map((mw, i) => `
      <button class="week-tab ${i === w ? 'on' : ''}" data-act="plan-week" data-i="${i}">
        <b>Неделя ${i + 1}</b><span>${esc(mw.title)}</span>
      </button>`).join('');
    const scaled = scaledMeals(plan);
    const week = PLAN.slice(w * 7, w * 7 + 7).map((day, j) => {
      return `<button class="day-pill ${j === d ? 'on' : ''} ${w * 7 + j === currentIndex ? 'today' : ''}" data-act="plan-day" data-i="${j}">
        <span class="dn">${day.short}</span><span class="dk">${fmt(kcalTarget())}</span>
      </button>`;
    }).join('');
    const meals = scaled.map(m => `
      <div class="plan-meal card card-flat">
        <div class="plan-meal-head">
          ${mealMark(m.id)}
          <div class="meta">
            <div class="slot">${MEAL_META[m.id].name} · ${MEAL_META[m.id].time}</div>
            <div class="dish">${esc(m.dish)}</div>
          </div>
          <div class="kcal"><b>${fmt(m.kcal)}</b>ккал</div>
        </div>
        <ul class="plan-items">${m.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="plan-meal-foot">
          <div class="plan-macros">Б ${m.protein} · Ж ${m.fat} · У ${m.carbs} · клетчатка ${fmt1(m.fiber)}</div>
          <button class="recipe-link" data-act="open-meal" data-date="${logDate}" data-day="${flat}" data-meal="${m.id}">Рецепт ${ICONS.arrow}</button>
        </div>
      </div>`).join('');
    return pageHead('4 недели · 28 дней', 'План', `Месячный план: около ${fmt(weekAvg)} ккал в день, много белка и овощей. ${w + 1}-я неделя — ${esc(meta.title.toLowerCase())}.`) + `
      <div class="pad">
        <div class="week-tabs">${weekTabs}</div>
        <div class="week">${week}</div>
        <section class="plan-intro card card-flat">
          <div class="plan-theme">Неделя ${w + 1} · ${esc(meta.title)} · день ${flat + 1}</div>
          <h2 class="plan-title">${esc(plan.theme)}</h2>
          <p class="plan-note">${esc(plan.note)}</p>
          <p class="week-focus">${esc(meta.note)}</p>
          <div class="plan-totals">
            <span class="chip-stat"><b>${fmt(kcalTarget())}</b> ккал</span>
            <span class="chip-stat"><b>${Math.round(t.p)}</b> г белка</span>
            <span class="chip-stat"><b>${Math.round(t.f)}</b> г жиров</span>
            <span class="chip-stat"><b>${Math.round(t.c)}</b> г углеводов</span>
          </div>
          <p class="plan-adapt">Порции автоматически подстроены под ${fmt(kcalTarget())} ккал; белок сохранён.</p>
        </section>

        <div class="section-head" style="margin-top:22px"><h2>Меню дня</h2><span class="side">${plan.meals.length} приёма · день ${flat + 1}</span></div>
        ${meals}

        <button class="shop-cta" data-act="open-shop">
          <span class="ico">${ICONS.cart}</span>
          <span class="txt"><b>Список покупок на неделю</b><span>${SHOP.reduce((a, g) => a + g.items.length, 0)} ${plural(SHOP.reduce((a, g) => a + g.items.length, 0), 'продукт', 'продукта', 'продуктов')} · подходит для всех 4 недель</span></span>
          <span class="arr">${ICONS.right}</span>
        </button>

        <div class="card card-tight" style="margin-top:10px">
          <p class="small muted" style="line-height:1.6;margin:0"><b style="color:var(--ink-soft)">Как устроен месяц.</b> Это 4-недельный цикл: семь сбалансированных меню идут в разном порядке, поэтому дни не повторяются подряд. Через 28 дней цикл начинается заново — закупки и готовка остаются простыми.</p>
        </div>

        <div class="section">
          <div class="section-head"><h2>Если хочется замены</h2></div>
          <div class="card card-tight">
            <p class="small muted" style="line-height:1.6;margin:0">Курицу можно заменить на индейку, рыбу — на креветки или тофу, гречку — на рис или киноа в той же порции. Овощи увеличивай свободно. Главное — сохранить белок и примерный размер порции.</p>
          </div>
        </div>

        <div class="tip-card" style="margin-top:10px">
          <span class="tip-ico">${ICONS.info}</span>
          <div class="t"><b>Почему не 1200 ккал</b>Резкий дефицит даёт быстрый отвес, но часто забирает мышцы, энергию и сон. Здесь дефицит около 575 ккал: достаточно, чтобы худеть, и мягко, чтобы удержать результат.</div>
        </div>
        <div class="tip-card" style="margin-top:10px">
          <span class="tip-ico">${ICONS.spark}</span>
          <div class="t"><b>Движение без спортзала</b>30–40 минут ходьбы в день и 7–8 тысяч шагов помогают дефициту, не добавляя тревоги. Начни с прогулки после обеда.</div>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ diary */
  function viewDiary() {
    let date = S.ui.diaryDate || todayISO();
    if (date > todayISO()) date = todayISO();
    const plan = planForDate(date);
    const t = totalsFor(date);
    const p = S.profile;
    const targets = planTotals(plan);
    const isToday = date === todayISO();
    const label = isToday ? 'Сегодня' : cap(WEEKDAYS[weekdayIndex(date)]);
    const parts = humanDate(date).split(' ');
    const detail = `${parts[0]} ${parts[1]}${parts[2] ? ' ' + parts[2] : ''}`;
    const blocks = scaledMeals(plan).map(m => {
      const por = portion(date, m.id);
      const extras = extrasFor(date, m.id);
      const mt = mealTotal(date, m.id);
      const entries = [];
      if (por > 0) {
        entries.push(`<div class="entry planned">
          <div class="entry-main">
            <div class="entry-title">${esc(m.dish)}</div>
            <div class="entry-sub">${portionText(por)} · Б ${fmt(m.protein * por)} · Ж ${fmt(m.fat * por)} · У ${fmt(m.carbs * por)}</div>
          </div>
          <div class="entry-kcal"><b>${fmt(m.kcal * por)}</b> ккал</div>
          <button class="entry-x" data-act="toggle-meal" data-date="${date}" data-meal="${m.id}" aria-label="Убрать из дневника">${ICONS.close}</button>
        </div>`);
      } else {
        entries.push(`<button class="entry ghost" data-act="toggle-meal" data-date="${date}" data-meal="${m.id}" aria-label="Записать ${MEAL_META[m.id].name}">
          <div class="entry-main">
            <div class="entry-title">По плану: ${esc(m.dish)}</div>
            <div class="entry-sub">${m.kcal} ккал · нажми, чтобы записать</div>
          </div>
          <div class="entry-kcal">${ICONS.plus}</div>
        </button>`);
      }
      extras.forEach(x => {
        entries.push(`<div class="entry extra">
          <div class="entry-main">
            <div class="entry-title">${esc(x.name)}</div>
            <div class="entry-sub">${x.custom ? 'порция' : `${fmt(x.grams)} г`} · Б ${fmt1(x.p)} · Ж ${fmt1(x.f)} · У ${fmt1(x.c)}</div>
          </div>
          <div class="entry-kcal"><b>${fmt(x.kcal)}</b> ккал</div>
          <button class="entry-x" data-act="del-extra" data-id="${esc(x.id)}" aria-label="Удалить">${ICONS.trash}</button>
        </div>`);
      });
      return `<div class="diary-block">
        <div class="diary-head">
          <span class="ico">${mealIcon(m.id)}</span><span class="nm">${MEAL_META[m.id].name}</span><span class="tm">${MEAL_META[m.id].time}</span>
          <span class="sum">${fmt(mt.kcal)} ккал</span>
          <button class="add-round" data-act="add-food" data-date="${date}" data-meal="${m.id}" aria-label="Добавить еду">${ICONS.plus}</button>
        </div>
        ${entries.join('')}
      </div>`;
    }).join('');
    const note = getLog(date).note;
    const remaining = p.kcal - t.kcal;
    return pageHead('Что было на самом деле', 'Дневник', 'Записывай по плану или добавляй своё — без оценок и чувства вины.') + `
      <div class="pad">
        <div class="date-nav">
          <button class="arrow" data-act="diary-prev" aria-label="Предыдущий день">${ICONS.left}</button>
          <button class="label" data-act="diary-today" aria-label="Вернуться к сегодня">
            <b>${esc(label)}</b><span>${esc(detail)}</span>
          </button>
          <button class="arrow" data-act="diary-next" aria-label="Следующий день" ${isToday ? 'disabled' : ''}>${ICONS.right}</button>
        </div>

        <section class="diary-summary">
          <div class="ds-top">
            <div><div class="ds-label">Съедено</div><div class="ds-big">${fmt(t.kcal)}<span>из ${fmt(p.kcal)} ккал</span></div></div>
            <div class="ds-remain"><b>${remaining >= 0 ? fmt(remaining) : '+' + fmt(-remaining)}</b><span>${remaining >= 0 ? 'осталось' : 'перебор'}</span></div>
          </div>
          <div class="ds-bars">
            <div class="ds-bar"><span class="n">Белки</span><span class="t"><i style="width:${clamp(t.p / targets.p * 100, 0, 100)}%"></i></span><span class="v">${fmt(t.p)} / ${Math.round(targets.p)} г</span></div>
            <div class="ds-bar"><span class="n">Жиры</span><span class="t"><i style="width:${clamp(t.f / targets.f * 100, 0, 100)}%"></i></span><span class="v">${fmt(t.f)} / ${Math.round(targets.f)} г</span></div>
            <div class="ds-bar"><span class="n">Углеводы</span><span class="t"><i style="width:${clamp(t.c / targets.c * 100, 0, 100)}%"></i></span><span class="v">${fmt(t.c)} / ${Math.round(targets.c)} г</span></div>
          </div>
        </section>

        ${blocks}

        <div class="card note-card">
          <div class="note-head">${ICONS.note} Заметка дня</div>
          <textarea data-note data-date="${date}" maxlength="500" placeholder="Как прошёл день? Что заметила?">${esc(note)}</textarea>
        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ progress */
  function chartData() {
    const all = weightsSorted();
    if (S.ui.chart === 'all' || all.length < 2) return all;
    const days = S.ui.chart === '1m' ? 30 : 90;
    const cut = addDays(todayISO(), -days);
    const idx = all.findIndex(x => x.date >= cut);
    if (idx < 0) return all.slice(-2);
    return all.slice(Math.max(0, idx - 1));
  }

  function chartSVG(list) {
    if (!list.length) return '';
    const W = 340, H = 180, L = 34, R = 12, T = 14, B = 26;
    const vals = list.map(x => Number(x.kg));
    let min = Math.min(...vals), max = Math.max(...vals);
    const span = Math.max(max - min, 1.4);
    min -= span * 0.18; max += span * 0.18;
    const ts = list.map(x => parseISO(x.date).getTime());
    const tmin = Math.min(...ts), tmax = Math.max(...ts);
    const x = i => tmax === tmin ? L + (W - L - R) / 2 : L + (W - L - R) * (ts[i] - tmin) / (tmax - tmin);
    const y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
    let grid = '';
    for (let i = 0; i < 3; i++) {
      const v = min + (max - min) * i / 2;
      const yy = y(v);
      grid += `<line x1="${L}" y1="${yy.toFixed(1)}" x2="${W - R}" y2="${yy.toFixed(1)}" stroke="#EADCCB" stroke-width="1" stroke-dasharray="2 4"/>`;
      grid += `<text x="${L - 6}" y="${(yy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#A39181" font-family="-apple-system, sans-serif">${fmt1(v)}</text>`;
    }
    let pts = '';
    list.forEach((e, i) => { pts += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(e.kg).toFixed(1)} `; });
    const area = `${pts}L${x(list.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z`;
    let dots = '';
    list.forEach((e, i) => {
      dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(e.kg).toFixed(1)}" r="3.2" fill="#FFFCF7" stroke="#B77B58" stroke-width="1.8"/>`;
    });
    const goal = Number(S.profile.goalWeight);
    let goalLine = '';
    if (goal >= min && goal <= max) {
      goalLine = `<line x1="${L}" y1="${y(goal).toFixed(1)}" x2="${W - R}" y2="${y(goal).toFixed(1)}" stroke="#8B9A7B" stroke-width="1.2" stroke-dasharray="4 4" opacity=".8"/>
        <text x="${W - R}" y="${(y(goal) - 5).toFixed(1)}" text-anchor="end" font-size="7.5" fill="#718264" font-family="-apple-system, sans-serif">цель ${fmt(goal)}</text>`;
    }
    const first = list[0], last = list[list.length - 1];
    return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="График изменения веса">
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B77B58" stop-opacity=".23"/><stop offset="1" stop-color="#B77B58" stop-opacity="0"/></linearGradient></defs>
      ${grid}
      <line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#E2D1BE" stroke-width="1"/>
      <path d="${area}" fill="url(#areaGrad)"/>
      <path d="${pts}" fill="none" stroke="#B77B58" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      ${goalLine}${dots}
      <text x="${L}" y="${H - 7}" font-size="7.5" fill="#A39181" font-family="-apple-system, sans-serif">${shortDate(first.date)}</text>
      ${list.length > 1 ? `<text x="${W - R}" y="${H - 7}" text-anchor="end" font-size="7.5" fill="#A39181" font-family="-apple-system, sans-serif">${shortDate(last.date)}</text>` : ''}
    </svg>`;
  }

  function viewProgress() {
    const list = weightsSorted();
    const cur = currentWeight();
    const start = startWeight();
    const goal = Number(S.profile.goalWeight);
    const lost = start.kg - cur.kg;
    const toGoal = cur.kg - goal;
    const total = Math.max(0.1, start.kg - goal);
    const pct = clamp(lost / total * 100, 0, 100);
    const rate = ratePerWeek(list);
    const proj = projectionLabel();
    const chart = chartData();
    const milestone = Math.max(goal + 0.1, start.kg - 4);
    const toMilestone = cur.kg - milestone;
    const delta = list.length > 1 ? +(list[list.length - 1].kg - list[list.length - 2].kg).toFixed(1) : 0;
    const rows = [...list].reverse().slice(0, 10).map((e, idx, arr) => {
      const chrono = [...list].reverse();
      const i = chrono.indexOf(e);
      const prev = chrono[i + 1];
      const ch = prev ? e.kg - prev.kg : null;
      return `<div class="history-row">
        <div class="dt">${humanDate(e.date)}</div>
        <div class="kg">${fmt1(e.kg)} кг</div>
        <div class="ch ${ch > 0 ? 'up' : ''}">${ch == null ? 'старт' : signed(ch) + ' кг'}</div>
        <button class="del" data-act="del-weight" data-date="${e.date}" aria-label="Удалить замер">${ICONS.trash}</button>
      </div>`;
    }).join('');
    const rangeTabs = [['1m', '1М'], ['3m', '3М'], ['all', 'Всё']].map(([id, l]) => `<button class="chart-tab ${S.ui.chart === id ? 'on' : ''}" data-act="chart-range" data-range="${id}">${l}</button>`).join('');
    return pageHead('Не цифра, а динамика', 'Прогресс', 'Смотрим на тренд, а не на колебания. Вес утром — всего одна точка.') + `
      <div class="pad">
        <section class="card weight-hero">
          <div class="wh-top">
            <div>
              <div class="wh-label">Сейчас</div>
              <div class="wh-num">${fmt1(cur.kg)}<span>кг</span></div>
              <div class="wh-goal">Цель ${fmt(goal)} кг${toGoal > 0 ? ` · осталось ${fmt1(toGoal)} кг` : ' · цель достигнута'}</div>
            </div>
            <div class="delta-pill ${lost < 0 ? 'up' : ''}">${lost === 0 ? 'старт' : `${signed(-lost)} кг`}${lost !== 0 ? '<span class="tiny" style="font-weight:600;opacity:.8">с начала</span>' : ''}</div>
          </div>
          <div class="goal-track">
            <div class="goal-fill" style="width:${pct}%"></div>
            <div class="goal-knob" style="left:${pct}%"></div>
          </div>
          <div class="goal-labels"><span>${fmt1(start.kg)} кг</span><span>${fmt(goal)} кг</span></div>
          <div class="milestone-line"><span class="ml-label">Первый рубеж</span><b>${fmt1(milestone)} кг</b><span class="ml-state">${toMilestone > 0 ? `ещё ${fmt1(toMilestone)} кг` : 'пройден'}</span></div>
        </section>

        <div class="stats3">
          <div class="stat-box"><div class="v">${lost >= 0 ? '−' + fmt1(lost) : '+' + fmt1(Math.abs(lost))}</div><div class="l">кг с начала</div></div>
          <div class="stat-box"><div class="v">${rate == null ? '—' : signed(rate) }</div><div class="l">кг в неделю</div></div>
          <div class="stat-box"><div class="v">${toGoal > 0 ? fmt1(toGoal) : '0'}</div><div class="l">кг до цели</div></div>
        </div>

        <div class="card chart-card" style="margin-top:10px">
          <div class="chart-head">
            <div class="chart-title">Вес</div>
            <div class="chart-tabs">${rangeTabs}</div>
          </div>
          ${chart.length ? chartSVG(chart) : '<div class="chart-empty">Пока нет замеров. Добавь первый — и здесь появится линия.</div>'}
          ${chart.length === 1 ? '<div class="chart-empty" style="padding:8px 4px 2px">Добавь второй замер, чтобы увидеть динамику.</div>' : ''}
          <div class="chart-foot">${cur.kg <= goal ? 'Цель достигнута — можно перейти на поддержание.' : proj !== '—' ? `При текущем темпе цель — примерно ${proj}.` : rate != null && rate >= 0 ? 'Вес пока стоит или растёт. Это данные, а не приговор: смотрим на тренд дальше.' : 'Темп появится, когда будет хотя бы два замера.'}</div>
        </div>

        <div class="card form-card">
          <div class="form-title">Новый замер</div>
          <div class="form-row">
            <div class="field"><label for="w-date">Дата</label><input class="input" type="date" id="w-date" value="${todayISO()}" max="${todayISO()}"></div>
            <div class="field"><label for="w-kg">Вес, кг</label><input class="input" type="number" inputmode="decimal" step="0.1" min="35" max="250" id="w-kg" placeholder="${fmt1(cur.kg)}"></div>
          </div>
          <button class="btn wide" data-act="save-weight">${ICONS.scale} Сохранить замер</button>
        </div>

        <div class="section-head" style="margin-top:22px"><h2>История</h2><span class="side">${list.length} ${plural(list.length, 'замер', 'замера', 'замеров')}</span></div>
        <div class="card card-tight">
          ${rows || '<div class="empty-state">Пока нет записей</div>'}
        </div>
        <div class="progress-note">${ICONS.info}<span>Взвешивайся утром, после туалета и до еды. Смотри на среднее за неделю: вода и соль могут дать ±1–2 кг, это нормально.</span></div>
      </div>`;
  }

  /* ------------------------------------------------------------------ sheet core */
  let lastFocus = null;
  function sheetShell(content, label) {
    return `<div class="sheet-backdrop" data-act="sheet-close"></div>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(label || 'Окно')}">
        <div class="sheet-grab"></div>
        <div class="sheet-scroll">${content}</div>
      </div>`;
  }
  function mountSheet(content, label) {
    const sheet = $('#sheet');
    if (sheet.hidden || !sheet.classList.contains('open')) {
      lastFocus = document.activeElement;
      sheet.innerHTML = sheetShell(content, label);
      sheet.hidden = false;
      document.body.classList.add('locked');
      requestAnimationFrame(() => sheet.classList.add('open'));
    } else {
      const sc = $('.sheet-scroll', sheet);
      if (sc) { sc.innerHTML = content; sc.scrollTop = 0; }
    }
  }
  function closeSheet() {
    const sheet = $('#sheet');
    if (!sheet || sheet.hidden) return;
    sheet.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => {
      if (!sheet.classList.contains('open')) { sheet.hidden = true; sheet.innerHTML = ''; }
    }, 330);
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
    }
  }
  function sheetHead(kicker, title, sub) {
    return `<div class="sheet-head">
      <div><p class="sheet-kicker">${esc(kicker)}</p><h2 class="sheet-title">${title}</h2>${sub ? `<p class="sheet-sub">${sub}</p>` : ''}</div>
      <button class="sheet-close" data-act="sheet-close" aria-label="Закрыть">${ICONS.close}</button>
    </div>`;
  }

  /* ------------------------------------------------------------------ meal detail */
  function openMeal(date, mealId, planDay) {
    const dayIndex = planDay !== undefined && planDay !== '' ? clamp(Number(planDay), 0, 27) : planIndexForDate(todayISO());
    const plan = date ? planForDate(date) : PLAN[dayIndex];
    const base = plan.meals.find(x => x.id === mealId);
    if (!base) return;
    const m = scaledMeal(base, plan);
    const por = date ? portion(date, mealId) : 0;
    const canLog = !!date;
    const portionButtons = canLog ? `<div class="detail-section">
      <h3 class="detail-title">Сколько съела</h3>
      <div class="seg" style="width:100%">
        ${[0.5, 1, 1.5].map(p => `<button class="${por === p ? 'on' : ''}" style="flex:1" data-act="meal-portion" data-date="${date}" data-meal="${mealId}" data-p="${p}">${p === 0.5 ? '½' : p === 1.5 ? '1½' : '1'} порция</button>`).join('')}
      </div>
      <p class="tiny muted" style="margin:7px 0 0">Порция запишется сразу. Можно изменить или убрать в дневнике.</p>
    </div>` : `<div class="detail-tip">${ICONS.info}<span>Это меню на ${esc(plan.full.toLowerCase())}. Записать его в дневник можно в этот день цикла.</span></div>`;
    const content = `
      <div class="sheet-head">
        <div class="sheet-title-row">
          ${mealMark(mealId)}
          <div><p class="sheet-kicker">${MEAL_META[mealId].name} · ${MEAL_META[mealId].time}</p><h2 class="sheet-title">${esc(m.dish)}</h2></div>
        </div>
        <button class="sheet-close" data-act="sheet-close" aria-label="Закрыть">${ICONS.close}</button>
      </div>
      <div class="meal-detail-kcal">
        <div class="kcal-badge"><b>${fmt(m.kcal * (por || 1))}</b><span>ккал</span></div>
        <div class="kcal-badge"><b>${fmt(m.protein * (por || 1))}</b><span>белки</span></div>
        <div class="kcal-badge"><b>${fmt(m.fat * (por || 1))}</b><span>жиры</span></div>
        <div class="kcal-badge"><b>${fmt(m.carbs * (por || 1))}</b><span>углеводы</span></div>
      </div>
      <div class="detail-section">
        <h3 class="detail-title">Состав</h3>
        <ul class="ingredients">${m.items.map(x => {
          const parts = x.split(' — ');
          return `<li><span>${esc(parts[0])}</span><span>${esc(parts[1] || '')}</span></li>`;
        }).join('')}</ul>
      </div>
      <div class="detail-section">
        <h3 class="detail-title">Как готовить</h3>
        <ol class="steps">${m.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>
      <div class="detail-tip">${ICONS.spark}<span>${esc(m.tip)}</span></div>
      ${portionButtons}
      <div class="sheet-actions">
        ${canLog && por > 0 ? `<button class="btn ghost" data-act="meal-clear" data-date="${date}" data-meal="${mealId}">Убрать</button>` : ''}
        <button class="btn" data-act="sheet-close">${canLog && por > 0 ? 'Готово' : 'Понятно'}</button>
      </div>`;
    mountSheet(content, m.dish);
  }

  /* ------------------------------------------------------------------ food picker */
  let picker = null;
  function planMealRows(date) {
    const plan = planForDate(date);
    return scaledMeals(plan).map(m => {
      const done = portion(date, m.id) > 0;
      return `<button class="food-row" data-act="picker-plan-meal" data-date="${date}" data-meal="${m.id}" ${done ? 'disabled' : ''}>
        <span class="food-dot ${m.id === 'breakfast' ? 'carbs' : m.id === 'lunch' ? 'protein' : m.id === 'snack' ? 'fruit' : 'veg'}"></span>
        <span class="food-main"><span class="food-name">${esc(m.dish)}</span><span class="food-macros">${MEAL_META[m.id].name} · ${m.protein} г белка</span></span>
        <span class="food-kcal"><b>${fmt(m.kcal)}</b> ккал</span>
        <span class="food-plus">${done ? ICONS.check : ICONS.plus}</span>
      </button>`;
    }).join('');
  }
  function foodRowsHTML() {
    const q = (picker.q || '').toLowerCase().replace(/ё/g, 'е').trim();
    const cat = picker.cat || 'all';
    const list = FOODS.filter(f => (cat === 'all' || f.cat === cat) && (!q || (f.n.toLowerCase().replace(/ё/g, 'е').includes(q))));
    if (!list.length) return '<div class="empty-state">Ничего не нашлось.<br>Попробуй другое слово или добавь своё блюдо.</div>';
    return list.map(f => `<button class="food-row" data-act="food-pick" data-id="${f.id}">
      <span class="food-dot ${f.cat}"></span>
      <span class="food-main"><span class="food-name">${esc(f.n)}</span><span class="food-macros">на 100 г · Б ${fmt1(f.p)} · Ж ${fmt1(f.f)} · У ${fmt1(f.c)}</span></span>
      <span class="food-kcal"><b>${f.kcal}</b> ккал</span>
      <span class="food-plus">${ICONS.plus}</span>
    </button>`).join('');
  }
  function pickerTabs() {
    return `<div class="seg picker-tabs" style="margin-top:14px">
      <button class="${picker.tab === 'search' ? 'on' : ''}" data-act="picker-tab" data-tab="search">Поиск</button>
      <button class="${picker.tab === 'custom' ? 'on' : ''}" data-act="picker-tab" data-tab="custom">Своё</button>
      <button class="${picker.tab === 'plan' ? 'on' : ''}" data-act="picker-tab" data-tab="plan">Из плана</button>
    </div>`;
  }
  function pickerHTML() {
    if (!picker) return '';
    if (picker.selected) {
      const f = picker.selected;
      const g = Number(picker.grams) || f.g;
      const meal = picker.meal;
      const pv = {
        kcal: Math.round(f.kcal * g / 100),
        p: round1(f.p * g / 100),
        f: round1(f.f * g / 100),
        c: round1(f.c * g / 100)
      };
      return `<div class="sheet-head">
        <div style="display:flex;gap:10px;align-items:flex-start;flex:1">
          <button class="sheet-close" data-act="food-back" aria-label="Назад">${ICONS.left}</button>
          <div><p class="sheet-kicker">Порция</p><h2 class="sheet-title" style="font-size:22px">${esc(f.n)}</h2></div>
        </div>
        <button class="sheet-close" data-act="sheet-close" aria-label="Закрыть">${ICONS.close}</button>
      </div>
      <div class="portion-panel" style="margin-top:16px">
        <div class="portion-top"><div><div class="portion-name">Сколько грамм?</div><div class="portion-per">${esc(f.n)} · на 100 г: ${f.kcal} ккал · Б ${fmt1(f.p)} · Ж ${fmt1(f.f)} · У ${fmt1(f.c)}</div></div></div>
        <div class="gram-row" style="margin-top:13px">
          <input class="gram-input" id="gram-input" type="number" inputmode="decimal" min="1" max="2000" step="1" value="${g}" aria-label="Граммы">
          <div style="flex:0 0 auto;display:flex;align-items:center;padding-right:8px;font-size:11px;color:var(--muted)">грамм</div>
        </div>
        <div class="gram-quick">${[50, 100, 150, 200].map(v => `<button class="${Number(g) === v ? 'on' : ''}" data-act="gram-quick" data-g="${v}">${v} г</button>`).join('')}</div>
        <div class="detail-section" style="margin-top:16px">
          <h3 class="detail-title">Приём пищи</h3>
          <div class="meal-pick">${MEAL_IDS.map(id => `<button class="${meal === id ? 'on' : ''}" data-act="picker-meal" data-meal="${id}">${MEAL_META[id].name}</button>`).join('')}</div>
        </div>
        <div class="portion-preview">
          <div class="pv"><b id="pv-kcal">${pv.kcal}</b><span>ккал</span></div>
          <div class="pv"><b id="pv-p">${fmt1(pv.p)}</b><span>белки</span></div>
          <div class="pv"><b id="pv-f">${fmt1(pv.f)}</b><span>жиры</span></div>
          <div class="pv"><b id="pv-c">${fmt1(pv.c)}</b><span>углеводы</span></div>
        </div>
        <button class="btn wide" style="margin-top:15px" data-act="food-add">Добавить в дневник</button>
      </div>`;
    }
    let body = '';
    if (picker.tab === 'search') {
      body = `<div class="search-wrap">${ICONS.search}<input class="search-input" id="food-search" type="search" placeholder="Найти продукт" value="${esc(picker.q)}" autocomplete="off"></div>
        <div class="cat-scroll">${CATS.map(c => `<button class="cat-chip ${picker.cat === c.id ? 'on' : ''}" data-act="food-cat" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
        <div class="food-list" id="food-list">${foodRowsHTML()}</div>`;
    } else if (picker.tab === 'custom') {
      body = `<p class="sheet-sub" style="margin:14px 0 4px">Введи данные на всю порцию — удобно для кафе или домашнего блюда.</p>
        <div class="portion-panel">
          <div class="field"><label for="c-name">Название</label><input class="input" id="c-name" maxlength="60" placeholder="Например, салат с курицей"></div>
          <div class="form-row" style="margin-top:9px">
            <div class="field"><label for="c-kcal">Калории</label><input class="input" id="c-kcal" type="number" inputmode="numeric" min="0" max="3000" placeholder="350"></div>
            <div class="field"><label for="c-p">Белки, г</label><input class="input" id="c-p" type="number" inputmode="decimal" min="0" max="300" placeholder="25"></div>
          </div>
          <div class="form-row" style="margin-top:9px">
            <div class="field"><label for="c-f">Жиры, г</label><input class="input" id="c-f" type="number" inputmode="decimal" min="0" max="300" placeholder="12"></div>
            <div class="field"><label for="c-c">Углеводы, г</label><input class="input" id="c-c" type="number" inputmode="decimal" min="0" max="500" placeholder="30"></div>
          </div>
          <div class="detail-section" style="margin-top:14px">
            <h3 class="detail-title">Приём пищи</h3>
            <div class="meal-pick">${MEAL_IDS.map(id => `<button class="${picker.meal === id ? 'on' : ''}" data-act="picker-meal" data-meal="${id}">${MEAL_META[id].name}</button>`).join('')}</div>
          </div>
          <button class="btn wide" style="margin-top:15px" data-act="custom-add">Добавить в дневник</button>
        </div>`;
    } else {
      body = `<p class="sheet-sub" style="margin:14px 0 4px">Блюда из плана на ${esc(planForDate(picker.date).full.toLowerCase())}. Отметь то, что уже съела.</p>
        <div class="food-list">${planMealRows(picker.date)}</div>`;
    }
    return `${sheetHead('Добавить в дневник', 'Что ты съела?', '')}${pickerTabs()}<div id="picker-body">${body}</div>`;
  }
  function refreshPicker() {
    const sc = $('#sheet .sheet-scroll');
    if (!sc) return;
    sc.innerHTML = pickerHTML();
    sc.scrollTop = 0;
  }
  function openFoodPicker(date, meal) {
    picker = { date: date || todayISO(), meal: meal || defaultMeal(), tab: 'search', cat: 'all', q: '', selected: null, grams: null };
    mountSheet(pickerHTML(), 'Добавить еду');
  }
  function updatePortionPreview() {
    if (!picker || !picker.selected) return;
    const f = picker.selected;
    const g = clamp(Number(picker.grams) || 0, 0, 2000);
    const kcal = $('.pv #pv-kcal') || $('#pv-kcal');
    if (!kcal) return;
    $('#pv-kcal').textContent = fmt(f.kcal * g / 100);
    $('#pv-p').textContent = fmt1(f.p * g / 100);
    $('#pv-f').textContent = fmt1(f.f * g / 100);
    $('#pv-c').textContent = fmt1(f.c * g / 100);
    $$('.gram-quick button').forEach(b => b.classList.toggle('on', Number(b.dataset.g) === g));
  }

  function addExtra(date, mealId, data) {
    const l = getLog(date);
    l.extras.push(Object.assign({ id: 'e' + Date.now() + Math.random().toString(16).slice(2), mealId }, data));
    save();
    closeSheet();
    render(false);
    const label = data.custom ? data.name : `${data.name}, ${fmt(data.grams)} г`;
    toast(`${label} — записано`);
  }

  /* ------------------------------------------------------------------ shopping */
  function shopKey() { return startOfWeek(todayISO()); }
  function shopState() {
    const k = shopKey();
    const total = SHOP.reduce((a, g) => a + g.items.length, 0);
    if (!Array.isArray(S.shop[k]) || S.shop[k].length !== total) S.shop[k] = Array(total).fill(false);
    return S.shop[k];
  }
  function shopHTML() {
    const st = shopState();
    const total = st.length;
    const done = st.filter(Boolean).length;
    let idx = 0;
    const groups = SHOP.map(g => {
      const rows = g.items.map(item => {
        const i = idx++;
        return `<button class="shop-row ${st[i] ? 'done' : ''}" data-act="shop-toggle" data-i="${i}">
          <span class="shop-check">${ICONS.check}</span>
          <span class="shop-name">${esc(item.n)}</span>
          <span class="shop-qty">${esc(item.q)}</span>
        </button>`;
      }).join('');
      return `<div class="shop-group"><h3 class="shop-group-title">${esc(g.group)}</h3><div class="shop-list">${rows}</div></div>`;
    }).join('');
    return `<div class="sheet-head">
      <div><p class="sheet-kicker">На неделю · ${fmt(total)} ${plural(total, 'продукт', 'продукта', 'продуктов')}</p><h2 class="sheet-title">Покупки.</h2><p class="sheet-sub">Примерная закупка на одного человека. Отмечай, что уже куплено.</p></div>
      <button class="sheet-close" data-act="sheet-close" aria-label="Закрыть">${ICONS.close}</button>
    </div>
    <div class="shop-summary"><div class="txt"><b id="shop-done">${done}</b> из ${total} куплено</div><div class="tiny muted" id="shop-pct">${Math.round(done / total * 100)}%</div></div>
    ${groups}
    <div class="shop-tools">
      <button class="btn ghost" data-act="shop-reset">Сбросить</button>
      <button class="btn" data-act="shop-copy">${ICONS.share} Скопировать</button>
    </div>`;
  }
  function openShop() { mountSheet(shopHTML(), 'Список покупок'); }

  /* ------------------------------------------------------------------ settings */
  function settingsHTML() {
    const p = S.profile;
    const cur = currentWeight();
    const calc = calcTargets();
    const avg = scaledPlanAverages();
    return `<div class="sheet-head">
      <div><p class="sheet-kicker">Твой профиль</p><h2 class="sheet-title">Настройки.</h2><p class="sheet-sub">Всё можно изменить — под себя, а не под идеал.</p></div>
      <button class="sheet-close" data-act="sheet-close" aria-label="Закрыть">${ICONS.close}</button>
    </div>
    <div class="settings-section">
      <h3 class="settings-title">О тебе</h3>
      <div class="settings-card">
        <div class="field"><label for="set-name">Имя</label><input class="input" id="set-name" maxlength="24" value="${esc(p.name)}" placeholder="Как тебя зовут"></div>
        <div class="form-row" style="margin-top:9px">
          <div class="field"><label for="set-birth">Дата рождения</label><input class="input" id="set-birth" type="date" value="${esc(p.birthDate)}" max="${todayISO()}"></div>
          <div class="field"><label for="set-height">Рост, см</label><input class="input" id="set-height" type="number" inputmode="numeric" min="120" max="220" value="${p.height}"></div>
        </div>
        <div class="form-row" style="margin-top:9px">
          <div class="field"><label for="set-goal">Цель, кг</label><input class="input" id="set-goal" type="number" inputmode="decimal" step="0.1" min="40" max="150" value="${p.goalWeight}"></div>
          <div class="field"><label for="set-activity">Активность</label><select class="input" id="set-activity">
            <option value="1.2" ${Number(p.activity) === 1.2 ? 'selected' : ''}>Спокойный день</option>
            <option value="1.375" ${Number(p.activity) === 1.375 ? 'selected' : ''}>Умеренная</option>
            <option value="1.5" ${Number(p.activity) === 1.5 ? 'selected' : ''}>Много движения</option>
          </select></div>
        </div>
        <p class="field-hint">Цель по весу влияет на прогресс, но не на калории. Дневную калорийность меняй ниже.</p>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="settings-title">Ориентиры на день</h3>
      <div class="settings-card">
        <div class="form-row">
          <div class="field"><label for="set-kcal">Калории</label><input class="input" id="set-kcal" type="number" inputmode="numeric" min="1500" max="3000" value="${p.kcal}"></div>
          <div class="field"><label for="set-protein">Белки, г</label><input class="input" id="set-protein" type="number" inputmode="numeric" min="60" max="250" value="${Math.round(avg.p)}" readonly aria-readonly="true"></div>
        </div>
        <div class="form-row" style="margin-top:9px">
          <div class="field"><label for="set-fat">Жиры, г</label><input class="input" id="set-fat" type="number" inputmode="numeric" min="30" max="150" value="${Math.round(avg.f)}" readonly aria-readonly="true"></div>
          <div class="field"><label for="set-carbs">Углеводы, г</label><input class="input" id="set-carbs" type="number" inputmode="numeric" min="50" max="400" value="${Math.round(avg.c)}" readonly aria-readonly="true"></div>
        </div>
        <p class="field-hint">БЖУ — среднее по меню. Пересчитывается вместе с порциями: белок сохраняется, жиры и углеводы подстраиваются под калории.</p>
        <div class="form-row" style="margin-top:9px">
          <div class="field"><label for="set-water">Вода, мл</label><input class="input" id="set-water" type="number" inputmode="numeric" min="1000" max="4000" step="100" value="${p.water}"></div>
          <div class="field"><label>Текущий вес</label><input class="input" value="${fmt1(cur.kg)} кг" disabled></div>
        </div>
        <div class="calc-box">Расчёт по формуле Миффлина: основной обмен <b>${fmt(calc.bmr)} ккал</b>, норма <b>${fmt(calc.tdee)} ккал</b>. Цель <b>${fmt(p.kcal)} ккал</b> — дефицит около <b>${fmt(Math.max(0, calc.tdee - p.kcal))} ккал</b>. Не опускайся ниже 1 500 ккал без наблюдения специалиста.</div>
        <button class="btn ghost wide" style="margin-top:9px" data-act="settings-recalc">${ICONS.spark} Пересчитать по текущему весу</button>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="settings-title">Данные</h3>
      <div class="settings-card">
        <button class="settings-link" data-act="export">${ICONS.download}<span>Скачать резервную копию</span><span class="arr">${ICONS.right}</span></button>
        <button class="settings-link" data-act="import-trigger">${ICONS.upload}<span>Загрузить из файла</span><span class="arr">${ICONS.right}</span></button>
        <button class="settings-link danger-link" data-act="reset-all">${ICONS.trash}<span>Сбросить все данные</span><span class="arr">${ICONS.right}</span></button>
        <input type="file" id="import-file" accept="application/json,.json" class="sr-only">
      </div>
    </div>
    <div class="settings-section">
      <h3 class="settings-title">На iPhone</h3>
      <div class="settings-card">
        <p class="small muted" style="line-height:1.6;margin:0">Открой это приложение в Safari → нажми «Поделиться» → «На экран Домой». Оно запустится без адресной строки и будет работать офлайн. Все данные остаются на телефоне.</p>
      </div>
    </div>
    <div class="settings-section">
      <h3 class="settings-title">Важно</h3>
      <p class="safety"><b>План не заменяет консультацию врача.</b> Он рассчитан на здоровую взрослую девушку ${ageNow()} ${plural(ageNow(), 'год', 'года', 'лет')}, ${p.height} см, ${fmt1(currentWeight().kg)} кг. При беременности, расстройстве пищевого поведения, проблемах со щитовидной железой, ЖКТ или приёме лекарств сначала обсуди питание со специалистом. Резкое ограничение калорий может навредить.</p>
    </div>
    <div class="sheet-actions" style="margin-top:18px"><button class="btn wide" data-act="settings-save">Сохранить настройки</button></div>
    <p class="footer-note" style="padding-bottom:6px">Тепло · версия 1.3</p>`;
  }
  function openSettings() { mountSheet(settingsHTML(), 'Настройки'); }

  function saveSettings() {
    const name = ($('#set-name') || {}).value || '';
    const birth = ($('#set-birth') || {}).value || '';
    const height = Number(($('#set-height') || {}).value);
    const goal = Number(($('#set-goal') || {}).value);
    const activity = Number(($('#set-activity') || {}).value);
    const kcal = Number(($('#set-kcal') || {}).value);
    const protein = Number(($('#set-protein') || {}).value);
    const fat = Number(($('#set-fat') || {}).value);
    const carbs = Number(($('#set-carbs') || {}).value);
    const water = Number(($('#set-water') || {}).value);
    if (!birth || !height || !goal || !kcal || !protein || !fat || !carbs || !water) { toast('Заполни все поля'); return; }
    if (birth > todayISO() || birth < '1920-01-01') { toast('Проверь дату рождения'); return; }
    if (height < 120 || height > 220) { toast('Рост — от 120 до 220 см'); return; }
    if (goal < 40 || goal > 150) { toast('Цель — от 40 до 150 кг'); return; }
    if (kcal < 1500 || kcal > 3000) { toast('Калории — от 1 500 до 3 000'); return; }
    if (water < 1000 || water > 4000) { toast('Вода — от 1 до 4 литров'); return; }
    S.profile.name = name.trim().slice(0, 24);
    S.profile.birthDate = birth;
    S.profile.height = Math.round(height);
    S.profile.goalWeight = goal;
    S.profile.activity = activity || 1.375;
    const oldKcal = Math.round(Number(S.profile.kcal) || 1650);
    S.profile.kcal = Math.round(kcal);
    const nextAvg = scaledPlanAverages(S.profile.kcal);
    S.profile.protein = Math.round(nextAvg.p);
    S.profile.fat = Math.round(nextAvg.f);
    S.profile.carbs = Math.round(nextAvg.c);
    S.profile.water = Math.round(water);
    save();
    closeSheet();
    render(false);
    toast(S.profile.kcal !== oldKcal ? `Порции пересчитаны под ${fmt(S.profile.kcal)} ккал` : 'Настройки сохранены');
  }

  function recalcFields() {
    const c = calcTargets();
    const avg = scaledPlanAverages(c.kcal);
    if ($('#set-kcal')) $('#set-kcal').value = c.kcal;
    if ($('#set-protein')) $('#set-protein').value = Math.round(avg.p);
    if ($('#set-fat')) $('#set-fat').value = Math.round(avg.f);
    if ($('#set-carbs')) $('#set-carbs').value = Math.round(avg.c);
    toast('Калории пересчитаны — порции и БЖУ подстроятся');
  }

  function exportData() {
    const data = Object.assign({}, S, { exportedAt: new Date().toISOString(), app: 'teplo' });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `teplo-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Копия сохраняется в файл');
  }

  function resetAll() {
    if (!confirm('Удалить все записи, вес и настройки? Это действие нельзя отменить.')) return;
    localStorage.removeItem(KEY);
    S = defaults();
    save();
    closeSheet();
    render(true, false);
    window.scrollTo(0, 0);
    toast('Всё сброшено');
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !data.profile || !Array.isArray(data.weights)) throw new Error('bad');
        S = normalize(data);
        S.onboarded = true;
        save();
        closeSheet();
        render(true, false);
        toast('Данные загружены');
      } catch (e) {
        toast('Не получилось прочитать файл');
      }
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------ weights */
  function saveWeight() {
    const date = ($('#w-date') || {}).value || todayISO();
    const raw = String(($('#w-kg') || {}).value || '').replace(',', '.');
    const kg = parseFloat(raw);
    if (!kg || kg < 35 || kg > 250) { toast('Введи вес от 35 до 250 кг'); return; }
    if (date > todayISO()) { toast('Дата не может быть в будущем'); return; }
    const ex = S.weights.find(x => x.date === date);
    if (ex) ex.kg = Math.round(kg * 10) / 10;
    else S.weights.push({ date, kg: Math.round(kg * 10) / 10 });
    S.weights.sort((a, b) => a.date.localeCompare(b.date));
    save();
    render(false);
    toast('Замер сохранён');
  }
  function deleteWeight(date) {
    if (S.weights.length <= 1) { toast('Оставь хотя бы один замер'); return; }
    S.weights = S.weights.filter(x => x.date !== date);
    save();
    render(false);
    toast('Замер удалён');
  }

  /* ------------------------------------------------------------------ misc actions */
  function toggleMeal(date, mealId) {
    const p = portion(date, mealId);
    setPortion(date, mealId, p > 0 ? 0 : 1);
    render(false);
    toast(p > 0 ? 'Убрано из дневника' : `${MEAL_META[mealId].name} записан`);
  }
  function setMealPortion(date, mealId, p) {
    setPortion(date, mealId, p);
    render(false);
    openMeal(date, mealId);
    toast(p > 0 ? `${MEAL_META[mealId].name}: ${portionText(p)}` : 'Убрано из дневника');
  }
  function addWater(ml) {
    const date = todayISO();
    const l = getLog(date);
    const cupCount = Math.max(1, Math.round(S.profile.water / 250));
    l.water = clamp((l.water || 0) + ml, 0, cupCount * 250);
    save();
    render(false);
    if (ml > 0 && l.water >= S.profile.water) toast('Норма воды на сегодня — есть');
  }
  function setWater(i) {
    const date = todayISO();
    const l = getLog(date);
    const cur = Math.round((l.water || 0) / 250);
    const next = (i + 1 === cur) ? i : i + 1;
    l.water = clamp(next * 250, 0, Math.max(1, Math.round(S.profile.water / 250)) * 250);
    save();
    render(false);
  }
  function shopToggle(i, el) {
    const st = shopState();
    st[i] = !st[i];
    save();
    const row = el.closest('.shop-row');
    if (row) row.classList.toggle('done', st[i]);
    const done = st.filter(Boolean).length;
    if ($('#shop-done')) $('#shop-done').textContent = done;
    if ($('#shop-pct')) $('#shop-pct').textContent = `${Math.round(done / st.length * 100)}%`;
    if (done === st.length) toast('Всё куплено — можно готовить');
  }
  function shopCopy() {
    const st = shopState();
    let idx = 0;
    const lines = ['Список покупок — Тепло', ''];
    SHOP.forEach(g => {
      lines.push(g.group + ':');
      g.items.forEach(item => {
        lines.push(`${st[idx] ? '☑' : '☐'} ${item.n} — ${item.q}`);
        idx++;
      });
      lines.push('');
    });
    copyText(lines.join('\n'));
  }
  function copyText(text) {
    const done = () => toast('Список скопирован');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Выдели и скопируй вручную'); }
    ta.remove();
  }

  function startOnboarding() {
    const name = ($('#onboard-name') || {}).value || '';
    S.profile.name = name.trim().slice(0, 24);
    S.profile.startDate = S.profile.startDate || todayISO();
    S.onboarded = true;
    if (!S.weights.length) S.weights = [{ date: todayISO(), kg: S.profile.startWeight }];
    save();
    render(true, false);
    window.scrollTo(0, 0);
    toast('Добро пожаловать в Тепло');
  }

  /* ------------------------------------------------------------------ demo */
  function seedDemo() {
    const t = todayISO();
    S = defaults();
    S.onboarded = true;
    S.profile.name = 'Даниела';
    S.profile.startDate = addDays(t, -2);
    S.weights = [
      { date: addDays(t, -24), kg: 80.0 },
      { date: addDays(t, -18), kg: 79.5 },
      { date: addDays(t, -12), kg: 79.2 },
      { date: addDays(t, -7), kg: 78.8 },
      { date: addDays(t, -3), kg: 78.5 },
      { date: t, kg: 78.2 }
    ];
    S.log[t] = {
      meals: { breakfast: 1, lunch: 1 },
      extras: [{ id: 'e-demo', mealId: 'snack', name: 'Кофе с молоком', custom: true, grams: null, kcal: 45, p: 1.8, f: 1.5, c: 4.2, fi: 0 }],
      water: 1250,
      note: 'Первый день без спешки. Обед был вкусным, и это уже победа.'
    };
    S.log[addDays(t, -1)] = {
      meals: { breakfast: 1, lunch: 1, snack: 1, dinner: 1 },
      extras: [], water: 2000, note: ''
    };
    S.ui = { tab: 'today', planWeek: 0, planDay: 2, diaryDate: t, chart: '3m', foodCat: 'all' };
    save();
  }

  /* ------------------------------------------------------------------ events */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (el.disabled) return;

    if (act === 'tab') { setTab(el.dataset.tab); return; }
    if (act === 'onboard-start') { startOnboarding(); return; }
    if (act === 'settings') { openSettings(); return; }
    if (act === 'sheet-close') { closeSheet(); return; }
    if (act === 'open-meal') { openMeal(el.dataset.date || '', el.dataset.meal, el.dataset.day); return; }
    if (act === 'toggle-meal') { toggleMeal(el.dataset.date || todayISO(), el.dataset.meal); return; }
    if (act === 'meal-portion') { setMealPortion(el.dataset.date, el.dataset.meal, Number(el.dataset.p)); return; }
    if (act === 'meal-clear') { setPortion(el.dataset.date, el.dataset.meal, 0); closeSheet(); render(false); toast('Убрано из дневника'); return; }
    if (act === 'add-food') { openFoodPicker(el.dataset.date || todayISO(), el.dataset.meal); return; }
    if (act === 'water') { setWater(Number(el.dataset.i)); return; }
    if (act === 'water-quick') { addWater(250); return; }
    if (act === 'diary-prev') { S.ui.diaryDate = addDays(S.ui.diaryDate || todayISO(), -1); save(); render(true); window.scrollTo(0, 0); return; }
    if (act === 'diary-next') {
      const next = addDays(S.ui.diaryDate || todayISO(), 1);
      if (next <= todayISO()) { S.ui.diaryDate = next; save(); render(true); window.scrollTo(0, 0); }
      return;
    }
    if (act === 'diary-today') { S.ui.diaryDate = todayISO(); save(); render(true); window.scrollTo(0, 0); return; }
    if (act === 'plan-week') { S.ui.planWeek = clamp(Number(el.dataset.i), 0, 3); save(); render(false); return; }
    if (act === 'plan-day') { S.ui.planDay = clamp(Number(el.dataset.i), 0, 6); save(); render(false); return; }
    if (act === 'chart-range') { S.ui.chart = el.dataset.range; save(); render(false); return; }
    if (act === 'save-weight') { saveWeight(); return; }
    if (act === 'del-weight') { deleteWeight(el.dataset.date); return; }
    if (act === 'open-shop') { openShop(); return; }
    if (act === 'shop-toggle') { shopToggle(Number(el.dataset.i), el); return; }
    if (act === 'shop-reset') { S.shop[shopKey()] = Array(shopState().length).fill(false); save(); openShop(); toast('Список сброшен'); return; }
    if (act === 'shop-copy') { shopCopy(); return; }
    if (act === 'export') { exportData(); return; }
    if (act === 'import-trigger') { const f = $('#import-file'); if (f) f.click(); return; }
    if (act === 'reset-all') { resetAll(); return; }
    if (act === 'settings-save') { saveSettings(); return; }
    if (act === 'settings-recalc') { recalcFields(); return; }

    if (act === 'picker-tab') { picker.tab = el.dataset.tab; picker.selected = null; refreshPicker(); return; }
    if (act === 'food-cat') {
      picker.cat = el.dataset.cat;
      $$('.cat-chip').forEach(b => b.classList.toggle('on', b.dataset.cat === picker.cat));
      const list = $('#food-list'); if (list) list.innerHTML = foodRowsHTML();
      return;
    }
    if (act === 'food-pick') {
      const f = FOODS.find(x => x.id === el.dataset.id); if (!f) return;
      picker.selected = f; picker.grams = f.g; refreshPicker(); return;
    }
    if (act === 'food-back') { picker.selected = null; refreshPicker(); return; }
    if (act === 'gram-quick') {
      picker.grams = Number(el.dataset.g);
      if ($('#gram-input')) $('#gram-input').value = picker.grams;
      updatePortionPreview(); return;
    }
    if (act === 'picker-meal') { picker.meal = el.dataset.meal; $$('.meal-pick button').forEach(b => b.classList.toggle('on', b.dataset.meal === picker.meal)); return; }
    if (act === 'food-add') {
      if (!picker.selected) return;
      const g = clamp(Number(($('#gram-input') || {}).value) || 0, 1, 2000);
      const f = picker.selected;
      addExtra(picker.date, picker.meal, {
        name: f.n, grams: g,
        kcal: Math.round(f.kcal * g / 100),
        p: round1(f.p * g / 100),
        f: round1(f.f * g / 100),
        c: round1(f.c * g / 100),
        fi: round1(f.fi * g / 100)
      });
      return;
    }
    if (act === 'custom-add') {
      const name = String(($('#c-name') || {}).value || '').trim();
      const kcal = Number(($('#c-kcal') || {}).value);
      const p = Number(($('#c-p') || {}).value) || 0;
      const f = Number(($('#c-f') || {}).value) || 0;
      const c = Number(($('#c-c') || {}).value) || 0;
      if (!name) { toast('Дай блюду название'); return; }
      if (!kcal || kcal < 0 || kcal > 3000) { toast('Укажи калории порции'); return; }
      addExtra(picker.date, picker.meal, { name, custom: true, grams: null, kcal: Math.round(kcal), p: round1(p), f: round1(f), c: round1(c), fi: 0 });
      return;
    }
    if (act === 'picker-plan-meal') {
      const date = el.dataset.date, meal = el.dataset.meal;
      if (portion(date, meal) > 0) { toast('Уже в дневнике'); return; }
      setPortion(date, meal, 1);
      closeSheet(); render(false);
      toast(`${MEAL_META[meal].name} записан`);
      return;
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'food-search' && picker) {
      picker.q = e.target.value;
      const list = $('#food-list'); if (list) list.innerHTML = foodRowsHTML();
      return;
    }
    if (e.target.id === 'gram-input' && picker) {
      picker.grams = clamp(Number(String(e.target.value).replace(',', '.')) || 0, 0, 2000);
      updatePortionPreview();
      return;
    }
    if (e.target.id === 'set-kcal' && $('#set-protein')) {
      const next = clamp(Number(e.target.value) || 1650, 1500, 3000);
      const avg = scaledPlanAverages(next);
      $('#set-protein').value = Math.round(avg.p);
      $('#set-fat').value = Math.round(avg.f);
      $('#set-carbs').value = Math.round(avg.c);
      return;
    }
    if (e.target.matches('[data-note]')) {
      const date = e.target.dataset.date || todayISO();
      getLog(date).note = e.target.value;
      save(true);
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'import-file' && e.target.files && e.target.files[0]) importFile(e.target.files[0]);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Enter' && e.target.id === 'onboard-name') startOnboarding();
  });

  window.addEventListener('hashchange', () => {
    const next = location.hash.replace('#', '');
    if (TABS.some(t => t.id === next) && next !== S.ui.tab) {
      S.ui.tab = next;
      save();
      render(true, false);
      window.scrollTo(0, 0);
    }
  });

  window.addEventListener('resize', () => {
    if (!S.onboarded) return;
    // SVG-график адаптивный, перерисовка не нужна; оставляем для будущих правок.
  });

  /* ------------------------------------------------------------------ boot */
  const params = new URLSearchParams(location.search);
  const localPreview = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (params.get('reset') === '1' && localPreview) {
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = defaults();
  }
  if (params.get('demo') === '1' && localPreview) seedDemo();
  const hash = location.hash.replace('#', '');
  if (TABS.some(t => t.id === hash)) S.ui.tab = hash;
  if (S.ui.tab === 'plan') {
    const idx = planIndexForDate(todayISO());
    S.ui.planWeek = Math.floor(idx / 7);
    S.ui.planDay = idx % 7;
  }
  if (S.ui.tab === 'diary') S.ui.diaryDate = S.ui.diaryDate || todayISO();

  render(true, false);

  if ('serviceWorker' in navigator && params.get('qa') !== '1' && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
