// storage.js
// Everything saves to localStorage on the phone. No account, no server - on purpose.
// The key is still "shiftpay.v1" from before the rename. DON'T change it or
// everyone's saved hours disappear.

/* ===================== STORAGE ===================== */
let saveTimer=null, saving=false, pending=false;
function setSaveLabel(t){document.getElementById("saveState").textContent=t;}
function persist(){
  if(S.example) return;
  clearTimeout(saveTimer);
  setSaveLabel("Saving…");
  saveTimer=setTimeout(()=>{saveTimer=null;flush();},700);
}
async function flush(){
  if(saving){pending=true;return;}
  saving=true;
  try{ await store.save(JSON.parse(JSON.stringify(S))); setSaveLabel("Saved on this phone"); }
  catch(e){ setSaveLabel("Couldn't save. Your changes are still on screen."); }
  saving=false; if(pending){pending=false;flush();}
}
function saveNow(){if(!saveTimer||!S||S.example)return;clearTimeout(saveTimer);saveTimer=null;if(localSetOk(JSON.parse(JSON.stringify(S))))setSaveLabel("Saved on this phone");}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveNow();});
window.addEventListener("pagehide",saveNow);
function localGet(){try{const v=localStorage.getItem("shiftpay.v1");return v?JSON.parse(v):null;}catch(e){return null;}}
function localSetOk(v){try{localStorage.setItem("shiftpay.v1",JSON.stringify(v));return true;}catch(e){return false;}}
async function initStore(){
  store={kind:"local",save:async v=>{if(!localSetOk(v))throw new Error("storage");}};
  return localGet();
}

