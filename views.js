// views.js
// Builds each tab's HTML. Plain template strings - no framework.
// TODO: this file is getting long. Split Setup into its own file next time.

/* ===================== RENDER ===================== */
const main=document.getElementById("main");
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function renderHeader(){
  const s=S.setup,L=periodLen(s),end=addDays(periodStart,L-1);
  document.getElementById("pDates").textContent=fmtD(periodStart)+" – "+fmtD(end)+(periodStart.getFullYear()!==new Date().getFullYear()?", "+periodStart.getFullYear():"");
  document.getElementById("pPay").textContent="Payday "+addDays(end,+s.payLag||0).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  const cur=currentPeriodStart(s,new Date());
  document.getElementById("todayBtn").hidden=iso(cur)===iso(periodStart);
  if(S.example) setSaveLabel("Example data");
  const j=document.getElementById("jump");
  if(!j.hidden) j.innerHTML=jumpPanel();
}
function jumpPanel(){
  const y=jumpYear??periodStart.getFullYear();
  const withHours=new Set(Object.keys(S.hours).filter(k=>k.startsWith(y+"-")).map(k=>+k.slice(5,7)-1));
  const curM=periodStart.getFullYear()===y?periodStart.getMonth():-1;
  return `<div class="jump-yr"><button data-jy="-1" aria-label="Previous year">‹</button><b>${y}</b><button data-jy="1" aria-label="Next year">›</button></div>
  <div class="months">${MONTHS.map((m,i)=>`<button data-jm="${i}" class="${i===curM?"cur":""}" aria-label="${m} ${y}">${m}${withHours.has(i)?'<i aria-hidden="true"></i>':""}</button>`).join("")}</div>
  <div class="jump-date"><label for="jumpDate">Or pick a day:</label><input type="date" id="jumpDate" value="${iso(periodStart)}"></div>`;
}
function banner(){
  if(!S.example) return "";
  return `<div class="banner"><p><b>These are example hours.</b> Clear them, then set your pay rate and W-4 in Setup.</p><button class="btn primary small" data-act="start">Start with my own</button></div>`;
}
function render(){
  renderHeader();
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-current",b.dataset.tab===tab?"page":"false"));
  const v={check:viewCheck,hours:viewHours,leave:viewLeave,history:viewHistory,setup:viewSetup}[tab];
  main.innerHTML=banner()+v();
}

function viewCheck(){
  const c=calcPeriod(S.setup,periodStart);
  if(c.gross===0) return `<section class="card hero"><div class="k">Net pay</div><div class="net num">$0.00</div><div class="sub">No hours logged for this period yet.</div></section>
    <button class="btn primary" data-goto="hours">Enter hours</button>`;
  const pct=x=>Math.max(0,x/c.gross*100).toFixed(2)+"%";
  const earnRows=c.earn.filter(e=>e.hours&&e.amount).map(e=>`<div class="line"><span>${esc(e.label)}<br><span class="d">${hrs(e.hours)} hrs × ${money(e.rate)}</span></span><span class="amt">${money(e.amount)}</span></div>`).join("");
  const banked=c.earn.filter(e=>e.hours&&e.earn);
  const s=S.setup;
  return `
  <section class="card hero" aria-label="Net pay">
    <div class="k">Net pay · estimated</div>
    <div class="net num">${money(c.net)}</div>
    <div class="sub">from ${money(c.gross)} gross</div>
    <div class="split" role="img" aria-label="Gross pay split">
      <span style="width:${pct(c.net)};background:var(--accent)"></span>
      <span style="width:${pct(c.taxes)};background:#E2725F"></span>
      <span style="width:${pct(c.dedTot)};background:#8FA6BE"></span>
    </div>
    <div class="legend"><span><i style="background:var(--accent)"></i>Take-home ${Math.round(c.net/c.gross*100)}%</span><span><i style="background:#E2725F"></i>Taxes ${money(c.taxes)}</span><span><i style="background:#8FA6BE"></i>Deductions ${money(c.dedTot)}</span></div>
    <div class="stats">
      <div class="stat"><div class="v">${hrs(c.worked)}</div><div class="l">hours worked</div></div>
      <div class="stat"><div class="v">${hrs(c.premHrs)}</div><div class="l">hrs at 1.5× or more</div></div>
      <div class="stat"><div class="v">${hrs(c.paid)}</div><div class="l">paid hours</div></div>
    </div>
  </section>
  <section class="card"><h2>Earnings</h2><div class="lines">${earnRows}<div class="line total"><span>Gross pay</span><span class="amt">${money(c.gross)}</span></div></div>
  ${banked.length?`<p class="fine">${banked.map(e=>`${hrs(e.hours)} hrs ${esc(e.label.toLowerCase())} went to your leave bank instead of this check.`).join(" ")}</p>`:""}</section>
  <section class="card"><h2>Taxes</h2><div class="lines">
    <div class="line"><span>Federal income tax</span><span class="amt minus">${money(c.fed)}</span></div>
    <div class="line"><span>Social Security <span class="d">6.2%</span></span><span class="amt minus">${money(c.ss)}</span></div>
    <div class="line"><span>Medicare <span class="d">1.45%</span></span><span class="amt minus">${money(c.med)}</span></div>
    <div class="line"><span>${esc(c.SS_.wState)} state tax <span class="d">${(c.sr*100).toFixed(2)}%</span></span><span class="amt minus">${money(c.st)}</span></div>
    ${c.homeW?`<div class="line"><span>${esc(c.SS_.home)} (home state) extra <span class="d">${(c.SS_.gap*100).toFixed(2)}%</span></span><span class="amt minus">${money(c.homeW)}</span></div>`:""}
    ${(+s.countyRate||+s.countyExtra)?`<div class="line"><span>${esc(s.county||"County / local")} tax <span class="d">${(s.countyRate*100).toFixed(2)}%</span></span><span class="amt minus">${money(c.co)}</span></div>`:""}
    <div class="line total"><span>Total taxes</span><span class="amt minus">${money(c.taxes)}</span></div></div>
    ${c.homeGap?`<p class="fine"><b>Heads up:</b> you live in ${esc(c.SS_.home)}, which taxes at a higher rate than ${esc(c.SS_.work)}. Up to about ${money(c.homeGap)} more from this check may be owed to ${esc(c.SS_.home)} at tax time, after its credit for ${esc(c.SS_.work)} tax. You can turn on home-state withholding in Setup.</p>`:""}</section>
  ${c.deds.length?`<section class="card"><h2>Deductions</h2><div class="lines">${c.deds.map(d=>`<div class="line"${d.off?' style="opacity:.55"':""}><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:auto" data-skip="${esc(d.name)}" ${d.off?"":"checked"} aria-label="Taken from this check">${esc(d.name)}${d.preInc?' <span class="d">pre-tax</span>':""}${d.type==="%"?` <span class="d">${+d.amount}%</span>`:""}</label><span class="amt minus">${d.off?"skipped":money(d.amt)}</span></div>`).join("")}
    <div class="line total"><span>Total deductions</span><span class="amt minus">${money(c.dedTot)}</span></div></div>
    <p class="fine">Uncheck a deduction that isn't taken from this check, like union dues taken once a month.</p></section>`:""}
  <section class="card"><details><summary>How your taxes were figured</summary><div class="lines">
    <div class="line"><span>Gross pay</span><span class="amt">${money(c.gross)}</span></div>
    ${c.imputed?`<div class="line"><span>Plus imputed income (not paid to you)</span><span class="amt">${money(c.imputed)}</span></div>`:""}
    <div class="line"><span>Minus pre-tax deductions</span><span class="amt">${money(c.preInc)}</span></div>
    <div class="line"><span>Taxable wages this check</span><span class="amt">${money(c.taxable)}</span></div>
    <div class="line"><span>× ${s.freq} checks = yearly pace</span><span class="amt">${money(c.annual)}</span></div>
    <div class="line"><span>Adjusted for W-4 Step 4(a)/(b)</span><span class="amt">${money(c.adj)}</span></div>
    <div class="line"><span>Yearly tax from IRS ${TAX_YEAR} table</span><span class="amt">${money(c.yearTax)}</span></div>
    <div class="line"><span>Minus W-4 Step 3 credits</span><span class="amt">${money(c.credits)}</span></div>
    <div class="line"><span>÷ ${s.freq}, plus Step 4(c) extra</span><span class="amt">${money(c.fed)}</span></div>
    <div class="line"><span>State exemptions per check</span><span class="amt">${money(c.exPer)}</span></div>
    <div class="line"><span>State taxable wages</span><span class="amt">${money(c.stW)}</span></div>
    <div class="line"><span>County taxable wages</span><span class="amt">${money(c.coW)}</span></div>
  </div><p class="fine">Federal uses the IRS ${TAX_YEAR} percentage method (Pub. 15-T) for the 2020-and-later W-4. Estimates can differ from your stub by a few dollars. This isn't tax advice.</p></details></section>`;
}

function chipsFor(hh){
  const parts=S.setup.types.filter(t=>+hh[t.k]).map(t=>`<span class="chip${isPremiumRate(t)?" ot":""}">${hrs(+hh[t.k])} ${esc(t.short||t.label)}</span>`);
  return parts.length?parts.join(""):`<span class="chip off">Off</span>`;
}
function viewHours(){
  const c=calcPeriod(S.setup,periodStart);
  const todayIso=iso(new Date());
  const weeks=[];for(let i=0;i<c.days.length;i+=7)weeks.push(c.days.slice(i,i+7));
  return weeks.map((w,wi)=>{
    const worked=w.reduce((a,d)=>a+d.worked,0), amt=w.reduce((a,d)=>a+d.amt,0);
    return `<section class="card"><div class="week-h"><h2>Week ${wi+1}</h2><span class="fine num">${hrs(worked)} hrs worked · ${money(amt)}</span></div>
    <div class="meter" title="Hours worked toward 40"><span style="width:${Math.min(100,worked/40*100)}%"></span></div>
    ${w.map(d=>{const k=iso(d.d);const open=openDay===k;return `<div class="day${k===todayIso?" today":""}">
      <button class="day-row" data-day="${k}" aria-expanded="${open}"><span class="day-date"><b>${d.d.getDate()}</b><span>${d.d.toLocaleDateString("en-US",{weekday:"short"})}</span></span>
      <span class="chips">${chipsFor(d.h)}</span><span class="day-amt">${d.amt?money(d.amt):""}</span></button>
      ${open?editor(k,d.h):""}</div>`;}).join("")}
    </section>`;}).join("")+`<p class="fine">Tap a day to enter hours. Leave and paid holiday hours are paid, but they don't count toward hours worked for overtime. Rename, add or hide pay types in Setup.</p>`;
}
function editor(k,hh){
  const T=S.setup.types, has=x=>T.some(t=>t.k===x&&t.show);
  const q=[];
  if(has("reg")){q.push(["reg:8","8 Reg"],["reg:12","12 Reg"]);}
  if(has("ot")){q.push(["+ot:4","+4 OT"],["ot:8","8 OT"],["ot:12","12 OT"]);}
  T.filter(t=>t.show&&t.bank).forEach(t=>q.push([t.k+":8","8 "+(t.short||t.label)]));
  if(has("hp"))q.push(["hp:8","8 Hol pd"]);
  const fields=T.filter(t=>t.show||+hh[t.k]);
  return `<div class="editor"><div class="quick">${q.map(([d,l])=>`<button data-q="${esc(d)}">${esc(l)}</button>`).join("")}
    <button class="clear" data-q="clear">Clear day</button></div>
    <div class="fields">${fields.map(t=>`<div class="f"><label for="h-${esc(t.k)}" title="${esc(t.label)}">${esc(t.label)}</label><input id="h-${esc(t.k)}" data-h="${esc(t.k)}" inputmode="decimal" value="${+hh[t.k]?+hh[t.k]:""}" placeholder="0"></div>`).join("")}</div></div>`;
}

function viewLeave(){
  const s=S.setup, today=new Date(), L=periodLen(s), pEnd=addDays(periodStart,L-1), y=today.getFullYear();
  const nextEnd=addDays(parseISO(s.anchor),(periodEndsUpTo(s,today)+1)*L-1);
  return `<section class="card"><h2>Leave balances</h2><p class="fine" style="margin:0">Enter each balance from your latest pay stub and the date it's from. ShiftWorkPay adds what you earn each pay period and subtracts leave you log on the Hours tab.</p></section>
  ${s.banks.map((b,i)=>{const now=bankBalance(s,b,today), then=bankBalance(s,b,pEnd), ya=yearActivity(s,b,y);
    const showThen=iso(pEnd)!==iso(currentPeriodStart(s,today)) && dayDiff(today,pEnd)!==0;
    return `<section class="card bank">
      <div class="bank-top"><h3>${esc(b.name)}</h3><div class="bank-bal${now.bal<0?" neg":""}">${hrs(now.bal)} <small>hrs</small></div></div>
      <div class="bank-stats">
        <div><div class="v">${hrs(ya.used)}</div><div class="l">used in ${y}</div></div>
        <div><div class="v">${+b.accrual?"+"+hrs(+b.accrual):"—"}</div><div class="l">${+b.accrual?"next on "+fmtD(nextEnd):"no accrual set"}</div></div>
        <div><div class="v">${money(now.bal*(+s.rate||0))}</div><div class="l">worth at your rate</div></div>
      </div>
      ${showThen?`<p class="fine" style="margin:0">By the end of the period you're viewing (${fmtD(pEnd)}): <b>${hrs(then.bal)} hrs</b></p>`:""}
      ${ya.earned?`<p class="fine" style="margin:0">Earned from banked OT in ${y}: ${hrs(ya.earned)} hrs</p>`:""}
      <details data-bank="${i}" ${openBanks[i]?"open":""}><summary>Update ${esc(b.name.toLowerCase())}</summary><div class="form" style="margin-top:6px">
        <div class="row"><label for="bn${i}">Name</label><input id="bn${i}" data-b="${i}:name" value="${esc(b.name)}"></div>
        <div class="row"><label for="bs${i}">Balance on your stub (hours)</label><input id="bs${i}" data-b="${i}:start" inputmode="decimal" value="${b.start}"></div>
        <div class="row"><label for="ba${i}">As of date<small>The stub's period end date</small></label><input id="ba${i}" type="date" data-b="${i}:asOf" value="${esc(b.asOf)}"></div>
        <div class="row"><label for="bc${i}">Hours earned each pay period</label><input id="bc${i}" data-b="${i}:accrual" inputmode="decimal" value="${b.accrual}"></div>
        <div class="row"><label for="bm${i}">Maximum you can carry<small>Optional</small></label><input id="bm${i}" data-b="${i}:max" inputmode="decimal" value="${esc(b.max)}" placeholder="none"></div>
        <button class="btn small danger" data-delbank="${i}">Remove ${esc(b.name)}</button>
      </div></details>
    </section>`;}).join("")}
  <button class="btn small" data-act="addBank">+ Add a leave type</button>
  <p class="fine">Pay types that use each bank are set in Setup → Pay types. "OT banked as comp" adds 1.5 hours of comp time for every hour, instead of paying it.</p>`;
}

function periodsWithHours(){
  const s=S.setup,L=periodLen(s);const starts=new Set();
  Object.keys(S.hours).forEach(k=>{const hh=S.hours[k];if(!s.types.some(t=>+hh[t.k]))return;starts.add(iso(currentPeriodStart(s,parseISO(k))));});
  return [...starts].sort().reverse().map(st=>{const d=parseISO(st);return {d,c:calcPeriod(s,d),end:addDays(d,L-1)};});
}
function viewHistory(){
  const list=periodsWithHours();
  const yr=list.filter(p=>addDays(p.end,+S.setup.payLag||0).getFullYear()===new Date().getFullYear());
  const sum=f=>yr.reduce((a,p)=>a+f(p.c),0);
  return `<section class="card"><h2>${new Date().getFullYear()} so far · paydays logged here</h2><div class="ytd">
    <div><div class="v">${money(sum(c=>c.gross))}</div><div class="l">Gross</div></div>
    <div><div class="v" style="color:var(--good)">${money(sum(c=>c.net))}</div><div class="l">Net</div></div>
    <div><div class="v">${money(sum(c=>c.taxes))}</div><div class="l">Taxes</div></div>
    <div><div class="v">${hrs(sum(c=>c.premHrs))}</div><div class="l">Hours at 1.5× or more</div></div></div></section>
  <section class="card"><h2>Pay periods</h2><div class="hist">${list.length?list.map(p=>`<button class="hrow" data-jump="${iso(p.d)}">
    <span class="p">${fmtD(p.d)} – ${fmtD(p.end)}</span><span class="g">${money(p.c.gross)}</span><span class="n">${money(p.c.net)}</span>
    <span class="s">Paid ${fmtD(addDays(p.end,+S.setup.payLag||0))} · ${hrs(p.c.worked)} hrs worked · fed ${money(p.c.fed)}</span></button>`).join(""):`<p class="fine">Periods show up here once you log hours.</p>`}</div></section>
  <section class="card"><h2>Backup & move to another device</h2>
    <p class="fine">Your hours are saved on this phone, in this browser, and nowhere else. There's no account, and nobody else can see them. Save a backup file every few paychecks, and use it to move to a new phone.</p>
    <div style="display:grid;gap:8px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small primary" data-act="saveFile">Save backup file</button><label class="btn small" for="openFile">Open backup file</label><input type="file" id="openFile" accept=".txt,.json,text/plain" hidden></div>
    <p class="fine" style="margin:6px 0 0">Or use a backup code instead:</p>
    <button class="btn small" data-act="export">Show my backup code</button>
    <textarea id="code" placeholder="Paste a backup code here to load it" aria-label="Backup code"></textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" data-act="copy">Copy code</button><button class="btn small primary" data-act="import">Load pasted code</button></div>
    <p class="fine" id="codeMsg" role="status"></p></div></section>`;
}

function opt(v,cur,label){return `<option value="${esc(v)}"${String(v)===String(cur)?" selected":""}>${esc(label??v)}</option>`;}
function typeRows(s){
  const bankOpts=(cur)=>opt("",cur||"","None")+s.banks.map(b=>opt(b.id,cur||"",b.name)).join("");
  return `<div class="ph"><span>Name</span><span>Short</span><span>Type</span><span>Value</span></div>`+
  s.types.map((t,i)=>`<div class="ptype${t.show?"":" hidden-type"}">
    <div class="ptype-main">
      <input aria-label="Pay type name" data-t="${i}:label" value="${esc(t.label)}">
      <input aria-label="Short label" data-t="${i}:short" value="${esc(t.short)}" maxlength="8">
      <select aria-label="Multiplier or flat dollars" data-t="${i}:kind">${opt("mult",t.kind,"×")}${opt("flat",t.kind,"$")}</select>
      <input aria-label="${t.kind==="flat"?"Dollars per hour":"Multiplier"}" data-t="${i}:val" inputmode="decimal" value="${t.val}">
    </div>
    <div class="ptype-flags">
      <label><input type="checkbox" data-t="${i}:show" ${t.show?"checked":""}>Show</label>
      <label><input type="checkbox" data-t="${i}:worked" ${t.worked?"checked":""}>Counts toward OT</label>
      ${t.earn?`<span>Adds ${hrs(+t.earnRate||1)}× to ${esc((s.banks.find(b=>b.id===t.earn)||{}).name||"bank")}</span>`:`<label>Uses leave bank <select data-t="${i}:bank">${bankOpts(t.bank)}</select></label>`}
      <span class="rate" data-rate="${i}">${money(typeRate(s,t))}/hr</span>
      <button class="x" data-deltype="${i}" aria-label="Delete ${esc(t.label)}">×</button>
    </div>${pendingDel===i?delConfirm(t,i):""}</div>`).join("")+
  `<button class="btn small${pickerOpen?" primary":""}" data-act="addType" style="margin-top:8px" aria-expanded="${pickerOpen}">${pickerOpen?"Close list":"+ Add pay type"}</button>
  ${pickerOpen?picker(s):""}
  <p class="fine">× multiplies your base rate (1.5 = time and a half). $ is a flat amount per hour, like a shift differential. Tap × on the right of a type to delete it, or uncheck Show to just hide it.</p>`;
}
function usage(k){let n=0,h=0;Object.values(S.hours).forEach(d=>{if(+d[k]){n++;h+=+d[k];}});return {n,h};}
function delConfirm(t,i){const u=usage(t.k);
  return `<div class="banner" style="margin-top:8px"><p>Delete <b>${esc(t.label)}</b>? You've logged ${hrs(u.h)} hours of it on ${u.n} day${u.n===1?"":"s"}. Those hours will stop counting in your pay. If you add ${esc(t.label)} back later from the list, they'll return.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small danger" data-delyes="${i}">Delete</button><button class="btn small" data-delhide="${i}">Just hide it</button><button class="btn small" data-delno="1">Cancel</button></div></div>`;}
function picker(s){const have=new Set(s.types.map(t=>t.k));
  const groups=LIBRARY.map(g=>{const items=g.items.filter(x=>!have.has(x.k));if(!items.length)return "";
    return `<div style="margin-top:10px"><div class="fine" style="font-weight:600;text-transform:uppercase;letter-spacing:.05em">${esc(g.g)}</div>
    <div class="quick" style="margin-top:6px">${items.map(x=>`<button data-addlib="${x.k}">+ ${esc(x.label)} <span class="fine">${x.kind==="flat"?"$"+x.val+"/hr":x.val+"×"}</span></button>`).join("")}</div></div>`;}).join("");
  return `<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:8px">
    ${groups||'<p class="fine" style="margin:0">You already have every pay type on the list.</p>'}
    <div style="margin-top:12px"><button class="btn small" data-act="addCustom">+ Create my own pay type</button></div>
    <p class="fine" style="margin:8px 0 0">After adding one, change its rate or name to match your stub.</p></div>`;}
function stateNote(s){
  const x=stateSetup(s);
  if(x.kind==="same") return "";
  if(x.kind==="recip") return `<p class="banner" style="margin:0"><span>${esc(x.work)} and ${esc(x.home)} have a reciprocity agreement. If you give your employer form <b>${esc(x.form)}</b>, only ${esc(x.home)} tax is withheld. ShiftWorkPay assumes you've filed it. Set the county/local rate below to match your stub, usually 0 in this case.</span></p>`;
  return `<p class="banner" style="margin:0"><span>${esc(x.work)} and ${esc(x.home)} have no reciprocity agreement, so your employer withholds ${esc(x.work)} tax. ${esc(x.home)} usually gives you a credit for it on your return.${x.gap>0?` Because ${esc(x.home)}'s rate is higher, you may owe up to the difference at tax time.`:` ${esc(x.home)}'s rate isn't higher, so you likely won't owe it more.`}</span></p>
  ${x.gap>0?`<div class="row"><label for="homeWithhold">Also withhold the ${esc(x.home)} difference?<small>Some employers do this if you ask. It avoids a bill at tax time.</small></label><select id="homeWithhold" data-s="homeWithhold" data-bool>${opt("false",String(!!s.homeWithhold),"No")}${opt("true",String(!!s.homeWithhold),"Yes")}</select></div>`:""}`;
}
function viewSetup(){
  const s=S.setup;
  const stNote=NO_TAX.has(s.state)?"No state income tax on wages.":FLAT.has(s.state)?"Flat-rate state.":"This state has brackets. The rate shown is a rough average, so type your own if you know it.";
  return `
  <section class="card form"><h2>Pay</h2>
    <div class="row"><label for="rate">Base hourly rate</label><input id="rate" data-s="rate" inputmode="decimal" value="${s.rate}"></div>
    <div class="row"><label for="freq">Paid every</label><select id="freq" data-s="freq">${opt(26,s.freq,"2 weeks")}${opt(52,s.freq,"Week")}</select></div>
    <div class="row"><label for="anchor">A period start date<small>Any past period's first day</small></label><input id="anchor" type="date" data-s="anchor" value="${s.anchor}"></div>
    <div class="row"><label for="payLag">Payday is how many days after a period ends?</label><input id="payLag" data-s="payLag" inputmode="numeric" value="${s.payLag}"></div>
  </section>
  <section class="card"><h2>Pay types</h2>${typeRows(s)}</section>
  <section class="card form"><h2>Federal W-4</h2>
    <div class="row"><label for="status">Step 1(c) filing status</label><select id="status" data-s="status">${opt("single",s.status,"Single / Married filing separately")}${opt("mfj",s.status,"Married filing jointly")}${opt("hoh",s.status,"Head of household")}</select></div>
    <div class="row"><label for="step2">Step 2(c) box checked?<small>Two jobs, or a spouse who works</small></label><select id="step2" data-s="step2" data-bool>${opt("false",String(s.step2),"No")}${opt("true",String(s.step2),"Yes")}</select></div>
    <div class="row"><label for="kids">Step 3 children under 17<small>$${FED.childCredit.toLocaleString()} each</small></label><input id="kids" data-s="kids" inputmode="numeric" value="${s.kids}"></div>
    <div class="row"><label for="others">Step 3 other dependents<small>$500 each</small></label><input id="others" data-s="others" inputmode="numeric" value="${s.others}"></div>
    <div class="row"><label for="step3amt">Or Step 3 total, in dollars<small>Use this if your pay stub shows a "dependent amount." It replaces the two lines above.</small></label><input id="step3amt" data-s="step3amt" inputmode="decimal" value="${s.step3amt??""}" placeholder="optional"></div>
    <div class="row"><label for="s4a">Step 4(a) other income per year</label><input id="s4a" data-s="s4a" inputmode="decimal" value="${s.s4a}"></div>
    <div class="row"><label for="s4b">Step 4(b) deductions per year<small>The ${TAX_YEAR} W-4 lets you count the new overtime deduction here.</small></label><input id="s4b" data-s="s4b" inputmode="decimal" value="${s.s4b}"></div>
    <div class="row"><label for="s4c">Step 4(c) extra per paycheck</label><input id="s4c" data-s="s4c" inputmode="decimal" value="${s.s4c}"></div>
    <div class="row"><label for="exempt">Claiming exempt?</label><select id="exempt" data-s="exempt" data-bool>${opt("false",String(s.exempt),"No")}${opt("true",String(s.exempt),"Yes")}</select></div>
  </section>
  <section class="card form"><h2>State & local</h2>
    <div class="row"><label for="state">State you work in<small>${stNote}</small></label><select id="state" data-s="state">${Object.keys(STATES).map(k=>opt(k,s.state)).join("")}</select></div>
    <div class="row"><label for="homeState">State you live in</label><select id="homeState" data-s="homeState">${opt("",s.homeState||"","Same as work state")}${Object.keys(STATES).map(k=>opt(k,s.homeState||"")).join("")}</select></div>
    ${stateNote(s)}
    <div class="row"><label for="stateOverride">Your own rate for ${esc(stateSetup(s).wState)}, %<small>Leave blank to use ${((STATES[stateSetup(s).wState]??0)*100).toFixed(2)}%</small></label><input id="stateOverride" data-s="stateOverride" inputmode="decimal" value="${s.stateOverride??""}" placeholder="optional"></div>
    <div class="row"><label for="county">County / city name</label><input id="county" data-s="county" value="${esc(s.county)}"></div>
    <div class="row"><label for="countyRate">County / local rate, %<small>Indiana: the county you lived in on Jan 1. If you live out of state, the county where you work. Lake County is 1.5%.</small></label><input id="countyRate" data-pct="countyRate" inputmode="decimal" value="${r2(s.countyRate*100*1000)/1000}"></div>
    ${stateSetup(s).wState==="Indiana"?`
    <div class="row"><label for="inPersonal">WH-4 lines 1–4 exemptions<small>You, spouse, dependents, 65+/blind · $1,000 each</small></label><input id="inPersonal" data-s="inPersonal" inputmode="numeric" value="${s.inPersonal}"></div>
    <div class="row"><label for="inAddl">WH-4 lines 5–6 extra dependents<small>$1,500 each</small></label><input id="inAddl" data-s="inAddl" inputmode="numeric" value="${s.inAddl}"></div>
    <div class="row"><label for="inAdopt">WH-4 line 7 adopted children<small>$3,000 each</small></label><input id="inAdopt" data-s="inAdopt" inputmode="numeric" value="${s.inAdopt}"></div>`:""}
    <div class="row"><label for="countyUsesExempt">Subtract exemptions before county tax?<small>Check your stub. Some Indiana payrolls take county tax on the full amount.</small></label><select id="countyUsesExempt" data-s="countyUsesExempt" data-bool>${opt("true",String(s.countyUsesExempt!==false),"Yes")}${opt("false",String(s.countyUsesExempt!==false),"No")}</select></div>
    <div class="row"><label for="stateExtra">Extra state withholding per check</label><input id="stateExtra" data-s="stateExtra" inputmode="decimal" value="${s.stateExtra}"></div>
    <div class="row"><label for="countyExtra">Extra county withholding per check</label><input id="countyExtra" data-s="countyExtra" inputmode="decimal" value="${s.countyExtra}"></div>
  </section>
  <section class="card form"><h2>Imputed income</h2>
    <div class="row"><label for="imputed">Per check, in dollars<small>Taxed but not paid to you, like employer group term life. Look for "Imputed earnings" on your stub.</small></label><input id="imputed" data-s="imputed" inputmode="decimal" value="${s.imputed||0}"></div>
  </section>
  <section class="card"><h2>Deductions per paycheck</h2>
    ${s.deds.map((d,i)=>`<div class="ded"><input aria-label="Deduction name" data-d="${i}:name" value="${esc(d.name)}" placeholder="Name"><input aria-label="Amount" data-d="${i}:amount" inputmode="decimal" value="${d.amount}"><select aria-label="Dollars or percent" data-d="${i}:type">${opt("$",d.type)}${opt("%",d.type)}</select><button class="x" data-del="${i}" aria-label="Remove ${esc(d.name)}">×</button></div>
      <div class="ded-flags"><label><input type="checkbox" data-d="${i}:preInc" ${d.preInc?"checked":""}>Pre-tax for income tax</label><label><input type="checkbox" data-d="${i}:preFica" ${d.preFica?"checked":""}>Pre-tax for SS/Medicare</label></div>`).join("")}
    <button class="btn small" data-act="addDed">+ Add deduction</button>
    <p class="fine">Health insurance is usually pre-tax for both. Check your pay stub. For a percent, pick % and type 1 for 1%.</p>
  </section>
  <p class="fine">Tax tables: ${TAX_YEAR}. Estimates only, not tax advice. Your pay stub is the final word.</p>`;
}

