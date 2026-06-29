let jobs = [];
let educations = [];
let editIdx = -1;
let mode = 'job';

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['jobs', 'educations'], d => {
    jobs = d.jobs || [];
    educations = d.educations || [];
    render();
  });
  document.getElementById('addJobBtn').onclick = () => openModal('job');
  document.getElementById('addEduBtn').onclick = () => openModal('education');
  document.getElementById('cancel').onclick = closeModal;
  document.getElementById('save').onclick = saveItem;
  document.getElementById('fillBtn').onclick = fill;
});

function esc(s) { return (s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function render() {
  const jobList = document.getElementById('jobList');
  jobList.innerHTML = jobs.length ? jobs.map((j, i) => `
    <div class="card"><div class="card-t">${esc(j.title)} <span style="color:#666;font-weight:400">@ ${esc(j.company)}</span></div>
    <div class="card-s">${esc(j.start)} – ${esc(j.end || 'Present')}${j.location ? ' · ' + esc(j.location) : ''}</div>
    <button class="x" data-job-edit="${i}">✎</button><button class="x" data-job-del="${i}" style="right:32px">✕</button></div>`).join('') : '<div class="empty">No jobs yet.</div>';

  const eduList = document.getElementById('eduList');
  eduList.innerHTML = educations.length ? educations.map((e, i) => `
    <div class="card"><div class="card-t">${esc(e.degree || 'Education')} <span style="color:#666;font-weight:400">@ ${esc(e.school)}</span></div>
    <div class="card-s">${esc(e.start)} – ${esc(e.end)}${e.field ? ' · ' + esc(e.field) : ''}</div>
    <button class="x" data-edu-edit="${i}">✎</button><button class="x" data-edu-del="${i}" style="right:32px">✕</button></div>`).join('') : '<div class="empty">No education yet.</div>';

  jobList.querySelectorAll('[data-job-edit]').forEach(b => b.onclick = () => openModal('job', +b.dataset.jobEdit));
  jobList.querySelectorAll('[data-job-del]').forEach(b => b.onclick = () => { jobs.splice(+b.dataset.jobDel, 1); chrome.storage.local.set({ jobs }, render); });
  eduList.querySelectorAll('[data-edu-edit]').forEach(b => b.onclick = () => openModal('education', +b.dataset.eduEdit));
  eduList.querySelectorAll('[data-edu-del]').forEach(b => b.onclick = () => { educations.splice(+b.dataset.eduDel, 1); chrome.storage.local.set({ educations }, render); });
}

function openModal(which, i = -1) {
  mode = which; editIdx = i;
  document.getElementById('jobFields').style.display = mode === 'job' ? 'block' : 'none';
  document.getElementById('eduFields').style.display = mode === 'education' ? 'block' : 'none';
  document.getElementById('modalT').textContent = `${i === -1 ? 'Add' : 'Edit'} ${mode === 'job' ? 'Job' : 'Education'}`;
  if (mode === 'job') {
    const j = i === -1 ? {} : jobs[i];
    document.getElementById('f-title').value = j.title || '';
    document.getElementById('f-company').value = j.company || '';
    document.getElementById('f-location').value = j.location || '';
    document.getElementById('f-start').value = j.start || '';
    document.getElementById('f-end').value = j.end || '';
    document.getElementById('f-desc').value = j.description || '';
  } else {
    const e = i === -1 ? {} : educations[i];
    document.getElementById('e-school').value = e.school || '';
    document.getElementById('e-degree').value = e.degree || '';
    document.getElementById('e-field').value = e.field || '';
    document.getElementById('e-location').value = e.location || '';
    document.getElementById('e-start').value = e.start || '';
    document.getElementById('e-end').value = e.end || '';
    document.getElementById('e-result').value = e.result || '';
    document.getElementById('e-desc').value = e.description || '';
  }
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }

function saveItem() {
  if (mode === 'job') {
    const title = document.getElementById('f-title').value.trim();
    const company = document.getElementById('f-company').value.trim();
    if (!title || !company) { alert('Title and Company required'); return; }
    const job = { title, company, location: val('f-location'), start: val('f-start'), end: val('f-end'), description: val('f-desc') };
    if (editIdx === -1) jobs.push(job); else jobs[editIdx] = job;
    chrome.storage.local.set({ jobs }, () => { render(); closeModal(); });
  } else {
    const school = document.getElementById('e-school').value.trim();
    if (!school) { alert('School / University required'); return; }
    const edu = { school, degree: val('e-degree'), field: val('e-field'), location: val('e-location'), start: val('e-start'), end: val('e-end'), result: val('e-result'), description: val('e-desc') };
    if (editIdx === -1) educations.push(edu); else educations[editIdx] = edu;
    chrome.storage.local.set({ educations }, () => { render(); closeModal(); });
  }
}
function val(id) { return document.getElementById(id).value.trim(); }

function fill() {
  const log = document.getElementById('log');
  log.innerHTML = '<span class="warn">Working…</span>';
  chrome.tabs.query({ url: ['https://*.myworkdayjobs.com/*', 'https://*.workday.com/*'] }, tabs => {
    let tab = tabs.find(t => t.active) || tabs[0];
    if (!tab) { log.innerHTML = '<span class="warn">No Workday tab found. Open a Workday application first.</span>'; return; }
    chrome.tabs.sendMessage(tab.id, { action: 'FILL', jobs, educations }, res => {
      if (chrome.runtime.lastError) { log.innerHTML = '<span class="warn">Refresh the Workday tab and try again.</span>'; return; }
      if (res && res.log) log.innerHTML = res.log.map(l => `<div class="${l.t}">${l.m}</div>`).join('');
    });
  });
}
