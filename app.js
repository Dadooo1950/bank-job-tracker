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
function scoreJob(j) {
  const t = jobText(j); let hits = [], score = 0;
  const strong = ['sql','sas','ifrs 9','ecl','expected credit loss','credit risk','portfolio analysis','portfolio analytics','risk reporting','regulatory reporting','management reporting','data quality','reconciliation','oracle','db2','power query','banking','provisioning','npe','forbearance','data controls'];
  const support = ['python','power bi','data analytics','dashboard','data requirements','process improvement','testing','rwa','pd','rating','stage'];
  const activeKeywords = keywords.length ? keywords : DEFAULT_KEYWORDS.split(',').map(x=>x.trim());
  for (const term of activeKeywords) if (term && t.includes(term)) { score += strong.includes(term) ? 5 : 2; hits.push(term); }
  const max = activeKeywords.reduce((n,term)=>n+(strong.includes(term)?5:2),0) || 1;
  if (/credit risk model|model development|quantitative model validation|advanced python|machine learning engineer/.test(t)) score -= 15;
  if (/native dutch|fluent dutch|dutch.{0,25}(required|mandatory)/.test(t)) score -= 10;
  return {score: Math.max(0, Math.min(99, Math.round(score / max * 100))), matched: hits.slice(0,7)};
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
  return `<article class="job"><div class="job-top"><div class="job-heading"><div class="bank">${esc((j.bank||'BANK').toUpperCase())} ${!seen.has(j._id)?'<span class="new-pill">● NOVO</span>':''}</div><h3>${esc(j.title||'Pozicija bez naziva')}</h3><div class="meta"><span>⌖ ${esc(j.location||'Netherlands')}</span><span>▣ ${esc(j.level||'Professional')}</span><span>◷ ${esc(j.published||'Datum nepoznat')}</span></div></div><div class="match">${j.score}%<small>MATCH</small></div></div><div class="tags">${j.matched.map(t=>`<span class="tag">${esc(t)}</span>`).join('')||'<span class="tag">Provjeri opis oglasa</span>'}</div><div class="job-foot"><div class="deadline ${st}">${st==='expired'?'Istekao rok':st==='soon'?`Rok za ${days} dana`:j.deadline?`Rok: ${esc(j.deadline)}`:'Rok nije objavljen'}</div><div class="job-actions"><button data-action="seen" data-id="${esc(j._id)}">${seen.has(j._id)?'Pregledano':'Označi viđeno'}</button><button data-action="save" data-id="${esc(j._id)}" aria-label="Spremi oglas">${saved.has(j._id)?'★ Spremljeno':'☆ Spremi'}</button><a href="${esc(j.url||'#')}" target="_blank" rel="noopener">Otvori oglas ↗</a></div></div></article>`;
 }).join(''):'<div class="empty"><strong>Nema oglasa za odabrane filtre.</strong><p>Promijeni banku, smanji minimalni match ili ukloni tekst pretrage. Prazan feed ne znači da banke nemaju otvorenih pozicija.</p></div>';
}
function toast(msg){const el=$('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
async function loadFeed(){ $('lastSync').textContent='Učitavanje…'; $('refreshBtn').disabled=true; try{const r=await fetch(`./jobs.json?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);const data=await r.json();jobs=Array.isArray(data.jobs)?data.jobs:[];sourceStatuses=Array.isArray(data.sources)?data.sources:[];$('lastSync').textContent=data.updatedAt?`Ažurirano ${new Date(data.updatedAt).toLocaleString('hr-HR',{dateStyle:'short',timeStyle:'short'})}`:'Feed učitan';renderSources();render();}catch(e){$('lastSync').textContent='Feed nije dostupan';$('sourceStatus').textContent='Ne mogu učitati jobs.json. Provjeri GitHub Pages i postoji li jobs.json u glavnoj mapi.';$('jobs').innerHTML='<div class="empty"><strong>Feed trenutačno nije dostupan.</strong><p>Provjeri je li GitHub Pages objavio datoteku jobs.json. To je odvojeno od prikaza aplikacije.</p></div>';console.error(e);}finally{$('refreshBtn').disabled=false;}}
function exportCSV(){const rows=jobs.map(j=>({...j,...scoreJob(j)}));const headers=['bank','title','location','level','published','deadline','score','url'];const csv=[headers.join(','),...rows.map(j=>headers.map(k=>`"${String(k==='score'?j.score:j[k]??'').replace(/"/g,'""')}"`).join(','))].join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='bank-job-tracker.csv';a.click();URL.revokeObjectURL(url);toast('CSV je preuzet.');}
function bind(){['viewFilter','bankFilter','matchFilter','sortBy'].forEach(id=>$(id)?.addEventListener('change',render));$('searchInput')?.addEventListener('input',render);$('refreshBtn')?.addEventListener('click',loadFeed);$('exportBtn')?.addEventListener('click',exportCSV);$('jobs')?.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const id=b.dataset.id;if(b.dataset.action==='seen')seen.add(id);if(b.dataset.action==='save')saved.has(id)?saved.delete(id):saved.add(id);localStorage.setItem('bjt_seen',JSON.stringify([...seen]));localStorage.setItem('bjt_saved',JSON.stringify([...saved]));render();});$('profileKeywords').value=keywords.join(', ');$('saveProfileBtn')?.addEventListener('click',()=>{keywords=$('profileKeywords').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);localStorage.setItem(PROFILE_KEY,keywords.join(', '));render();toast('Profil je spremljen.');});$('resetProfileBtn')?.addEventListener('click',()=>{$('profileKeywords').value=DEFAULT_KEYWORDS;keywords=DEFAULT_KEYWORDS.split(',').map(x=>x.trim());localStorage.setItem(PROFILE_KEY,DEFAULT_KEYWORDS);render();toast('Vraćen je zadani profil.');});document.querySelectorAll('[data-close="true"]').forEach(x=>x.addEventListener('click',()=>{$('detailModal').hidden=true;}));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bind();loadFeed();});else{bind();loadFeed();}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker:',err)));
let deferredPrompt;$('installBtn').hidden=true;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false;});$('installBtn').addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true;});
})();
