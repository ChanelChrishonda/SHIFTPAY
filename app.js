// app.js
// Click / typing handlers + startup. Loads last.
// TODO: pay stub checker (compare stub hours to logged hours) - top feature request. So far there is a $100 difference with ShiftWorkPay showing around a $100 increase in net amount.
// TODO: semi-monthly (ex.1st/15th) and monthly pay (Daycare providers in some states/jurisdictions). Only works for weekly / every 2 weeks right now. 

/* ===================== EVENTS ===================== */
document.querySelector("nav.tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;tab=b.dataset.tab;openDay=null;render();window.scrollTo(0,0);});
document.getElementById("prev").onclick=()=>{periodStart=addDays(periodStart,-periodLen(S.setup));openDay=null;render();};
document.getElementById("next").onclick=()=>{periodStart=addDays(periodStart,periodLen(S.setup));openDay=null;render();};
document.getElementById("todayBtn").onclick=()=>{periodStart=currentPeriodStart(S.setup,new Date());jumpYear=null;render();};
const jumpEl=document.getElementById("jump"), datesBtn=document.getElementById("datesBtn");
function toggleJump(open){jumpEl.hidden=!open;datesBtn.setAttribute("aria-expanded",String(open));jumpYear=periodStart.getFullYear();if(open)jumpEl.innerHTML=jumpPanel();}
datesBtn.onclick=()=>toggleJump(jumpEl.hidden);
jumpEl.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.jy){jumpYear+=+b.dataset.jy;jumpEl.innerHTML=jumpPanel();return;}
  if(b.dataset.jm!=null){periodStart=firstPeriodInMonth(S.setup,jumpYear,+b.dataset.jm);openDay=null;toggleJump(false);render();}});
jumpEl.addEventListener("change",e=>{if(e.target.id==="jumpDate"&&e.target.value){periodStart=currentPeriodStart(S.setup,parseISO(e.target.value));openDay=null;toggleJump(false);render();}});

function clearExample(){S={v:2,setup:{...S.setup},hours:{}};delete S.example;delete S.setup.example;
  S.setup.banks=defaultBanks(iso(new Date()));persist();}
main.addEventListener("click",async e=>{
  const t=e.target.closest("[data-act],[data-day],[data-q],[data-goto],[data-jump],[data-del],[data-deltype],[data-delbank],[data-delyes],[data-delhide],[data-delno],[data-addlib]");if(!t)return;
  if(t.dataset.goto){tab=t.dataset.goto;render();return;}
  if(t.dataset.jump){periodStart=parseISO(t.dataset.jump);tab="check";render();window.scrollTo(0,0);return;}
  if(t.dataset.day){openDay=openDay===t.dataset.day?null:t.dataset.day;render();
    if(openDay)document.querySelector(`[data-day="${openDay}"]`)?.scrollIntoView({block:"nearest",behavior:"smooth"});return;}
  if(t.dataset.q){const q=t.dataset.q;let hh={...(S.hours[openDay]||{})};
    if(q==="clear")hh={};else{const add=q.startsWith("+");const [k,v]=q.replace("+","").split(":");hh[k]=add?(+hh[k]||0)+ +v:+v;}
    setHours(openDay,hh);render();return;}
  if(t.dataset.del!=null){S.setup.deds.splice(+t.dataset.del,1);persist();render();return;}
  if(t.dataset.deltype!=null){const i=+t.dataset.deltype;leaveExampleForEdit();const ty=S.setup.types[i];
    if(usage(ty.k).n){pendingDel=pendingDel===i?null:i;render();return;}
    S.setup.types.splice(i,1);pendingDel=null;persist();render();return;}
  if(t.dataset.delyes!=null){S.setup.types.splice(+t.dataset.delyes,1);pendingDel=null;persist();render();return;}
  if(t.dataset.delhide!=null){S.setup.types[+t.dataset.delhide].show=false;pendingDel=null;persist();render();return;}
  if(t.dataset.delno){pendingDel=null;render();return;}
  if(t.dataset.addlib){leaveExampleForEdit();const item=LIBRARY.flatMap(g=>g.items).find(x=>x.k===t.dataset.addlib);
    const nt={...item,show:true};
    if(nt.bank&&!S.setup.banks.some(b=>b.id===nt.bank))delete nt.bank;
    if(nt.earn&&!S.setup.banks.some(b=>b.id===nt.earn)){S.setup.banks.push({id:nt.earn,name:"Comp time",start:0,asOf:iso(new Date()),accrual:0,max:""});}
    S.setup.types.push(nt);persist();render();return;}
  if(t.dataset.delbank!=null){const b=S.setup.banks[+t.dataset.delbank];S.setup.banks.splice(+t.dataset.delbank,1);
    S.setup.types.forEach(x=>{if(x.bank===b.id)delete x.bank;});persist();render();return;}
  const a=t.dataset.act;
  if(a==="start"){clearExample();periodStart=currentPeriodStart(S.setup,new Date());tab="setup";render();}
  if(a==="addDed"){S.setup.deds.push({name:"",amount:0,type:"$",preInc:false,preFica:false});persist();render();}
  if(a==="addType"){pickerOpen=!pickerOpen;pendingDel=null;render();return;}
  if(a==="addCustom"){leaveExampleForEdit();pickerOpen=false;S.setup.types.push({k:"c"+Date.now().toString(36),label:"New pay type",short:"New",kind:"mult",val:1,worked:true,show:true});persist();render();
    const ins=main.querySelectorAll('[data-t$=":label"]');const last=ins[ins.length-1];last?.focus();last?.select();}
  if(a==="addBank"){if(S.example)clearExampleKeepView();const id="b"+Date.now().toString(36);
    S.setup.banks.push({id,name:"New leave",start:0,asOf:iso(new Date()),accrual:0,max:""});
    S.setup.types.push({k:"u"+id,label:"New leave used",short:"Leave",kind:"mult",val:1,worked:false,show:true,bank:id});persist();render();}
  if(a==="saveFile"){const code="SHIFTPAY1:"+btoa(unescape(encodeURIComponent(JSON.stringify(S))));
    const blob=new Blob([code],{type:"text/plain"});const url=URL.createObjectURL(blob);const link=document.createElement("a");
    link.href=url;link.download="shiftworkpay-backup-"+iso(new Date())+".txt";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);msg("Backup file saved. Look in your Downloads or Files app.");}
  if(a==="export"){document.getElementById("code").value="SHIFTPAY1:"+btoa(unescape(encodeURIComponent(JSON.stringify(S))));msg("This code holds all your hours and settings. Keep it somewhere safe.");}
  if(a==="copy"){const ta=document.getElementById("code");try{await navigator.clipboard.writeText(ta.value);msg("Copied.");}catch(err){ta.select();msg("Selected. Use your phone's Copy.");}}
  if(a==="import"){const raw=document.getElementById("code").value.trim();
    try{if(!raw.startsWith("SHIFTPAY1:"))throw 0;const v=JSON.parse(decodeURIComponent(escape(atob(raw.slice(10)))));if(!v.setup||!v.hours)throw 0;
      S=normalize(v);periodStart=currentPeriodStart(S.setup,new Date());persist();tab="check";render();}
    catch(err){msg("That code didn't load. Copy the whole code, starting with SHIFTPAY1:");}}
});
main.addEventListener("change",e=>{if(e.target.id!=="openFile"||!e.target.files[0])return;const fr=new FileReader();
  fr.onload=()=>{document.getElementById("code").value=String(fr.result).trim();main.querySelector('[data-act="import"]').click();};fr.readAsText(e.target.files[0]);});
function msg(t){const m=document.getElementById("codeMsg");if(m)m.textContent=t;}
function setHours(k,hh){
  if(S.example)clearExampleKeepView();
  Object.keys(hh).forEach(x=>{if(!(+hh[x]))delete hh[x];});
  if(Object.keys(hh).length)S.hours[k]=hh;else delete S.hours[k];
  persist();
}
function clearExampleKeepView(){const ps=periodStart;clearExample();periodStart=ps;}
function leaveExampleForEdit(){if(S.example){const ps=periodStart;delete S.example;delete S.setup.example;S.hours={};S.setup.banks=defaultBanks(iso(new Date()));periodStart=ps;}}

main.addEventListener("input",e=>{
  const el=e.target;
  if(el.dataset.h){const hh={...(S.hours[openDay]||{})};const v=parseFloat(el.value);hh[el.dataset.h]=isNaN(v)?0:v;setHours(openDay,hh);
    const c=calcPeriod(S.setup,periodStart);const d=c.days.find(x=>iso(x.d)===openDay);
    const row=document.querySelector(`[data-day="${openDay}"]`);if(row&&d){row.querySelector(".chips").innerHTML=chipsFor(d.h);row.querySelector(".day-amt").textContent=d.amt?money(d.amt):"";}
    return;}
  if(el.dataset.skip!=null){if(S.example)leaveExampleForEdit();S.skip=S.skip||{};const k=iso(periodStart);const set=new Set(S.skip[k]||[]);
    if(el.checked)set.delete(el.dataset.skip);else set.add(el.dataset.skip);
    if(set.size)S.skip[k]=[...set];else delete S.skip[k];persist();render();return;}
  if(el.dataset.s||el.dataset.t||el.dataset.d||el.dataset.pct||el.dataset.b) leaveExampleForEdit();
  const s=S.setup;
  if(el.dataset.s){const k=el.dataset.s;let v=el.value;
    if(el.hasAttribute("data-bool"))v=v==="true";
    else if(!["status","state","homeState","county","anchor","stateOverride","step3amt"].includes(k))v=v===""?0:parseFloat(v)||0;
    if(k==="freq")v=+el.value;
    s[k]=v;persist();
    if(["status","state","homeState","homeWithhold","freq","step2","exempt","anchor"].includes(k)){if(k==="freq"||k==="anchor")periodStart=currentPeriodStart(s,new Date());render();}
    return;}
  if(el.dataset.t){const [i,f]=el.dataset.t.split(":");const t=s.types[+i];
    if(el.type==="checkbox")t[f]=el.checked;
    else if(f==="val")t[f]=parseFloat(el.value)||0;
    else if(f==="bank"){if(el.value)t.bank=el.value;else delete t.bank;}
    else t[f]=el.value;
    persist();
    if(f==="kind"||f==="show")render();
    else{const r=main.querySelector(`[data-rate="${i}"]`);if(r)r.textContent=money(typeRate(s,t))+"/hr";}
    return;}
  if(el.dataset.b){const [i,f]=el.dataset.b.split(":");const b=s.banks[+i];
    if(f==="name"||f==="asOf")b[f]=el.value;else if(f==="max")b[f]=el.value===""?"":parseFloat(el.value)||0;else b[f]=parseFloat(el.value)||0;
    persist();return;}
  if(el.dataset.pct){s[el.dataset.pct]=(parseFloat(el.value)||0)/100;persist();return;}
  if(el.dataset.d){const [i,f]=el.dataset.d.split(":");const d=s.deds[+i];
    if(el.type==="checkbox")d[f]=el.checked;else if(f==="amount")d[f]=parseFloat(el.value)||0;else d[f]=el.value;persist();return;}
});
// Re-draw leave cards when a field is finished (not on every keystroke, so typing isn't interrupted)
main.addEventListener("change",e=>{if(e.target.dataset&&e.target.dataset.b)render();});
main.addEventListener("toggle",e=>{if(e.target.matches&&e.target.matches("details[data-bank]"))openBanks[e.target.dataset.bank]=e.target.open;},true);

/* ===================== BOOT ===================== */
(async function(){
  try { await loadTaxData(); }
  catch(e){ document.getElementById("main").innerHTML='<section class="card"><h2>Couldn\'t load tax tables</h2><p class="fine">Check your connection and reopen the app. If this keeps happening, data/tax-2026.json may be missing.</p></section>'; return; }
  S=EXAMPLE();periodStart=currentPeriodStart(S.setup,new Date());render();
  const loaded=await initStore();
  if(loaded&&loaded.setup){S=normalize(loaded);periodStart=currentPeriodStart(S.setup,new Date());setSaveLabel("Saved on this phone");}
  else setSaveLabel("Example data");
  if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("sw.js").catch(()=>{});
  render();
})();
