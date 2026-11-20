(() => {
'use strict';
const $ = id => document.getElementById(id);
const PROFILE_KEY = 'bjt_profile_keywords_v2';
const DEFAULT_KEYWORDS = 'sql, sas, ifrs 9, ecl, expected credit loss, credit risk, portfolio analysis, portfolio analytics, risk reporting, regulatory reporting, management reporting, data quality, reconciliation, oracle, db2, power query, banking, provisioning, npe, forbearance, data controls, python, power bi, data analytics, dashboard, data requirements, process improvement, testing, rwa, pd, rating, stage';
let jobs = [], sourceStatuses = [], seen = new Set(), saved = new Set(), keywords = [];
try { seen = new Set(JSON.parse(localStorage.getItem('bjt_seen') || '[]')); } catch {}
try { saved = new Set(JSON.parse(localStorage.getItem('bjt_saved') || '[]')); } catch {}
try { keywords = (localStorage.getItem(PROFILE_KEY) || DEFAULT_KEYWORDS).split(',').map(x => x.trim().toLowerCase()).filter(Boolean); } catch { keywords = DEFAULT_KEYWORDS.split(',').map(x=>x.trim()); }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateValue = s => { if (!s) return null; const d = new Date(String(s).length === 10 ? `${s}T23:59:59` : s); return Number.isNaN(d.getTime()) ? null : d; };
const getId = j => String(j.id || j.url || `${j.bank}-${j.title}`);
const jobText = j => `${j.title || ''} ${j.description || ''} ${Array.isArray(j.skills) ? j.skills.join(' ') : (j.skills || '')} ${j.level || ''}`.toLowerCase();
const CV_STORE = 'bjt_cv_text_v1';
const CV_PROFILE_STORE = 'bjt_cv_profile_v1';
const CV_TERMS = ["sql", "sas", "ifrs 9", "ecl", "expected credit loss", "credit risk", "portfolio analysis", "portfolio analytics", "risk reporting", "regulatory reporting", "management reporting", "data quality", "reconciliation", "oracle", "db2", "power query", "provisioning", "npe", "forbearance", "data controls", "financial reporting", "risk data", "portfolio reporting", "credit portfolio", "stage", "pd", "rating", "rwa", "data analysis", "automation", "excel", "python", "power bi", "dashboard", "data requirements", "process improvement", "testing"];
const HIGH_TERMS = ["ifrs 9", "ecl", "expected credit loss", "credit risk", "portfolio analysis", "portfolio analytics", "risk reporting", "regulatory reporting", "management reporting", "sql", "sas", "data quality", "reconciliation", "oracle", "db2", "power query", "provisioning", "npe", "forbearance", "rwa", "data controls", "credit portfolio", "financial reporting", "risk data"];
function readCVText() {
  try {
    const uploaded = localStorage.getItem(CV_STORE) || '';
    if (uploaded.trim().length <= 40) return '';
    const profile = JSON.parse(localStorage.getItem(CV_PROFILE_STORE) || '{}');
    return `${uploaded} ${profile.extra || ''}`.toLowerCase();
  } catch { return (localStorage.getItem(CV_STORE) || '').toLowerCase(); }
}
function extractJobTerms(text) {
  const lower = String(text || '').toLowerCase();
  const found = CV_TERMS.filter(term => lower.includes(term));
  const words = (lower.match(/[a-z0-9+#.]+/g) || []).filter(w => w.length > 3);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const repeated = Object.entries(freq).filter(([,n]) => n >= 2).sort((a,b) => b[1]-a[1]).slice(0,20).map(([w])=>w);
  return [...new Set([...found, ...repeated])].filter(t=>t.length>2);
}
function scoreJob(j) {
  const t = jobText(j), cvText = readCVText(), hasCV = cvText.trim().length > 40;
  const fullText = `${j.title||''} ${j.description||''} ${j.gist||''} ${(j.skills||[]).join(' ')}`;
  const lower = fullText.toLowerCase();
  const candidateYears = /nearly five years|almost five years|5 years|five years/i.test(cvText) ? 5 : ((cvText.match(/\b(\d+)\+? years?\b/i)||[])[1] ? Number((cvText.match(/\b(\d+)\+? years?\b/i)||[])[1]) : 0);
  const rangeExp = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i);
  const minExpMatch = lower.match(/(?:at least|minimum of|min\.?|\b)(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:relevant\s+|professional\s+)?experience/i) || lower.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i);
  const minYears = rangeExp ? Number(rangeExp[1]) : (minExpMatch ? Number(minExpMatch[1]) : 0);
  const senior = /\b(head|director|vice president|vp|executive director|senior manager|team lead|lead)\b/i.test(`${j.title||''} ${j.level||''}`);
  const internship = /internship|\bintern\b|\bstage\b|student|graduate programme/i.test(`${j.title||''} ${j.level||''}`);
  const modelling = /credit risk model|model development|quantitative model validation|model validation|derivatives pricing|quantitative modelling|quantitative modeling/i.test(lower);
  const dutch = /native dutch|fluent dutch|dutch.{0,35}(required|mandatory|essential)|must speak dutch/i.test(lower) || j.facts?.dutch_required === true;
  const unrelated = /performance marketing|digital marketing|front.?end|software engineer|test engineer|event management|recruitment|communications/i.test(j.title||'');
  const skillAliases = [
    ['SQL',['sql']],['SAS',['sas']],['IFRS 9',['ifrs 9']],['ECL / expected credit loss',['ecl','expected credit loss']],
    ['Credit risk',['credit risk']],['Portfolio analysis / reporting',['portfolio analysis','portfolio analytics','portfolio reporting','credit portfolio']],
    ['Regulatory / management reporting',['regulatory reporting','management reporting','risk reporting']],['NPE / forbearance',['npe','forbearance']],
    ['PD / rating / staging',['pd','rating','stage']],['RWA / CR4',['rwa','cr4']],['Oracle',['oracle']],['DB2',['db2']],
    ['Power Query',['power query']],['Excel',['excel']],['Data quality / reconciliation',['data quality','reconciliation']],
    ['Python',['python']],['Power BI',['power bi']],['Data engineering',['data engineering']],['Java',['java']],['Selenium',['selenium']],
    ['Docker',['docker']],['Azure DevOps',['azure devops']],['Agile / Scrum',['agile','scrum']],['JavaScript',['javascript']],
    ['TypeScript',['typescript']],['React',['react']],['Next.js',['next.js','nextjs']],['HTML / CSS',['html','css']],
    ['Machine learning',['machine learning']],['Modelling',['modelling','modeling']],['GenAI tools',['genai']]
  ];
  const requested = [...new Set((Array.isArray(j.skills)?j.skills:[]).map(x=>String(x).trim()).filter(x=>x.length>1))];
  // Include explicit, recognisable requirements from the description, not repeated generic words.
  for (const [label, aliases] of skillAliases) if (aliases.some(a=>lower.includes(a)) && !requested.some(x=>x.toLowerCase()===label.toLowerCase())) requested.push(label);
  const matched=[], missing=[], partial=[];
  if (hasCV) for (const req of requested) {
    const key=req.toLowerCase();
    const group=skillAliases.find(([label,aliases])=>label.toLowerCase()===key || aliases.includes(key) || aliases.some(a=>key===a));
    const aliases=group?group[1]:[key];
    const found=aliases.some(a=>cvText.includes(a));
    if (!found) missing.push(req);
    else if ((key.includes('python') && /basic|foundational|training|course/i.test(cvText)) || (key.includes('power bi') && /course|training|basic/i.test(cvText))) partial.push(req);
    else matched.push(req);
  }
  let score=0;
  if (hasCV) {
    const reqCount=Math.max(1,requested.length);
    const skillScore=(matched.length + partial.length*0.35)/reqCount;
    const domainFit=/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl|provisioning|banking/i.test(lower) ? (/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl|provisioning/i.test(cvText)?1:0.35) : (/banking|financial/i.test(lower)&&/banking/i.test(cvText)?0.8:0.25);
    let experienceFit=1;
    if (minYears>0) experienceFit=Math.min(1,candidateYears/minYears);
    if (senior && candidateYears<7) experienceFit=Math.min(experienceFit,0.65);
    score=Math.round((skillScore*0.65 + experienceFit*0.20 + domainFit*0.15)*100);
    if (minYears>candidateYears && minYears>0) score=Math.min(score, Math.max(35, 75-(minYears-candidateYears)*8));
    if (dutch) score=Math.min(score,45);
    if (internship) score=Math.min(score,25);
    if (unrelated) score=Math.min(score,20);
    if (modelling) score=Math.min(score,55);
    score=Math.min(95,score);
  } else {
    score=0;
  }
  const strengths=[];
  if (hasCV) {
    if (matched.length) strengths.push(`Izravno poklapanje s oglasom: ${matched.join(', ')}.`);
    if (/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl/i.test(lower) && /credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl/i.test(cvText)) strengths.push('Dosadašnje bankarsko iskustvo u kreditnom riziku, portfeljnoj analizi i izvještavanju relevantno je za područje ove uloge.');
    if (/sql/i.test(lower) && /sql/i.test(cvText)) strengths.push('SQL iskustvo, uključujući optimizaciju izvještaja i rad s bankarskim podacima.');
    if (/report/i.test(lower) && /three whole-credit-portfolio reports|three whole credit portfolio reports/i.test(cvText)) strengths.push('Samostalna izrada mjesečnih, kvartalnih i godišnjih izvještaja kreditnog portfelja za menadžment.');
    if (/nearly five years|almost five years/i.test(cvText)) strengths.push('Gotovo pet godina profesionalnog bankarskog iskustva.');
  }
  const gaps=[];
  if (hasCV && missing.length) gaps.push(`Traženo u oglasu, ali nije pronađeno u CV-u: ${missing.join(', ')}.`);
  if (hasCV && partial.length) gaps.push(`${partial.join(', ')}: u CV-u je navedena osnovna razina/edukacija, ne profesionalno iskustvo.`);
  if (minYears>candidateYears && minYears>0) gaps.push(`Oglas traži najmanje ${minYears} godina iskustva; u CV-u je navedeno približno ${candidateYears} godina.`);
  if (senior && candidateYears<7) gaps.push('Pozicija djeluje seniorski/voditeljski; CV ne potvrđuje opseg senioriteta ili vođenja tima koji se može očekivati.');
  if (dutch) gaps.push('Nizozemski je naveden kao obvezan uvjet, a u CV-u nije navedena tražena razina.');
  if (modelling) gaps.push('Oglas uključuje razvoj/validaciju kvantitativnih modela, što nije tvoje glavno profesionalno iskustvo.');
  if (internship) gaps.push('Ovo je studentska/praktična pozicija, ne standardna profesionalna uloga za tvoju razinu iskustva.');
  if (unrelated) gaps.push('Glavni fokus oglasa nije kreditni rizik, portfeljna analiza ni bankarsko izvještavanje.');
  const risks=[];
  if (!requested.length) risks.push('Feed sadrži samo kratak sažetak; puni zahtjevi oglasa nisu dostupni za pouzdanu procjenu.');
  if (j.facts?.posting_language==='nl' && !dutch) risks.push('Oglas je objavljen na nizozemskom; to samo po sebi ne potvrđuje da je nizozemski obvezan. Provjeri puni oglas.');
  if (!minYears) risks.push('Oglasni sažetak ne navodi minimalan broj godina iskustva; provjeri puni oglas prije prijave.');
  return {score:hasCV?Math.max(0,score):0,matched,missing:[...gaps],matchMode:hasCV?'cv':'profile',strengths,risks,hasCV,termsCount:requested.length,partial};
}
function bankLogo(bank) {
  const b=String(bank||'').toLowerCase();
  const known=[
    ['ing','https://commons.wikimedia.org/wiki/Special:FilePath/ING_lion.png','ING'],
    ['rabobank','https://commons.wikimedia.org/wiki/Special:FilePath/Rabobank%20text%20logo.svg','Rabobank'],
    ['abn','https://www.google.com/s2/favicons?domain=abnamro.com&sz=128','ABN AMRO'],
    ['nibc','https://www.google.com/s2/favicons?domain=nibc.com&sz=128','NIBC'],
    ['asn','https://www.google.com/s2/favicons?domain=asnbank.nl&sz=128','ASN'],
    ['bunq','https://www.google.com/s2/favicons?domain=bunq.com&sz=128','bunq'],
    ['de volksbank','https://www.google.com/s2/favicons?domain=devolksbank.nl&sz=128','de Volksbank'],
    ['abnamro','https://www.google.com/s2/favicons?domain=abnamro.com&sz=128','ABN AMRO']
  ];
  const hit=known.find(x=>b.includes(x[0]));
  if(hit) return `<img class="bank-logo ${hit[0]==='ing'?'ing-logo':hit[0]==='rabobank'?'rabo-logo':'other-bank-logo'}" src="${hit[1]}" alt="${hit[2]} logo" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="bank-logo-fallback" hidden>${hit[2]}</span>`;
  return `<span class="bank-logo-fallback">${esc(bank||'BANK')}</span>`;
}
function openJobDetail(id) {
  const j=jobs.find(x=>getId(x)===String(id)); if(!j)return;
  const a=scoreJob(j), cvReady=a.hasCV;
  const strengths=a.strengths.length?a.strengths.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>U dostupnom tekstu oglasa nema dovoljno konkretnih zahtjeva za potvrdu specifičnih prednosti.</li>';
  const matched=a.matched.length?a.matched.map(x=>`<span class="analysis-chip">${esc(x)}</span>`).join(''):'<span class="muted">Nema potvrđenih ključnih podudaranja.</span>';
  const gaps=a.missing.length?a.missing.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Nema prepoznatih konkretnih nedostataka u dostupnom sažetku; puni oglas ipak treba provjeriti.</li>';
  const risks=a.risks.length?a.risks.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Nije prepoznata posebna prepreka iz dostupnih podataka.</li>';
  $('modalBody').innerHTML=`<div class="detail-bankline">${bankLogo(j.bank)}<span>${esc(j.bank||'')}</span></div><h2 id="modalTitle">${esc(j.title||'Pozicija')}</h2><p class="detail-meta">${esc(j.location||'Netherlands')} · ${esc(j.level||'Razina nije navedena')} · ${esc(j.published||'Datum objave nije poznat')}</p><div class="detail-match"><b>${a.score}%</b><span>${cvReady?'PODUDARANJE S TVOJIM CV-om':'PODUDARANJE S PROFILOM'}</span></div><p class="detail-caveat">${cvReady?'Procjena se temelji na tekstu učitanog CV-a i informacijama o oglasu dostupnima u feedu.':'Za precizniju procjenu učitaj CV. Trenutačni rezultat temelji se na profilu ključnih riječi.'} Postotak nije vjerojatnost zaposlenja. Oglasni feed može sadržavati samo sažetak, ne puni opis.</p><section class="detail-analysis"><h3>Prednosti u odnosu na ovaj oglas</h3><ul>${strengths}</ul><h4>Traženi uvjeti koje CV potvrđuje</h4><div class="analysis-chips">${matched}</div></section><section class="detail-analysis"><h3>Nedostaci u odnosu na ovaj oglas</h3><ul>${gaps}</ul></section><section class="detail-analysis"><h3>Važna upozorenja</h3><ul>${risks}</ul></section><a class="btn btn-primary detail-open" href="${esc(j.url||'#')}" target="_blank" rel="noopener">Otvori službeni oglas ↗</a>`;
  $('detailModal').hidden=false;
}

function state(j) { const d=dateValue(j.deadline); if (d && d < new Date()) return 'expired'; if (d && (d-new Date())/86400000 <= 7) return 'soon'; return 'active'; }
function renderSources() {
  const el=$('sourceStatus'); if(!el) return;
  const labels={ok:'Podaci dohvaćeni',no_structured_jobs_found:'Nema strukturiranih oglasa',fetch_error:'Dohvat nije uspio',not_found_in_public_feed:'Nema oglasa u javnom feedu'};
  el.innerHTML = sourceStatuses.length ? sourceStatuses.map(s=>`<a class="source-item" href="${esc(s.source || '#')}" target="_blank" rel="noopener"><span class="source-name">${esc(s.bank || 'Izvor')}</span><span class="source-state ${s.status==='ok'?'ok':'warn'}">${esc(labels[s.status] || s.status || 'Status nepoznat')}</span><small>${Number(s.count||0)} oglasa ↗</small></a>`).join('') : '<p class="muted">Status izvora nije dostupan. Pokreni GitHub Actions workflow.</p>';
}
function render() {
 const scored=jobs.map(j=>({...j,...scoreJob(j),_id:getId(j)}));
 $('totalCount').textContent=scored.length;
 $('newCount').textContent=scored.filter(j=>!seen.has(j._id)).length;
 $('strongCount').textContent=scored.filter(j=>j.score>=80 && state(j)!=='expired').length;
 $('expiringCount').textContent=scored.filter(j=>state(j)==='soon').length;
 $('expiredCount').textContent=scored.filter(j=>state(j)==='expired').length;
 const q=($('searchInput')?.value||'').trim().toLowerCase(), view=$('viewFilter')?.value||'all', bank=$('bankFilter')?.value||'all', min=Number($('matchFilter')?.value||0), sort=$('sortBy')?.value||'match';
 let list=scored.filter(j=>{
   if(bank!=='all' && j.bank!==bank) return false;
   if(j.score<min) return false;
   if(view==='new' && seen.has(j._id)) return false;
   if(view==='unseen' && seen.has(j._id)) return false;
   if(view==='saved' && !saved.has(j._id)) return false;
   if(view==='active' && !['active','soon'].includes(state(j))) return false;
   if(view==='expired' && state(j)!=='expired') return false;
   if(q && !`${j.title||''} ${j.bank||''} ${j.location||''} ${jobText(j)}`.toLowerCase().includes(q)) return false;
   return true;
 });
 list.sort((a,b)=> sort==='match'?b.score-a.score : sort==='deadline'?(dateValue(a.deadline)||new Date('2999-01-01'))-(dateValue(b.deadline)||new Date('2999-01-01')) : sort==='title'?String(a.title||'').localeCompare(String(b.title||'')) : (dateValue(b.published)||new Date(0))-(dateValue(a.published)||new Date(0)));
 $('resultLabel').textContent=`${list.length} rezultata`;
 $('jobs').innerHTML=list.length?list.map(j=>{
  const st=state(j), d=dateValue(j.deadline), days=d?Math.ceil((d-new Date())/86400000):null;
  return `<article class="job"><div class="job-top"><div class="job-heading"><div class="bank">${bankLogo(j.bank)}<span>${esc((j.bank||'BANK').toUpperCase())}</span> ${!seen.has(j._id)?'<span class="new-pill">● NOVO</span>':''}</div><h3>${esc(j.title||'Pozicija bez naziva')}</h3><div class="meta"><span>⌖ ${esc(j.location||'Netherlands')}</span><span>▣ ${esc(j.level||'Professional')}</span><span>◷ ${esc(j.published||'Datum nepoznat')}</span></div></div><div class="match">${j.score}%<small>${j.matchMode==='cv'?'CV MATCH':'PROFILE MATCH'}</small></div></div><div class="tags">${j.matched.map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="tag">Provjeri opis oglasa</span>'}</div><div class="job-foot"><div class="deadline ${st}">${st==='expired'?'Istekao rok':st==='soon'?`Rok za ${days} dana`:j.deadline?`Rok: ${esc(j.deadline)}`:'Rok nije objavljen'}</div><div class="job-actions"><button data-action="detail" data-id="${esc(j._id)}">Analiza</button><button data-action="seen" data-id="${esc(j._id)}">${seen.has(j._id)?'Pregledano':'Označi viđeno'}</button><button data-action="save" data-id="${esc(j._id)}" aria-label="Spremi oglas">${saved.has(j._id)?'★ Spremljeno':'☆ Spremi'}</button><a href="${esc(j.url||'#')}" target="_blank" rel="noopener">Otvori oglas ↗</a></div></div></article>`;
 }).join(''):'<div class="empty"><strong>Nema oglasa za odabrane filtre.</strong><p>Promijeni banku, smanji minimalni match ili ukloni tekst pretrage. Prazan feed ne znači da banke nemaju otvorenih pozicija.</p></div>';
}
function toast(msg){const el=$('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
async function loadFeed(){ $('lastSync').textContent='Učitavanje…'; $('refreshBtn').disabled=true; try{const r=await fetch(`./jobs.json?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json();jobs=Array.isArray(data.jobs)?data.jobs:[];sourceStatuses=Array.isArray(data.sources)?data.sources:[];$('lastSync').textContent=data.updatedAt?`Ažurirano ${new Date(data.updatedAt).toLocaleString('hr-HR',{dateStyle:'short',timeStyle:'short'})}`:'Feed učitan';renderSources();render();}catch(e){$('lastSync').textContent='Feed nije dostupan';$('sourceStatus').textContent='Ne mogu učitati jobs.json. Provjeri GitHub Pages i postoji li jobs.json u glavnoj mapi.';$('jobs').innerHTML='<div class="empty"><strong>Feed trenutačno nije dostupan.</strong><p>Provjeri je li GitHub Pages objavio datoteku jobs.json. To je odvojeno od prikaza aplikacije.</p></div>';console.error(e);}finally{$('refreshBtn').disabled=false;}}
function exportCSV(){const rows=jobs.map(j=>({...j,...scoreJob(j)}));const headers=['bank','title','location','level','published','deadline','score','url'];const csv=[headers.join(','),...rows.map(j=>headers.map(k=>`"${String(k==='score'?j.score:j[k]??'').replace(/"/g,'""')}"`).join(','))].join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bank-job-tracker.csv';a.click();URL.revokeObjectURL(url);toast('CSV je preuzet.');}
function bind(){window.addEventListener('bjt-cv-updated',render);['viewFilter','bankFilter','matchFilter','sortBy'].forEach(id=>$(id)?.addEventListener('change',render));$('searchInput')?.addEventListener('input',render);$('refreshBtn')?.addEventListener('click',loadFeed);$('exportBtn')?.addEventListener('click',exportCSV);$('jobs')?.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const id=b.dataset.id;if(b.dataset.action==='detail'){openJobDetail(id);return;}if(b.dataset.action==='seen')seen.add(id);if(b.dataset.action==='save')saved.has(id)?saved.delete(id):saved.add(id);localStorage.setItem('bjt_seen',JSON.stringify([...seen]));localStorage.setItem('bjt_saved',JSON.stringify([...saved]));render();});$('profileKeywords').value=keywords.join(', ');$('saveProfileBtn')?.addEventListener('click',()=>{keywords=$('profileKeywords').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);localStorage.setItem(PROFILE_KEY,keywords.join(', '));render();toast('Profil je spremljen.');});$('resetProfileBtn')?.addEventListener('click',()=>{$('profileKeywords').value=DEFAULT_KEYWORDS;keywords=DEFAULT_KEYWORDS.split(',').map(x=>x.trim());localStorage.setItem(PROFILE_KEY,DEFAULT_KEYWORDS);render();toast('Vraćen je zadani profil.');});document.querySelectorAll('[data-close="true"]').forEach(x=>x.addEventListener('click',()=>{$('detailModal').hidden=true;}));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();loadFeed();});else{bind();loadFeed();}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker:',err)));
let deferredPrompt;$('installBtn').hidden=true;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false;});$('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true;});
})();
