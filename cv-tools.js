/* Bank Job Tracker — local CV analysis and application documents.
   No CV data is uploaded to a server. Parsing and matching happen in this browser. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const STORE = 'bjt_cv_text_v1';
  const PROFILE = 'bjt_cv_profile_v1';
  const KEYWORDS = [
    'sql','sas','ifrs 9','ecl','expected credit loss','credit risk','portfolio analysis','portfolio analytics',
    'risk reporting','regulatory reporting','management reporting','data quality','reconciliation','oracle','db2',
    'power query','provisioning','npe','forbearance','data controls','financial reporting','risk data',
    'portfolio reporting','credit portfolio','stage','pd','rating','rwa','data analysis','automation','excel'
  ];
  const DEFAULT_EXTRA = 'Nearly five years of banking experience in credit risk portfolio analysis and reporting. At Zagrebačka banka, improved a recurring SQL report from about 60 minutes to 4 minutes and automated a recurring Power Query report from a full working day to about 5 minutes. At Hrvatska poštanska banka, independently prepare three whole-credit-portfolio reports (monthly, quarterly and annual) used by senior management; investigate reporting/data discrepancies and support the operational migration of portfolio dashboards to Oracle Analytics Cloud. EU citizen with unrestricted right to work in the Netherlands; English C1, German A2; no Dutch.';
  let jobs = [], cvText = '', selectedJob = null, profile = {name:'', email:'', phone:'', location:'Zagreb, Croatia', extra:DEFAULT_EXTRA};
  const stop = new Set(['the','and','for','with','from','that','this','you','your','are','was','were','will','our','their','have','has','into','job','role','team','work','working','about','what','who','how','all','can','not','but','or','in','on','to','of','a','an','is','as','at','by','be','we','they','it','its','as','per','more','also','such','than','then','if','via','over','under']);
  function toast(msg){ const el=$('toast'); if(el){el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2800);} }
  function addUI(){
    if($('cvStudio')) return;
    const main=document.querySelector('main'); if(!main) return;
    const section=document.createElement('section'); section.id='cvStudio'; section.className='cv-studio';
    section.innerHTML=`
      <div class="cv-heading"><div><p class="cv-kicker">VICE CITY CAREER LAB · PERSONAL MATCH ENGINE</p><h2>CV <span>MISSION CONTROL</span></h2><p>Učitaj svoj životopis, pronađi najbliže prilike i pripremi dokumente za prijavu.</p></div><div class="cv-orb"><b>VI</b><small>CAREER<br>EDITION</small></div></div>
      <div class="cv-grid">
        <article class="cv-panel cv-upload"><div class="cv-panel-title"><span class="cv-index">01</span><div><h3>Upload CV</h3><small>PDF · DOCX · TXT</small></div></div>
          <label class="cv-drop" for="cvFile"><span class="cv-upload-icon">↑</span><b>Odaberi svoj CV</b><small>PDF, Word ili tekstualna datoteka · do 8 MB</small><input id="cvFile" type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"></label>
          <div id="cvFileState" class="cv-file-state">CV još nije učitan.</div>
          <div class="cv-profile-fields"><label>Ime i prezime<input id="cvName" autocomplete="name" placeholder="Ime i prezime"></label><label>E-mail<input id="cvEmail" type="email" autocomplete="email" placeholder="ime@email.com"></label><label>Telefon<input id="cvPhone" autocomplete="tel" placeholder="+385…"></label><label>Lokacija<input id="cvLocation" value="Zagreb, Croatia"></label></div>
          <label class="cv-extra-label">Dodatne činjenice koje smijem koristiti u prijavama<textarea id="cvExtra" rows="3" placeholder="Npr. EU citizen, unrestricted right to work in the Netherlands; English C1; German A2; willing to relocate to the Netherlands after offer."></textarea></label>
          <div class="cv-actions"><button id="cvSave" class="cv-btn cv-primary">Spremi profil</button><button id="cvDelete" class="cv-btn cv-ghost">Obriši CV</button></div>
          <p class="cv-privacy">Privatnost: sadržaj CV-a obrađuje se lokalno u pregledniku. Ne šalje se OpenAI-ju niti drugom AI servisu. Podaci ostaju spremljeni samo u ovom pregledniku dok ih ne obrišeš.</p>
        </article>
        <article class="cv-panel cv-match"><div class="cv-panel-title"><span class="cv-index">02</span><div><h3>Match scanner</h3><small>CV VS. OPEN POSITIONS</small></div></div>
          <label class="cv-select-label">Odaberi oglas<select id="cvJobSelect"><option value="">Učitavam oglase…</option></select></label>
          <div id="cvMatchResult" class="cv-match-empty">Učitaj CV i odaberi oglas za detaljnu analizu.</div>
          <div class="cv-mini-links"><a href="https://careers.ing.com/en/location/netherlands-jobs/2618/2750405/2/en/search-jobs" target="_blank" rel="noopener">ING · svi oglasi u NL ↗</a><a href="https://rabobank.jobs/en/jobs/?country=nl" target="_blank" rel="noopener">Rabobank · oglasi u NL ↗</a></div>
        </article>
      </div>
      <article class="cv-panel cv-docs"><div class="cv-panel-title"><span class="cv-index">03</span><div><h3>Application document lab</h3><small>TAILORED APPLICATION PACK</small></div></div>
        <p class="cv-doc-intro">Za odabrani oglas pripremi prilagođeni CV i motivacijsko pismo / cover letter na engleskom jeziku.</p>
        <div class="cv-doc-grid"><div class="cv-doc-card"><div class="cv-doc-symbol">CV</div><b>Targeted CV</b><small>Postojeće iskustvo i vještine presloženi prema oglasu, bez dodavanja izmišljenih kvalifikacija.</small><button id="cvGenerateResume" class="cv-btn cv-primary" disabled>Preuzmi CV (PDF)</button></div><div class="cv-doc-card"><div class="cv-doc-symbol">✉</div><b>Cover letter</b><small>Prilagođeno pismo s nazivom pozicije, bankom i stvarnim iskustvom iz tvog CV-a.</small><button id="cvGenerateLetter" class="cv-btn cv-primary" disabled>Preuzmi cover letter (PDF)</button></div><div class="cv-doc-card"><div class="cv-doc-symbol">★</div><b>Motivation letter</b><small>Zasebno motivacijsko pismo s razlogom prijave i profesionalnim ciljevima.</small><button id="cvGenerateMotivation" class="cv-btn cv-primary" disabled>Preuzmi motivacijsko (PDF)</button></div></div>
        <div id="cvDocStatus" class="cv-doc-status">Prvo učitaj CV i odaberi oglas.</div>
        <p class="cv-disclaimer">Generator radi bez plaćenog API-ja: koristi lokalno izdvojene informacije i predloške. Provjeri svaku rečenicu, kontaktne podatke i datume prije slanja. Za stvarno AI-jezično uređivanje potreban bi bio zaseban AI servis/API.</p>
      </article>
      <div class="cv-footerline"><span>CAREER INTELLIGENCE / NL BANKING</span><span>NO PAID API · LOCAL CV ANALYSIS</span></div>`;
    const notice=main.querySelector('.notice'); if(notice) main.insertBefore(section,notice); else main.appendChild(section);
    $('cvName').value=profile.name; $('cvEmail').value=profile.email; $('cvPhone').value=profile.phone; $('cvLocation').value=profile.location; $('cvExtra').value=profile.extra;
  }
  function tokenize(s){return (String(s||'').toLowerCase().match(/[a-z0-9+#.]+/g)||[]).filter(w=>w.length>2&&!stop.has(w));}
  function extractTerms(text){const lower=text.toLowerCase();const found=KEYWORDS.filter(k=>lower.includes(k));const freq={};tokenize(text).forEach(t=>freq[t]=(freq[t]||0)+1);const generic=Object.entries(freq).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([w])=>w);return [...new Set([...found,...generic])];}
  function jobText(j){return [j.title,j.description,j.gist,(j.skills||[]).join(' '),JSON.stringify(j.facts||{})].join(' ');}
  function analyse(j){
    const cv=cvText.toLowerCase(), jt=jobText(j).toLowerCase();
    const terms=extractTerms(jobText(j)).filter(t=>t.length>2);
    const high=['ifrs 9','ecl','expected credit loss','credit risk','portfolio analysis','risk reporting','regulatory reporting','management reporting','sql','sas','data quality','reconciliation','oracle','db2','power query','provisioning','npe','forbearance','rwa'];
    let total=0,got=0,matched=[],missing=[];
    for(const term of terms){const weight=high.includes(term)?3:1.3;total+=weight;if(cv.includes(term)){got+=weight;matched.push(term);}else if(term.length>3)missing.push(term);}
    let pct=total?Math.round(got/total*100):0;
    const negative=/credit risk model|model development|quantitative model validation|derivatives pricing|machine learning engineer/i.test(jobText(j));
    const dutch=/dutch.{0,30}(required|mandatory)|native dutch|fluent dutch/i.test(jobText(j))||j.facts?.dutch_required===true;
    if(negative)pct=Math.max(0,pct-18); if(dutch)pct=Math.max(0,pct-12);
    const cvTerms=KEYWORDS.filter(k=>cv.includes(k));
    return {pct,matched:matched.sort((a,b)=>(high.includes(b)?1:0)-(high.includes(a)?1:0)).slice(0,18),missing:missing.slice(0,18),cvTerms,negative,dutch,termsCount:terms.length};
  }
  function renderMatch(){const box=$('cvMatchResult'),sel=$('cvJobSelect'); if(!box||!sel)return; const j=jobs.find(x=>String(x.id)===sel.value);selectedJob=j||null; const ready=!!(cvText&&j&&window.html2pdf);$('cvGenerateResume').disabled=!ready;$('cvGenerateLetter').disabled=!ready;$('cvGenerateMotivation').disabled=!ready;
    if(!j){box.innerHTML='<div class="cv-match-empty">Učitaj CV i odaberi oglas za detaljnu analizu.</div>';return;}
    if(!cvText){box.innerHTML='<div class="cv-match-empty">Prvo učitaj svoj CV kako bi se izračunao stvarni match.</div>';return;}
    const a=analyse(j), color=a.pct>=75?'high':a.pct>=50?'mid':'low';
    box.innerHTML=`<div class="cv-score-row"><div class="cv-score ${color}"><b>${a.pct}%</b><small>CV MATCH</small></div><div><b>${esc(j.title)}</b><small>${esc(j.bank)} · ${esc(j.location||'Netherlands')}</small><p>${a.matched.length} pronađenih podudaranja od ${a.termsCount} traženih pojmova</p></div></div>
      <div class="cv-meter"><i style="width:${a.pct}%"></i></div>
      <div class="cv-columns"><div><h4><span>✓</span> Poklapa se s CV-em</h4><div class="cv-chiplist">${a.matched.length?a.matched.map(x=>`<span>${esc(x)}</span>`).join(''):'<small>Nema jasnih podudaranja u tekstu oglasa.</small>'}</div></div><div><h4><span>!</span> Nije pronađeno u CV-u</h4><div class="cv-chiplist missing">${a.missing.length?a.missing.map(x=>`<span>${esc(x)}</span>`).join(''):'<small>Nema dodatnih ključnih pojmova.</small>'}</div></div></div>
      <div class="cv-flags">${a.negative?'<span class="flag-warn">Uloga može biti model-development / kvantitativno modeliranje</span>':''}${a.dutch?'<span class="flag-warn">Oglas navodi obvezan nizozemski</span>':''}</div>
      <a class="cv-job-link" href="${esc(j.url)}" target="_blank" rel="noopener">Otvori originalni oglas ↗</a>
      <small class="cv-score-note">Procjena je tekstualna i koristi samo podatke dostupne u feedu (često sažetak, ne puni tekst oglasa). Nije procjena poslodavca niti potvrda da ispunjavaš sve uvjete. Nedostajući pojam ne znači automatski da nemaš tu vještinu.</small>`;
  }
  async function parseFile(file){
    if(!file)return; if(file.size>8*1024*1024)throw Error('Datoteka je veća od 8 MB.'); const ext=file.name.split('.').pop().toLowerCase();
    if(ext==='txt')return await file.text();
    if(ext==='docx'){
      if(!window.mammoth){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');}
      const buf=await file.arrayBuffer();const result=await window.mammoth.extractRawText({arrayBuffer:buf});return result.value||'';
    }
    if(ext==='pdf'){
      if(!window.pdfjsLib){await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');}
      window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf=await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;let pages=[];
      for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p);const content=await page.getTextContent();pages.push(content.items.map(x=>x.str).join(' '));}
      return pages.join('\n');
    }
    throw Error('Format nije podržan. Učitaj PDF, DOCX ili TXT.');
  }
  function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Ne mogu učitati biblioteku za čitanje dokumenta. Provjeri internetsku vezu.'));document.head.appendChild(s);});}
  function saveProfile(){profile={name:$('cvName').value.trim(),email:$('cvEmail').value.trim(),phone:$('cvPhone').value.trim(),location:$('cvLocation').value.trim(),extra:$('cvExtra').value.trim()};localStorage.setItem(PROFILE,JSON.stringify(profile));if(cvText)localStorage.setItem(STORE,cvText);window.dispatchEvent(new Event('bjt-cv-updated'));toast('CV profil spremljen na ovom uređaju.');}
  function makeDoc(kind){
    if(!selectedJob||!cvText){toast('Učitaj CV i odaberi oglas.');return;}
    saveProfile();const j=selectedJob,a=analyse(j);const title=kind==='resume'?'CV':kind==='motivation'?'Motivation letter':'Cover Letter';const safeTitle=String(j.title||'Application').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,55);
    const raw=cvText.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
    const headings=/^(profile|summary|professional summary|experience|professional experience|employment history|work experience|education|skills|technical skills|certifications|languages|projects|courses|training|additional information|contact|career history)$/i;
    const sections=[];let current={name:'Profile / CV content',lines:[]};
    for(const line of raw){if(headings.test(line.replace(/[:\s]+$/,''))){if(current.lines.length)sections.push(current);current={name:line.replace(/[:\s]+$/,''),lines:[]};}else current.lines.push(line);}if(current.lines.length)sections.push(current);
    const allLines=sections.flatMap(s=>s.lines);const jobTerms=extractTerms(jobText(j));
    const ranked=sections.map((s,i)=>({ ...s, i, score:s.lines.join(' ').toLowerCase().split(/\n/).join(' ').length?jobTerms.filter(t=>s.lines.join(' ').toLowerCase().includes(t)).length:0 }));
    if(kind==='resume'){
      ranked.sort((x,y)=>{const order=n=>/profile|summary/i.test(n)?-2:/experience|employment/i.test(n)?-1:/skills/i.test(n)?0:/education/i.test(n)?2:1;return order(x.name)-order(y.name)||y.score-x.score||x.i-y.i;});
      const body=ranked.map(s=>`<h2>${esc(s.name)}</h2><div class="section-lines">${s.lines.map(line=>`<p>${esc(line)}</p>`).join('')}</div>`).join('');
      downloadDoc(`${safeTitle}-tailored-CV.pdf`,docShell(`<header><h1>${esc(profile.name||'Curriculum Vitae')}</h1><p>${[profile.email,profile.phone,profile.location].filter(Boolean).map(esc).join(' · ')}</p></header><div class="target"><b>Target role:</b> ${esc(j.title)} · ${esc(j.bank)} · CV keyword match ${a.pct}%</div>${body}<p class="footnote">This document reorganises the uploaded CV content for the selected vacancy. Review all details and formatting before submitting.</p>`));
    } else {
      const cvLower=cvText.toLowerCase();const experience=KEYWORDS.filter(k=>cvLower.includes(k)).slice(0,8);
      const name=profile.name||'Hiring Team';const contact=[profile.email,profile.phone,profile.location].filter(Boolean).join(' | ');
      const extra=profile.extra?` ${esc(profile.extra)}`:'';
      const matched=experience.length?experience.join(', '):'banking and analytical experience';
      const letter=kind==='motivation'?`<p>Dear Hiring Team,</p><p>I would like to express my motivation for joining <b>${esc(j.bank)}</b> as a <b>${esc(j.title)}</b>. I am looking to continue my banking career in the Netherlands in an international environment where careful analysis, reliable reporting and continuous improvement contribute to sound business decisions.</p><p>During nearly five years in banking, I have focused on credit portfolio analysis and reporting. My experience includes IFRS 9 and ECL-related analysis, portfolio monitoring, regulatory and management reporting, data quality checks, reconciliations and working with SQL, SAS, Oracle and DB2. I have also improved recurring reporting processes by reducing one SQL report from around 60 minutes to 4 minutes and automating another recurring report from a full working day to approximately 5 minutes.</p><p>In my current role, I independently prepare monthly, quarterly and annual reports covering the credit portfolio for senior management. I investigate reporting discrepancies, work with IT on data-quality topics and help translate reporting requirements into practical data solutions. These experiences have strengthened my attention to detail, ownership and ability to work with complex data.</p><p>I am motivated by the opportunity to apply this background at ${esc(j.bank)}, learn the organisation's processes and contribute to a team working with high-quality financial and risk information. I would welcome the opportunity to discuss how my experience and motivation align with the role.</p><p>${extra?extra+' ':''}</p><p>Thank you for considering my application.</p><p>Kind regards,<br>${esc(profile.name||'[Your name]')}</p>`:`<p>Dear Hiring Team,</p><p>I am writing to apply for the <b>${esc(j.title)}</b> position at <b>${esc(j.bank)}</b>. With nearly five years of banking experience focused on credit portfolio analysis, risk reporting and data-driven process improvements, I am interested in bringing my experience to your team.</p><p>My background includes work with ${esc(matched)}. I have worked with complex banking data and reporting processes, with a focus on accuracy, reconciliation, reliable controls and translating business requirements into practical data solutions. I would welcome the opportunity to apply this experience to the responsibilities described in your vacancy.</p><p>${extra?extra+' ':''}I am particularly interested in the opportunity to contribute to ${esc(j.bank)} while continuing to develop in an international banking environment. I would be pleased to discuss how my experience could support your team.</p><p>Thank you for your time and consideration.</p><p>Kind regards,<br>${esc(profile.name||'[Your name]')}</p>`;
      downloadDoc(`${safeTitle}-${kind==='motivation'?'motivation-letter':'cover-letter'}.pdf`,docShell(`<header><h1>${esc(profile.name||'[Your name]')}</h1><p>${esc(contact||'[Contact details]')}</p></header><p class="date">${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p><p><b>Re: ${esc(j.title)} — ${esc(j.bank)}</b></p>${letter}<p class="footnote">Draft generated from the uploaded CV and vacancy text. Review every statement and replace any placeholders before sending.</p>`));
    }
    $('cvDocStatus').textContent=`${title} pripremljen za ${j.title}. PDF se preuzima na uređaj. Otvori ga iz mape Preuzimanja i provjeri prije slanja.`;
  }
  function docShell(content){return `<!doctype html><html><head><meta charset="utf-8"><title>Application document</title><style>body{font-family:Arial,sans-serif;color:#202536;max-width:850px;margin:45px auto;padding:0 48px;line-height:1.55;font-size:11pt}header{border-bottom:3px solid #12a8a8;padding-bottom:14px;margin-bottom:22px}h1{font-size:25pt;margin:0 0 6px;color:#14243b}header p{margin:0;color:#526176}h2{font-size:13pt;color:#087f86;border-bottom:1px solid #d6e1e5;padding-bottom:4px;margin-top:24px;text-transform:uppercase}p{margin:7px 0}.target{background:#eef7f7;padding:10px;margin:18px 0}.date{text-align:right;color:#667}.footnote{font-size:9pt;color:#778;margin-top:30px;border-top:1px solid #ddd;padding-top:8px}.section-lines p{margin:5px 0}</style></head><body>${content}</body></html>`;}
  let pdfLibraryPromise=null;
  function ensurePdfLibrary(){if(window.html2pdf)return Promise.resolve();if(!pdfLibraryPromise)pdfLibraryPromise=loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');return pdfLibraryPromise;}
  async function downloadDoc(filename,html){
    try{
      await ensurePdfLibrary();
      const parsed=new DOMParser().parseFromString(html,'text/html');const node=parsed.body;
      node.style.width='186mm';node.style.maxWidth='186mm';node.style.margin='0';node.style.padding='0';node.style.background='#fff';
      document.body.appendChild(node);
      await window.html2pdf().set({margin:[12,14,12,14],filename:filename.replace(/\.doc$/i,'.pdf'),image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',scrollY:0},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(node).save();
      node.remove();return true;
    }catch(err){console.error('PDF export failed',err);toast('PDF nije moguće izraditi. Provjeri internetsku vezu i pokušaj ponovno.');return false;}
  }
  async function init(){addUI();ensurePdfLibrary().then(()=>renderMatch()).catch(err=>{console.warn('PDF library unavailable',err);$('cvDocStatus').textContent='PDF biblioteka nije dostupna. Provjeri internetsku vezu i osvježi stranicu.';});try{const saved=localStorage.getItem(STORE);if(saved){cvText=saved;$('cvFileState').textContent=`Spremljen CV je učitan (${Math.round(cvText.length/1000)}k znakova).`;}}catch{}
    try{profile={...profile,...JSON.parse(localStorage.getItem(PROFILE)||'{}')};if(!profile.extra)profile.extra=DEFAULT_EXTRA;$('cvName').value=profile.name||'';$('cvEmail').value=profile.email||'';$('cvPhone').value=profile.phone||'';$('cvLocation').value=profile.location||'Zagreb, Croatia';$('cvExtra').value=profile.extra||'';}catch{}
    try{const r=await fetch('./jobs.json?cv='+Date.now(),{cache:'no-store'});const data=await r.json();jobs=(data.jobs||[]).filter(j=>j&&j.title&&j.url);$('cvJobSelect').innerHTML='<option value="">Odaberi poziciju…</option>'+jobs.map(j=>`<option value="${esc(j.id)}">${esc(j.bank)} — ${esc(j.title)} (${esc(j.location||'NL')})</option>`).join('');}catch{$('cvJobSelect').innerHTML='<option value="">Feed oglasa trenutačno nije dostupan</option>';}
    $('cvJobSelect').addEventListener('change',renderMatch);
    $('cvFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;$('cvFileState').textContent='Čitam CV…';try{const text=await parseFile(file);if(!text.trim())throw Error('Nije pronađen tekst. Ako je PDF skeniran kao slika, prvo ga pretvori u tekstualni PDF.');cvText=text;localStorage.setItem(STORE,cvText);window.dispatchEvent(new Event('bjt-cv-updated'));$('cvFileState').textContent=`${file.name} · ${Math.round(text.length/1000)}k znakova · spremljeno lokalno`;renderMatch();toast('CV uspješno učitan i analiziran.');}catch(err){$('cvFileState').textContent=err.message;toast(err.message);}});
    $('cvSave').addEventListener('click',saveProfile);$('cvDelete').addEventListener('click',()=>{cvText='';localStorage.removeItem(STORE);window.dispatchEvent(new Event('bjt-cv-updated'));$('cvFile').value='';$('cvFileState').textContent='CV je obrisan iz ovog preglednika.';renderMatch();toast('Lokalna kopija CV-a obrisana.');});
    $('cvGenerateResume').addEventListener('click',()=>makeDoc('resume'));$('cvGenerateLetter').addEventListener('click',()=>makeDoc('letter'));$('cvGenerateMotivation').addEventListener('click',()=>makeDoc('motivation'));
    if(cvText)renderMatch();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
