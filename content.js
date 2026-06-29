// Workday Autofill — work + education build
const log = [];
const L = (t, m) => { log.push({ t, m }); console.log('[WD]', m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function setVal(el, v) {
  if (!el || v === undefined || v === null || String(v).trim() === '') return false;
  el.focus();
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, v); else el.value = v;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();
  return true;
}

function labelText(el) {
  let t = '';
  el.childNodes.forEach(n => { if (n.nodeType === 3) t += n.textContent; });
  return (t || el.textContent || '').trim().replace(/\s*\*+\s*$/, '').replace(/\s+/g, ' ');
}

function inputBy(section, ...patterns) {
  const labels = [...section.querySelectorAll('label')];
  for (const pat of patterns) {
    const re = new RegExp(pat, 'i');
    const lab = labels.find(l => re.test(labelText(l)));
    if (!lab) continue;
    if (lab.htmlFor) {
      const e = document.getElementById(lab.htmlFor);
      if (e) return e;
    }
    let p = lab.parentElement;
    for (let i = 0; i < 7 && p; i++) {
      const inp = p.querySelector('input:not([type=checkbox]), textarea');
      if (inp) return inp;
      p = p.parentElement;
    }
  }
  return null;
}

function labelsIn(el) { return [...el.querySelectorAll('label')].map(l => labelText(l).toLowerCase()); }

function jobAnchors() {
  return [...document.querySelectorAll('label')].filter(l => /^job title$/i.test(labelText(l)));
}

function eduAnchors() {
  const labels = [...document.querySelectorAll('label')];
  return labels.filter(l => /^(school|university|college|institution|school or university|school name)$/i.test(labelText(l)));
}

function sectionOfJob(anchor) {
  let el = anchor.parentElement;
  for (let i = 0; i < 12 && el; i++) {
    const ls = labelsIn(el);
    if (ls.some(t => /job title/.test(t)) && ls.some(t => /^company$/.test(t))) return el;
    el = el.parentElement;
  }
  return anchor.closest('section') || anchor.parentElement;
}

function sectionOfEdu(anchor) {
  let el = anchor.parentElement;
  for (let i = 0; i < 12 && el; i++) {
    const ls = labelsIn(el);
    if (ls.some(t => /school|university|college|institution/.test(t)) && ls.some(t => /degree|field of study|major|course/.test(t))) return el;
    el = el.parentElement;
  }
  return anchor.closest('section') || anchor.parentElement;
}

async function clickAdd(kind = '') {
  const btns = [...document.querySelectorAll('button, [role=button]')].filter(b => b.offsetParent);
  const lowerKind = kind.toLowerCase();
  if (lowerKind) {
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,legend,div,span')]
      .filter(h => h.offsetParent && (h.textContent || '').trim().toLowerCase() === lowerKind);
    for (const h of heads) {
      let p = h.parentElement;
      for (let i = 0; i < 8 && p; i++) {
        const b = [...p.querySelectorAll('button, [role=button]')].find(x => x.offsetParent && /add another|add/i.test(x.textContent.trim()));
        if (b) { b.click(); return true; }
        p = p.parentElement;
      }
    }
  }
  let b = btns.find(x => /add another/i.test(x.textContent.trim())) || btns.find(x => /^add$/i.test(x.textContent.trim()));
  if (b) { b.click(); return true; }
  return false;
}

async function fillDate(_dateInput, mmYYYY, label) {
  if (!mmYYYY) return;
  const d = String(mmYYYY).replace(/\D/g, '');
  const shown = d.length >= 6 ? `${d.slice(0, 2)}/${d.slice(2, 6)}` : mmYYYY;
  L('warn', `  ✎ ${label}: type ${shown} by hand if date field stayed empty`);
}

async function fillJob(section, job) {
  const ti = inputBy(section, 'job title'); if (ti) setVal(ti, job.title) && L('ok', `  ✓ Title: ${job.title}`);
  const co = inputBy(section, '^company$'); if (co) setVal(co, job.company) && L('ok', `  ✓ Company: ${job.company}`);
  if (job.location) { const lo = inputBy(section, '^location$'); if (lo) setVal(lo, job.location) && L('ok', '  ✓ Location'); }
  if (job.description) { const ds = section.querySelector('textarea'); if (ds) setVal(ds, job.description) && L('ok', '  ✓ Description'); }

  const present = !job.end || /present|current/i.test(job.end);
  if (present) {
    const cbLab = [...section.querySelectorAll('label')].find(l => /currently work here/i.test(labelText(l)));
    if (cbLab) {
      let p = cbLab.parentElement, cb = null;
      for (let i = 0; i < 5 && p; i++) { cb = p.querySelector('input[type=checkbox]'); if (cb) break; p = p.parentElement; }
      if (cb && !cb.checked) { cb.click(); await sleep(300); L('ok', '  ✓ Currently work here'); }
    }
  }
  if (job.start) { const f = inputBy(section, '^from$', 'start date'); if (f) await fillDate(f, job.start, 'Work From'); }
  if (!present && job.end) { const t = inputBy(section, '^to$', 'end date'); if (t) await fillDate(t, job.end, 'Work To'); }
}

async function fillEducation(section, edu) {
  const school = inputBy(section, 'school or university', '^school$', 'university', 'college', 'institution', 'school name');
  if (school) setVal(school, edu.school) && L('ok', `  ✓ School: ${edu.school}`);
  const degree = inputBy(section, '^degree$', 'degree type', 'qualification');
  if (degree) setVal(degree, edu.degree) && L('ok', `  ✓ Degree: ${edu.degree}`);
  const field = inputBy(section, 'field of study', 'major', 'course', 'subject', 'area of study');
  if (field) setVal(field, edu.field) && L('ok', '  ✓ Field of study');
  const loc = inputBy(section, '^location$', 'city');
  if (loc) setVal(loc, edu.location) && L('ok', '  ✓ Education location');
  const result = inputBy(section, 'overall result', 'grade', 'gpa', 'classification');
  if (result) setVal(result, edu.result) && L('ok', '  ✓ Result/grade');
  const desc = section.querySelector('textarea');
  if (desc && edu.description) setVal(desc, edu.description) && L('ok', '  ✓ Education description');
  if (edu.start) { const f = inputBy(section, '^from$', 'start date', 'start'); if (f) await fillDate(f, edu.start, 'Education From'); }
  if (edu.end) { const t = inputBy(section, '^to$', 'end date', 'end'); if (t) await fillDate(t, edu.end, 'Education To'); }
}

async function run(jobs, educations) {
  log.length = 0;
  L('ok', `Filling ${jobs.length} job(s) and ${educations.length} education item(s)…`);
  for (let i = 0; i < jobs.length; i++) {
    L('ok', `→ Job: ${jobs[i].title} @ ${jobs[i].company}`);
    let anchors = jobAnchors(), tries = 0;
    while (anchors.length <= i && tries < 5) { await clickAdd('Work Experience'); await sleep(1200); anchors = jobAnchors(); tries++; }
    if (anchors.length <= i) { L('warn', `  job entry ${i + 1} not available`); continue; }
    await fillJob(sectionOfJob(anchors[i]), jobs[i]);
    await sleep(300);
  }
  for (let i = 0; i < educations.length; i++) {
    L('ok', `→ Education: ${educations[i].degree || 'Degree'} @ ${educations[i].school}`);
    let anchors = eduAnchors(), tries = 0;
    while (anchors.length <= i && tries < 5) { await clickAdd('Education'); await sleep(1200); anchors = eduAnchors(); tries++; }
    if (anchors.length <= i) { L('warn', `  education entry ${i + 1} not available`); continue; }
    await fillEducation(sectionOfEdu(anchors[i]), educations[i]);
    await sleep(300);
  }
  L('ok', '✓ Done');
  return log.slice();
}

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg.action === 'FILL') {
    run(msg.jobs || [], msg.educations || []).then(l => send({ log: l }));
    return true;
  }
});
