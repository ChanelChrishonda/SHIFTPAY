// state.js
// Pay types, leave banks, and the app's saved data shape.

/* ===================== PAY TYPES (defaults — each person can rename, change, hide or add) =====================
   kind "mult" = base rate × val;  kind "flat" = val dollars per hour.
   worked = counts toward hours worked (overtime).  bank = leave bank these hours are taken from.
   earn = leave bank these hours are added to, at earnRate (comp time banked instead of paid). */
function defaultTypes(){
  return [
    {k:"reg", label:"Regular", short:"Reg", kind:"mult", val:1,   worked:true,  show:true},
    {k:"ot",  label:"Overtime", short:"OT", kind:"mult", val:1.5, worked:true,  show:true},
    {k:"dt",  label:"Double time", short:"DT", kind:"mult", val:2, worked:true, show:true},
    {k:"hw",  label:"Holiday worked", short:"Hol wk", kind:"mult", val:1.5, worked:true, show:true},
    {k:"hot", label:"Holiday OT", short:"Hol OT", kind:"mult", val:2, worked:true, show:true},
    {k:"prem",label:"Premium", short:"Prem", kind:"flat", val:1, worked:false, show:true},
    {k:"hp",  label:"Paid holiday", short:"Hol pd", kind:"mult", val:1, worked:false, show:true},
    {k:"vac", label:"Vacation used", short:"Vac", kind:"mult", val:1, worked:false, show:true, bank:"vac"},
    {k:"sick",label:"Sick used", short:"Sick", kind:"mult", val:1, worked:false, show:true, bank:"sick"},
    {k:"pers",label:"Personal used", short:"Pers", kind:"mult", val:1, worked:false, show:true, bank:"pers"},
    {k:"cu",  label:"Comp time used", short:"Comp", kind:"mult", val:1, worked:false, show:true, bank:"comp"},
    {k:"ce",  label:"OT banked as comp", short:"Comp+", kind:"mult", val:0, worked:true, show:true, earn:"comp", earnRate:1.5},
    {k:"lv",  label:"Sick/Comp/Vac (older entries)", short:"Leave", kind:"mult", val:1, worked:false, show:false},
  ];
}
function defaultBanks(asOf){
  return [
    {id:"vac", name:"Vacation", start:0, asOf, accrual:0, max:""},
    {id:"sick",name:"Sick", start:0, asOf, accrual:0, max:""},
    {id:"pers",name:"Personal", start:0, asOf, accrual:0, max:""},
    {id:"comp",name:"Comp time", start:0, asOf, accrual:0, max:""},
  ];
}
/* Pay type library: everything a person can add from Setup → Pay types → + Add pay type. */
const LIBRARY = [
  {g:"Hours worked", items:[
    {k:"reg", label:"Regular", short:"Reg", kind:"mult", val:1, worked:true},
    {k:"ot",  label:"Overtime", short:"OT", kind:"mult", val:1.5, worked:true},
    {k:"dt",  label:"Double time", short:"DT", kind:"mult", val:2, worked:true},
    {k:"tt",  label:"Triple time", short:"TT", kind:"mult", val:3, worked:true},
    {k:"hw",  label:"Holiday worked", short:"Hol wk", kind:"mult", val:1.5, worked:true},
    {k:"hot", label:"Holiday OT", short:"Hol OT", kind:"mult", val:2, worked:true},
    {k:"hold",label:"Holdover / mandatory OT", short:"Hold", kind:"mult", val:1.5, worked:true},
    {k:"cb",  label:"Call-back", short:"Call-bk", kind:"mult", val:1.5, worked:true},
    {k:"court",label:"Court time", short:"Court", kind:"mult", val:1.5, worked:true},
    {k:"train",label:"Training hours", short:"Train", kind:"mult", val:1, worked:true},
    {k:"meal",label:"Missed meal break", short:"Meal", kind:"mult", val:1.5, worked:true},
    {k:"ce",  label:"OT banked as comp", short:"Comp+", kind:"mult", val:0, worked:true, earn:"comp", earnRate:1.5},
  ]},
  {g:"Extra pay per hour (differentials)", items:[
    {k:"prem",label:"Premium", short:"Prem", kind:"flat", val:1, worked:false},
    {k:"sde", label:"Evening shift differential", short:"Eve", kind:"flat", val:1, worked:false},
    {k:"sdn", label:"Night shift differential", short:"Night", kind:"flat", val:1.5, worked:false},
    {k:"wkd", label:"Weekend differential", short:"Wknd", kind:"flat", val:1, worked:false},
    {k:"cto", label:"Training officer (CTO/FTO) pay", short:"CTO", kind:"flat", val:1, worked:false},
    {k:"acting",label:"Acting supervisor / lead pay", short:"Acting", kind:"flat", val:2, worked:false},
    {k:"bil", label:"Bilingual pay", short:"Biling", kind:"flat", val:1, worked:false},
    {k:"oncall",label:"On-call / standby", short:"On-call", kind:"flat", val:2, worked:false},
  ]},
  {g:"Paid time off", items:[
    {k:"hp",  label:"Paid holiday", short:"Hol pd", kind:"mult", val:1, worked:false},
    {k:"fh",  label:"Floating holiday", short:"Float", kind:"mult", val:1, worked:false},
    {k:"bday",label:"Birthday holiday", short:"B-day", kind:"mult", val:1, worked:false},
    {k:"vac", label:"Vacation used", short:"Vac", kind:"mult", val:1, worked:false, bank:"vac"},
    {k:"sick",label:"Sick used", short:"Sick", kind:"mult", val:1, worked:false, bank:"sick"},
    {k:"pers",label:"Personal used", short:"Pers", kind:"mult", val:1, worked:false, bank:"pers"},
    {k:"cu",  label:"Comp time used", short:"Comp", kind:"mult", val:1, worked:false, bank:"comp"},
    {k:"ber", label:"Bereavement", short:"Bereav", kind:"mult", val:1, worked:false},
    {k:"jury",label:"Jury duty", short:"Jury", kind:"mult", val:1, worked:false},
    {k:"mil", label:"Military leave", short:"Mil", kind:"mult", val:1, worked:false},
    {k:"adm", label:"Administrative leave", short:"Admin", kind:"mult", val:1, worked:false},
    {k:"lv",  label:"Sick/Comp/Vac (older entries)", short:"Leave", kind:"mult", val:1, worked:false},
  ]},
  {g:"Unpaid", items:[
    {k:"nopay",label:"Unpaid time off", short:"No pay", kind:"mult", val:0, worked:false},
  ]},
];
let pickerOpen=false, pendingDel=null;

/* ===================== STATE ===================== */
const EXAMPLE = () => {
  const s = defaultSetup();
  s.example = true;
  const start = currentPeriodStart(s, new Date());
  s.banks=defaultBanks(iso(addDays(start,-1)));
  s.banks[0].start=40; s.banks[0].accrual=4.62; s.banks[1].start=24; s.banks[1].accrual=3.69; s.banks[2].start=8; s.banks[3].start=6;
  const hours = {};
  const pat = [{reg:8,ot:4},{reg:8,ot:4},{},{ot:12},{reg:8},{reg:8,ce:4},{},{reg:8},{reg:8,ot:4},{vac:8},{},{ot:12},{reg:8,ot:4},{reg:8}];
  pat.forEach((h,i)=>{ if(Object.keys(h).length) hours[iso(addDays(start,i))]=h; });
  return {v:2, setup:s, hours, example:true};
};
function defaultSetup(){
  return {
    rate:25.00, types:defaultTypes(), banks:defaultBanks(iso(new Date())),
    freq:26, anchor:"2026-07-27", payLag:15,
    status:"single", step2:false, kids:0, others:0, s4a:0, s4b:0, s4c:0, exempt:false,
    state:"Indiana", stateOverride:"", county:"Lake County", countyRate:0.015,
    inPersonal:1, inAddl:0, inAdopt:0, stateExtra:0, countyExtra:0,
    step3amt:"", countyUsesExempt:true, imputed:0, homeState:"", homeWithhold:false,
    deds:[{name:"Medical",amount:79,type:"$",preInc:true,preFica:true},{name:"Union dues",amount:69,type:"$",preInc:false,preFica:false}]
  };
}
/* Bring older saved data (v1) up to date without losing anything */
// Older saved data (v1 = first GitHub version) had setup.mult and setup.prem
// instead of the pay type list. Convert it so nobody loses their hours.
function normalize(st){
  const d=defaultSetup(); const s={...d,...st.setup};
  if(!Array.isArray(s.types)){
    const m=st.setup.mult||{}; const t=defaultTypes();
    t.forEach(x=>{ if(x.kind==="mult"&&m[x.k]!=null) x.val=+m[x.k]; if(x.k==="prem"&&st.setup.prem!=null) x.val=+st.setup.prem; });
    s.types=t;
  }
  if(!Array.isArray(s.banks)) s.banks=defaultBanks(iso(new Date()));
  delete s.mult; delete s.prem;
  const usesLv=Object.values(st.hours||{}).some(h=>+h.lv);
  s.types.forEach(t=>{ if(t.k==="lv"&&usesLv) t.show=true; });
  return {v:2, setup:s, hours:st.hours||{}, skip:st.skip||{}};
}
let S = null;
let tab = "check";
let periodStart = null;
let openDay = null;
let jumpYear = null;
let openBanks = {};
let store = {kind:"none", save:null};

