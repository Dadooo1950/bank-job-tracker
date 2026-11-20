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
const DEFAULT_CV_CONTEXT = 'Nearly five years of banking experience in credit risk portfolio analysis and reporting. At Zagrebačka banka, improved a recurring SQL report from about 60 minutes to 4 minutes and automated a recurring Power Query report from a full working day to about 5 minutes. At Hrvatska poštanska banka, independently prepare three whole-credit-portfolio reports (monthly, quarterly and annual) used by senior management; investigate reporting/data discrepancies and support the operational migration of portfolio dashboards to Oracle Analytics Cloud. EU citizen with unrestricted right to work in the Netherlands; English C1, German A2; no Dutch.';
const CV_TERMS = ["sql", "sas", "ifrs 9", "ecl", "expected credit loss", "credit risk", "portfolio analysis", "portfolio analytics", "risk reporting", "regulatory reporting", "management reporting", "data quality", "reconciliation", "oracle", "db2", "power query", "provisioning", "npe", "forbearance", "data controls", "financial reporting", "risk data", "portfolio reporting", "credit portfolio", "stage", "pd", "rating", "rwa", "data analysis", "automation", "excel", "python", "power bi", "dashboard", "data requirements", "process improvement", "testing"];
const HIGH_TERMS = ["ifrs 9", "ecl", "expected credit loss", "credit risk", "portfolio analysis", "portfolio analytics", "risk reporting", "regulatory reporting", "management reporting", "sql", "sas", "data quality", "reconciliation", "oracle", "db2", "power query", "provisioning", "npe", "forbearance", "rwa", "data controls", "credit portfolio", "financial reporting", "risk data"];
function readCVText() {
  try {
    const uploaded = localStorage.getItem(CV_STORE) || '';
    if (uploaded.trim().length <= 40) return '';
    const profile = JSON.parse(localStorage.getItem(CV_PROFILE_STORE) || '{}');
    return `${uploaded} ${profile.extra || DEFAULT_CV_CONTEXT}`.toLowerCase();
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
  const cvText=readCVText(), hasCV=cvText.trim().length>40;
  const fullText=[j.title||'',j.description||'',j.gist||'',Array.isArray(j.skills)?j.skills.join(' '):(j.skills||''),j.level||''].join(' ');
  const lower=fullText.toLowerCase();
  const candidateYears=/nearly five years|almost five years/i.test(cvText)?4.8:((cvText.match(/\b(\d+(?:\.\d+)?)\+? years?\b/i)||[])[1]?Number((cvText.match(/\b(\d+(?:\.\d+)?)\+? years?\b/i)||[])[1]):0);
  const rangeExp=lower.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+|professional\s+)?experience/i);
  const expMatches=[...lower.matchAll(/(?:at least|minimum of|min\.?|more than|over)?\s*(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:relevant\s+|professional\s+)?experience/gi)];
  const minYears=rangeExp?Number(rangeExp[1]):(expMatches.length?Math.max(...expMatches.map(m=>Number(m[1]))):0);
  const senior=/\b(head|director|vice president|vp|senior manager|senior analyst|senior specialist|team lead|lead)\b/i.test(`${j.title||''} ${j.level||''}`);
  const internship=/internship|\bintern\b|\bstage\b|student|graduate programme/i.test(`${j.title||''} ${j.level||''}`);
  const modelling=/credit risk model|model development|quantitative model validation|model validation|derivatives pricing|quantitative modelling|quantitative modeling/i.test(lower);
  const dutch=/native dutch|fluent dutch|dutch.{0,35}(required|mandatory|essential)|must speak dutch|excellent dutch/i.test(lower)||j.facts?.dutch_required===true;
  const unrelated=/performance marketing|digital marketing|front.?end|software engineer|test engineer|event management|recruitment|communications/i.test(j.title||'');
  const skillAliases=[
    ['SQL',['sql']],['SAS',['sas']],['IFRS 9',['ifrs 9']],['ECL / expected credit loss',['ecl','expected credit loss']],['Credit risk',['credit risk']],
    ['Portfolio analysis / reporting',['portfolio analysis','portfolio analytics','portfolio reporting','credit portfolio']],['Regulatory / management reporting',['regulatory reporting','management reporting','risk reporting']],
    ['NPE / forbearance',['npe','forbearance']],['PD / rating / staging',['pd','rating','stage']],['RWA / CR4',['rwa','cr4']],['Oracle',['oracle']],['DB2',['db2']],
    ['Power Query',['power query']],['Excel',['excel']],['Data quality / reconciliation',['data quality','reconciliation']],['Python',['python']],['Power BI',['power bi']],['Dutch',['dutch']],['English',['english']],['German',['german']],
    ['Data engineering',['data engineering']],['Java',['java']],['Selenium',['selenium']],['Docker',['docker']],['Azure DevOps',['azure devops']],['Agile / Scrum',['agile','scrum']],
    ['JavaScript',['javascript']],['TypeScript',['typescript']],['React',['react']],['Machine learning',['machine learning']],['Modelling',['modelling','modeling']],['Bachelor degree',['bachelor degree','bachelor’s degree','bachelor\'s degree']],['Master degree',['master degree','master’s degree','master\'s degree']]
  ];
  const hasTerm=(text,term)=>new RegExp('(^|[^a-z0-9])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z0-9]|$)','i').test(text);
  const requested=[...new Set((Array.isArray(j.skills)?j.skills:[]).map(x=>String(x).trim()).filter(x=>x.length>1))];
  for(const [label,aliases] of skillAliases) if(aliases.some(a=>hasTerm(lower,a))&&!requested.some(x=>x.toLowerCase()===label.toLowerCase())) requested.push(label);
  const matched=[],missing=[],partial=[];
  if(hasCV) for(const req of requested){
    const group=skillAliases.find(([label,aliases])=>label.toLowerCase()===req.toLowerCase()||aliases.includes(req.toLowerCase()));
    const aliases=group?group[1]:[req.toLowerCase()];
    const negativeLanguage=(/^(dutch)$/i.test(req)&&/no dutch|without dutch|do not speak dutch|does not speak dutch/i.test(cvText));
    const found=!negativeLanguage&&aliases.some(a=>hasTerm(cvText,a));
    if(!found) missing.push(req);
    else if((/python/i.test(req)&&/basic|foundational|training|course/i.test(cvText))||(/power bi/i.test(req)&&/course|training|basic/i.test(cvText))||(/modelling/i.test(req)&&!/model development|model validation|quantitative model/i.test(cvText))) partial.push(req);
    else matched.push(req);
  }
  const skillScore=requested.length?(matched.length+partial.length*.35)/requested.length:0.35;
  const roleRelevant=/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl|provisioning|financial risk/i.test(lower);
  const domainFit=roleRelevant?(/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl|provisioning/i.test(cvText)?1:0.35):(/banking|financial/i.test(lower)&&/banking/i.test(cvText)?0.75:0.3);
  const experienceFit=minYears?Math.min(1,candidateYears/minYears):0.70;
  const seniorityFit=senior?(candidateYears>=7?1:0.55):0.85;
  let score=hasCV?Math.round((skillScore*.55+experienceFit*.25+domainFit*.15+seniorityFit*.05)*100):0;
  if(hasCV&&!requested.length)score=Math.min(score,60);
  if(minYears>candidateYears&&minYears){const gap=minYears-candidateYears;score=Math.min(score,Math.max(42,82-gap*9));}
  if(senior&&candidateYears<7)score=Math.min(score,78);
  if(dutch)score=Math.min(score,42);
  if(internship)score=Math.min(score,25);
  if(unrelated)score=Math.min(score,20);
  if(modelling)score=Math.min(score,55);
  const textLength=String(j.description||j.gist||'').trim().length;
  const lowDetail=textLength<350;
  if(lowDetail)score=Math.min(score,72);
  score=Math.min(88,Math.max(0,score));
  const strengths=[];
  if(hasCV&&matched.length)strengths.push(`Zahtjevi iz oglasa koje CV izravno potvrđuje: ${matched.join(', ')}.`);
  if(hasCV&&/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl/i.test(lower)&&/credit risk|portfolio|risk reporting|regulatory reporting|ifrs 9|ecl/i.test(cvText))strengths.push('Relevantno iskustvo u bankarskom kreditnom riziku, analizi kreditnog portfelja i izvještavanju odgovara području ove pozicije.');
  if(hasCV&&/sql/i.test(lower)&&hasTerm(cvText,'sql'))strengths.push('SQL je potvrđen u CV-u; konkretan dokaz uključuje optimizaciju izvještaja s približno 60 na 4 minute.');
  if(hasCV&&/report|portfolio/i.test(lower)&&/three whole-credit-portfolio reports|three whole credit portfolio reports/i.test(cvText))strengths.push('Samostalna izrada mjesečnih, kvartalnih i godišnjih izvještaja kreditnog portfelja za menadžment.');
  if(hasCV&&/nearly five years|almost five years/i.test(cvText))strengths.push('Gotovo pet godina iskustva u bankarstvu; to je relevantna osnova, ali nije automatski jednako ispunjenom uvjetu od 5+ ili 7+ godina.');
  const gaps=[];
  if(hasCV&&missing.length)for(const req of missing)gaps.push(`Traženo u oglasu: ${req}. CV ne sadrži dokaz da je ovaj uvjet/vještina ispunjena.`);
  if(hasCV&&partial.length)for(const req of partial)gaps.push(`${req}: u CV-u je navedena edukacija/osnovna razina ili ograničena izloženost, ne samostalno profesionalno iskustvo.`);
  if(minYears>candidateYears&&minYears)gaps.push(`Staž: oglas traži najmanje ${minYears} godina iskustva, a CV potvrđuje približno ${candidateYears.toFixed(1).replace('.',',')} godine. Uvjet nije u potpunosti zadovoljen.`);
  if(senior&&candidateYears<7)gaps.push('Senioritet: naziv/razina oglasa upućuje na seniorsku poziciju; CV potvrđuje gotovo pet godina iskustva, ali ne potvrđuje 7+ godina ili vođenje tima.');
  if(dutch)gaps.push('Jezik: oglas navodi nizozemski kao obvezan uvjet, a CV ne potvrđuje traženu razinu.');
  if(modelling)gaps.push('Modeliranje: oglas traži razvoj ili validaciju kvantitativnih/credit-risk modela; to nije tvoje glavno profesionalno iskustvo.');
  if(internship)gaps.push('Razina uloge: oglas je studentska/praktična pozicija, a ne standardna profesionalna uloga.');
  if(unrelated)gaps.push('Područje: glavni fokus oglasa nije kreditni rizik, portfeljna analiza ni bankarsko izvještavanje.');
  const risks=[];
  if(lowDetail)risks.push('Dostupan je samo kratak sažetak oglasa. Analiza ne može pouzdano potvrditi sve obvezne uvjete; zato je rezultat ograničen. Otvori puni oglas prije prijave.');
  if(!minYears)risks.push('U dostupnom tekstu nije pronađen jasan minimalni broj godina iskustva; staž zato nije bodovan kao potpuno zadovoljen uvjet.');
  if(j.facts?.posting_language==='nl'&&!dutch)risks.push('Oglas je na nizozemskom, ali to samo po sebi ne dokazuje da je nizozemski obvezan.');
  return {score,matched,missing,gaps,strengths,risks,partial,hasCV,termsCount:requested.length,candidateYears,minYears,lowDetail};
}
window.bjtScoreJob=scoreJob;

function bankLogo(bank) {
  const b=String(bank||'').toLowerCase();
  const known=[
    ['ing','https://commons.wikimedia.org/wiki/Special:FilePath/ING%20lion.png','ING orange lion'],
    ['rabobank','https://commons.wikimedia.org/wiki/Special:FilePath/Rabobank%20text%20logo.svg','Rabobank'],
    ['abn','https://www.google.com/s2/favicons?domain=abnamro.com&sz=128','ABN AMRO'],
    ['nibc','https://www.google.com/s2/favicons?domain=nibc.com&sz=128','NIBC'],
    ['asn','https://www.google.com/s2/favicons?domain=asnbank.nl&sz=128','ASN'],
    ['bunq','https://www.google.com/s2/favicons?domain=bunq.com&sz=128','bunq'],
    ['de volksbank','https://www.google.com/s2/favicons?domain=devolksbank.nl&sz=128','de Volksbank'],
    ['abnamro','https://www.google.com/s2/favicons?domain=abnamro.com&sz=128','ABN AMRO']
  ];
  const hit=known.find(x=>b.includes(x[0]));
  if(hit) return hit[0]==='ing' ? `<img class="bank-logo ing-logo" src="${hit[1]}" alt="ING orange lion emblem" loading="eager" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="bank-logo-fallback ing-wordmark" hidden>ING</span>` : `<img class="bank-logo ${hit[0]==='rabobank'?'rabo-logo':'other-bank-logo'}" src="${hit[1]}" alt="${hit[2]} logo" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="bank-logo-fallback" hidden>${hit[2]}</span>`;
  return `<span class="bank-logo-fallback">${esc(bank||'BANK')}</span>`;
}
function openJobDetail(id) {
  const j=jobs.find(x=>getId(x)===String(id)); if(!j)return;
  const a=scoreJob(j), cvReady=a.hasCV;
  const strengths=a.strengths.length?a.strengths.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>U dostupnom tekstu oglasa nema dovoljno konkretnih zahtjeva za potvrdu specifičnih prednosti.</li>';
  const matched=a.matched.length?a.matched.map(x=>`<span class="analysis-chip">${esc(x)}</span>`).join(''):'<span class="muted">Nema potvrđenih ključnih podudaranja.</span>';
  const gapItems=(a.gaps||[]).length?a.gaps:a.missing; const gaps=gapItems.length?gapItems.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>U dostupnom tekstu nije prepoznat dodatni nedostatak. To ne znači da su svi uvjeti oglasa zadovoljeni; provjeri puni oglas.</li>';
  const risks=a.risks.length?a.risks.map(x=>`<li>${esc(x)}</li>`).join(''):'<li>Nije prepoznata posebna prepreka iz dostupnih podataka.</li>';
  $('modalBody').innerHTML=`<div class="detail-bankline">${bankLogo(j.bank)}<span>${esc(j.bank||'')}</span></div><h2 id="modalTitle">${esc(j.title||'Pozicija')}</h2><p class="detail-meta">${esc(j.location||'Netherlands')} · ${esc(j.level||'Razina nije navedena')} · ${esc(j.published||'Datum objave nije poznat')}</p><div class="detail-match"><b>${a.score}%</b><span>${cvReady?'PODUDARANJE S TVOJIM CV-om':'PODUDARANJE S PROFILOM'}</span></div><p class="detail-caveat">${cvReady?'Procjena se temelji na tekstu učitanog CV-a i informacijama o oglasu dostupnima u feedu.':'Za precizniju procjenu učitaj CV. Trenutačni rezultat temelji se na profilu ključnih riječi.'} Postotak nije vjerojatnost zaposlenja. ${a.minYears?`Staž: oglas traži ${a.minYears}+ godina, a CV potvrđuje približno ${a.candidateYears.toFixed(1).replace('.',',')} godine.`:''} Oglasni feed može sadržavati samo sažetak, ne puni opis.</p><section class="detail-analysis"><h3>Prednosti u odnosu na ovaj oglas</h3><ul>${strengths}</ul><h4>Traženi uvjeti koje CV potvrđuje</h4><div class="analysis-chips">${matched}</div></section><section class="detail-analysis"><h3>Nedostaci u odnosu na ovaj oglas</h3><ul>${gaps}</ul></section><section class="detail-analysis"><h3>Važna upozorenja</h3><ul>${risks}</ul></section><a class="btn btn-primary detail-open" href="${esc(j.url||'#')}" target="_blank" rel="noopener">Otvori službeni oglas ↗</a>`;
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
