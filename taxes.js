// taxes.js
// Paycheck math. Mirrors the formulas in my original spreadsheet, which I checked
// line by line against real Lake County pay stubs (Aug 24 and Sep 7, 2026 periods).
//
// All the tax NUMBERS live in data/tax-2026.json so the January update is just
// editing that file (and bumping VERSION in sw.js). Nothing in here should need
// to change for a new year unless the IRS changes the method itself.

let TAX_YEAR, FED, STATES = {}, FLAT = new Set(), NO_TAX = new Set(), RECIP = {}, RECIP_FORM = {};
const TAX_FILE = "tax-2026.json";

async function loadTaxData() {
  const res = await fetch(TAX_FILE);
  if (!res.ok) throw new Error("couldn't load " + TAX_FILE);
  const d = await res.json();
  TAX_YEAR = d.taxYear;
  FED = d.federal;
  STATES = d.states;
  FLAT = new Set(d.flatStates);
  NO_TAX = new Set(Object.keys(STATES).filter(s => STATES[s] === 0));
  RECIP = d.reciprocity;
  RECIP_FORM = d.reciprocityForms;
}

/* ===================== DATES ===================== */
function parseISO(s){const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d);}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addDays(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);}
function dayDiff(a,b){return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/864e5);}
function periodLen(s){return s.freq===52?7:14;}
function currentPeriodStart(s,d){const a=parseISO(s.anchor);const L=periodLen(s);const k=Math.floor(dayDiff(a,d)/L);return addDays(a,k*L);}
function firstPeriodInMonth(s,y,m){const first=new Date(y,m,1);let p=currentPeriodStart(s,first);if(p<first)p=addDays(p,periodLen(s));return p;}
function periodEndsUpTo(s,d){return Math.floor((dayDiff(parseISO(s.anchor),d)+1)/periodLen(s));}
const fmtD = d => d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
const money = n => (n<0?"-":"")+"$"+Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const hrs = n => (Math.round(n*100)/100).toLocaleString("en-US",{maximumFractionDigits:2});
const r2 = n => Math.round((n+Number.EPSILON)*100)/100;
const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/* ===================== CALC ENGINE (mirrors the spreadsheet) ===================== */
function typeRate(s,t){return t.kind==="flat"?(+t.val||0):(+s.rate||0)*(+t.val||0);}
function annualFedTax(x,s){
  const t=FED[s.status]; const half=s.step2?0.5:1;
  const std=t.std*half; let tax=0;
  for(let i=0;i<FED.rates.length;i++){
    const lo=std+t.br[i]*half, hi=i+1<FED.rates.length?std+t.br[i+1]*half:Infinity;
    if(x>lo) tax+=(Math.min(x,hi)-lo)*FED.rates[i];
  }
  return tax;
}
// Live/work in different states. Three cases:
//  same state  -> withhold that state
//  reciprocity -> withhold HOME state only (assumes they filed the form, e.g. WH-47)
//  no deal     -> withhold WORK state; home state may want the difference at tax time
// TODO: Illinois credit for Indiana COUNTY tax - not sure it counts, so the
// "you may owe" number says "up to". Ask someone who does IL returns.
function stateSetup(s){
  const work=s.state, home=s.homeState||s.state;
  const own=s.stateOverride!==""&&s.stateOverride!=null?(+s.stateOverride)/100:null;
  if(home===work) return {kind:"same",work,home,wState:work,rate:own??(STATES[work]??0),gap:0};
  if((RECIP[work]||[]).includes(home)) return {kind:"recip",work,home,wState:home,rate:own??(STATES[home]??0),gap:0,form:RECIP_FORM[work]};
  const rate=own??(STATES[work]??0);
  return {kind:"none",work,home,wState:work,rate,gap:Math.max(0,(STATES[home]??0)-rate)};
}
function stateRate(s){return stateSetup(s).rate;}
function isPremiumRate(t){return t.worked&&t.kind==="mult"&&+t.val>1;}
// One pay period. Returns everything the Check tab shows.
// Order matters here - it follows payroll: gross -> pre-tax deductions -> federal
// (annualize, IRS table, credits, divide back down) -> FICA -> state -> county.
// TODO: Social Security stops at the yearly wage cap - not tracked per check yet.
// TODO: other states use one flat rate. Real brackets for CA/NY/etc someday.
function calcPeriod(s,start){
  const L=periodLen(s), T=s.types;
  const days=[]; const tot={}; T.forEach(t=>tot[t.k]=0);
  for(let i=0;i<L;i++){const d=addDays(start,i);const h=S.hours[iso(d)]||{};
    let amt=0,worked=0;T.forEach(t=>{const v=+h[t.k]||0;tot[t.k]+=v;amt+=v*typeRate(s,t);if(t.worked)worked+=v;});
    days.push({d,h,amt,worked});}
  const earn=T.map(t=>({...t,hours:tot[t.k],rate:typeRate(s,t),amount:r2(tot[t.k]*typeRate(s,t))}));
  const gross=r2(earn.reduce((a,e)=>a+e.amount,0));
  const skipped=new Set(((S.skip||{})[iso(start)])||[]);
  const deds=s.deds.filter(d=>d.name).map(d=>({...d,off:skipped.has(d.name),amt:skipped.has(d.name)?0:r2(d.type==="%"?(+d.amount/100)*gross:+d.amount||0)}));
  const imputed=gross>0?(+s.imputed||0):0;
  const preInc=deds.filter(d=>d.preInc).reduce((a,d)=>a+d.amt,0);
  const preFica=deds.filter(d=>d.preFica).reduce((a,d)=>a+d.amt,0);
  const taxable=Math.max(0,gross+imputed-preInc);
  const P=s.freq;
  const annual=taxable*P, adj=Math.max(0,annual+(+s.s4a||0)-(+s.s4b||0));
  const yearTax=annualFedTax(adj,s);
  const credits=(s.step3amt!==""&&s.step3amt!=null)?(+s.step3amt||0):(+s.kids||0)*FED.childCredit+(+s.others||0)*FED.otherCredit;
  const afterCred=Math.max(0,yearTax-credits);
  const fed=s.exempt?0:r2(afterCred/P)+(+s.s4c||0);
  const ficaW=Math.max(0,gross+imputed-preFica);
  const ss=r2(ficaW*FED.ssRate), med=r2(ficaW*FED.medRate);
  const SS_=stateSetup(s);
  const exemptYr=SS_.wState==="Indiana"?(+s.inPersonal||0)*1000+(+s.inAddl||0)*1500+(+s.inAdopt||0)*3000:0;
  const exPer=r2(exemptYr/P);
  const stW=Math.max(0,taxable-exPer);
  const sr=stateRate(s);
  const st=r2(stW*sr)+(+s.stateExtra||0);
  const homeW=(SS_.kind==="none"&&s.homeWithhold&&SS_.gap>0)?r2(taxable*SS_.gap):0;
  const homeGap=(SS_.kind==="none"&&!s.homeWithhold&&SS_.gap>0)?r2(taxable*SS_.gap):0;
  // Lake County payroll takes county tax on full wages (no exemptions) - found this
  // comparing to my real stubs. Default is the textbook way, toggle in Setup.
  const coW=s.countyUsesExempt===false?taxable:stW;
  const co=r2(coW*(+s.countyRate||0))+(+s.countyExtra||0);
  const taxes=r2(fed+ss+med+st+co+homeW);
  const dedTot=r2(deds.reduce((a,d)=>a+d.amt,0));
  const net=r2(gross-taxes-dedTot);
  const worked=T.filter(t=>t.worked).reduce((a,t)=>a+tot[t.k],0);
  const paid=T.filter(t=>t.kind==="mult"&&+t.val>0).reduce((a,t)=>a+tot[t.k],0);
  const premHrs=T.filter(isPremiumRate).reduce((a,t)=>a+tot[t.k],0);
  return {SS_,homeW,homeGap,imputed,coW,days,earn,gross,deds,preInc,preFica,taxable,annual,adj,yearTax,credits,afterCred,fed,ficaW,ss,med,exPer,stW,sr,st,co,taxes,dedTot,net,worked,paid,premHrs,tot};
}

/* ===================== LEAVE BANKS ===================== */
// Balance = what the stub said on b.asOf + accrual for every period that ended
// since then + comp earned - hours used. Capped at max if they set one.
function bankBalance(s,b,upTo){
  const asOf=parseISO(b.asOf||iso(new Date()));
  if(upTo<asOf) return {bal:+b.start||0,accrued:0,used:0,earned:0};
  const periods=Math.max(0,periodEndsUpTo(s,upTo)-periodEndsUpTo(s,asOf));
  const accrued=periods*(+b.accrual||0);
  let used=0,earned=0;
  const useT=s.types.filter(t=>t.bank===b.id), earnT=s.types.filter(t=>t.earn===b.id);
  Object.keys(S.hours).forEach(k=>{const d=parseISO(k);if(d<=asOf||d>upTo)return;const h=S.hours[k];
    useT.forEach(t=>used+=+h[t.k]||0); earnT.forEach(t=>earned+=(+h[t.k]||0)*(+t.earnRate||1));});
  let bal=(+b.start||0)+accrued+earned-used;
  if(b.max!==""&&b.max!=null&&!isNaN(+b.max)&&+b.max>0) bal=Math.min(bal,+b.max);
  return {bal,accrued,used,earned};
}
function yearActivity(s,b,year){
  let used=0,earned=0;
  const useT=s.types.filter(t=>t.bank===b.id), earnT=s.types.filter(t=>t.earn===b.id);
  Object.keys(S.hours).forEach(k=>{if(!k.startsWith(String(year)))return;const h=S.hours[k];
    useT.forEach(t=>used+=+h[t.k]||0); earnT.forEach(t=>earned+=(+h[t.k]||0)*(+t.earnRate||1));});
  return {used,earned};
}

