/* FITNESS AI PRO — optionale Studio-Anbindung
   Lokales Trainingstracking funktioniert auch ohne Studio.
   Externe Studiendaten werden nur von einer echten HTTPS-API geladen.
*/
(() => {
  "use strict";
  const STORE = "fitStudioData_v1";
  const CONFIG = "fitStudioConnection_v1";
  const getStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{"workouts":[]}'); } catch { return {workouts:[]}; } };
  const saveStore = value => localStorage.setItem(STORE, JSON.stringify(value));
  const getConfig = () => { try { return JSON.parse(localStorage.getItem(CONFIG) || "{}"); } catch { return {}; } };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const apiBase = () => String(getConfig().apiBase || "").trim().replace(/\/+$/, "");
  const request = async (path, options={}) => {
    const base = apiBase();
    if (!base) throw new Error("Noch kein Studio verbunden.");
    const url = new URL(base + path);
    if (url.protocol !== "https:") throw new Error("Die Studio-Schnittstelle muss HTTPS verwenden.");
    const headers = {"Accept":"application/json", ...(options.headers || {})};
    const authClient = typeof supabaseClient !== "undefined" ? supabaseClient : window.supabaseClient;
    if (authClient?.auth) {
      const {data} = await authClient.auth.getSession();
      if (data?.session?.access_token) headers.Authorization = "Bearer " + data.session.access_token;
    }
    const response = await fetch(url, {...options, headers});
    if (!response.ok) throw new Error("Studio-Schnittstelle meldet HTTP " + response.status);
    return response.status === 204 ? null : response.json();
  };
  const setStatus = (message, ok=false) => {
    const el = document.getElementById("studioStatus");
    if (el) { el.textContent = message; el.style.color = ok ? "var(--green)" : "var(--muted)"; }
  };
  const page = () => document.getElementById("studio");
  function initPage() {
    if (page()) return;
    const main = document.querySelector("#app .main");
    if (!main) return;
    const section = document.createElement("section");
    section.id = "studio"; section.className = "page";
    section.innerHTML = `
      <div class="topbar"><div><h2>Fitnessstudio</h2><p>Deine Trainingsdaten – mit oder ohne Studioverbindung.</p></div><span class="user-pill" id="studioConnectionBadge">Nicht verbunden</span></div>
      <div class="grid grid-2" style="align-items:start">
        <div class="card">
          <div class="section-header"><h3>Studio verbinden</h3></div>
          <p style="color:var(--muted);line-height:1.6;margin-bottom:16px">Ohne Verbindung bleiben Trainingstracking und deine gespeicherten Einträge nutzbar. Für Buchungen, Live-Auslastung und Bodycheck braucht dein Studio eine echte API.</p>
          <form id="studioConnectForm">
            <div class="field"><label for="studioName">Name des Studios (optional)</label><input id="studioName" placeholder="z. B. mein Fitnessstudio" maxlength="100"></div>
            <div class="field"><label for="studioApiBase">HTTPS-Adresse der Studio-Schnittstelle</label><input id="studioApiBase" type="url" placeholder="https://api.dein-studio.de" required></div>
            <button class="primary-btn" type="submit">Verbindung prüfen und speichern</button>
            <button class="secondary-btn" id="studioDisconnect" type="button" style="width:100%;margin-top:9px">Verbindung trennen</button>
          </form><p id="studioStatus" role="status" style="font-size:13px;margin-top:13px"></p>
          <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:10px">Erwartete API-Routen: <code>/status</code>, <code>/courses</code>, <code>/bookings</code>, <code>/occupancy</code>, <code>/bodycheck</code>, <code>/profile</code> und <code>/news</code>. API-Schlüssel bitte nicht hier eingeben oder im Browser speichern.</p>
        </div>
        <div class="card">
          <div class="section-header"><h3>Trainingsplan</h3></div>
          <p style="color:var(--muted);line-height:1.6;margin-bottom:14px">Deinen FITNESS AI PRO Trainingsplan kannst du weiterhin unabhängig vom Studio öffnen.</p>
          <button class="secondary-btn" type="button" onclick="showTab('training')">Trainingsplan öffnen</button>
          <div style="height:1px;background:var(--border);margin:20px 0"></div>
          <div class="section-header"><h3>Studiofunktionen</h3></div>
          <div id="studioDataCards" style="display:grid;gap:10px"></div>
        </div>
      </div>
      <div class="grid grid-2" style="align-items:start;margin-top:16px">
        <div class="card">
          <div class="section-header"><h3>Training dokumentieren</h3></div>
          <form id="studioWorkoutForm">
            <div class="field"><label for="workoutDate">Datum</label><input id="workoutDate" type="date" required></div>
            <div class="field"><label for="workoutTitle">Training</label><input id="workoutTitle" maxlength="100" placeholder="z. B. Brust und Schultern" required></div>
            <div class="field"><label for="workoutMinutes">Dauer in Minuten</label><input id="workoutMinutes" type="number" min="1" max="600" required placeholder="45"></div>
            <div class="field"><label for="workoutNotes">Notizen (optional)</label><textarea id="workoutNotes" maxlength="1000" placeholder="Übungen, Gewichte oder persönliche Notizen"></textarea></div>
            <button class="primary-btn" type="submit">Training speichern</button>
          </form>
        </div>
        <div class="card">
          <div class="section-header"><h3>Trainingshistorie</h3><span id="workoutCount" style="color:var(--muted);font-size:12px"></span></div>
          <div id="studioWorkoutHistory"></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="section-header"><h3>Persönliche Daten</h3></div>
        <p style="color:var(--muted);line-height:1.6;margin-bottom:12px">Die bestehenden Profildaten verwaltest du im Profil. Eine Synchronisierung mit dem Studio erfolgt nur, wenn dessen Schnittstelle sie unterstützt.</p>
        <button class="secondary-btn" onclick="showTab('profile')" type="button">Profil öffnen</button>
      </div>`;
    main.appendChild(section);
    const more = document.getElementById("moreMenu");
    if (more && !document.getElementById("studioNavButton")) {
      const b=document.createElement("button"); b.id="studioNavButton"; b.dataset.tab="studio"; b.innerHTML='<span class="nav-icon">▦</span>Fitnessstudio'; b.onclick=()=>navigateMore("studio"); more.appendChild(b);
    }
    const mobile = document.getElementById("mobileMoreMenu");
    if (mobile && !document.getElementById("mobileStudioButton")) {
      const b=document.createElement("button"); b.id="mobileStudioButton"; b.dataset.tab="studio"; b.textContent="Fitnessstudio"; b.onclick=()=>navigateMore("studio"); mobile.appendChild(b);
    }
    document.getElementById("studioApiBase").value = getConfig().apiBase || "";
    document.getElementById("studioName").value = getConfig().name || "";
    document.getElementById("workoutDate").value = new Date().toISOString().slice(0,10);
    document.getElementById("studioConnectForm").addEventListener("submit", connect);
    document.getElementById("studioDisconnect").addEventListener("click", disconnect);
    document.getElementById("studioWorkoutForm").addEventListener("submit", saveWorkout);
    render();
  }
  async function connect(event) {
    event.preventDefault();
    const apiBaseValue=document.getElementById("studioApiBase").value.trim().replace(/\/+$/,"");
    const name=document.getElementById("studioName").value.trim();
    let parsed;
    try { parsed=new URL(apiBaseValue); } catch { setStatus("Bitte eine gültige HTTPS-Adresse eingeben."); return; }
    if (parsed.protocol!=="https:") { setStatus("Nur sichere HTTPS-Schnittstellen werden unterstützt."); return; }
    localStorage.setItem(CONFIG,JSON.stringify({apiBase:apiBaseValue,name}));
    setStatus("Adresse gespeichert. Schnittstelle wird geprüft …");
    try {
      const status=await request("/status");
      if (!status || status.connected === false) throw new Error("Die Schnittstelle bestätigt keine aktive Verbindung.");
      document.getElementById("studioConnectionBadge").textContent=name || "Studio verbunden";
      setStatus("Studio-Schnittstelle erreichbar. Verfügbare Daten werden geladen.",true);
      await loadStudioData();
    } catch(error) {
      document.getElementById("studioConnectionBadge").textContent="Nicht verbunden";
      setStatus("Verbindung nicht bestätigt: "+error.message+" Lokales Tracking bleibt verfügbar.");
      renderCards([]);
    }
  }
  async function loadStudioData() {
    const endpoints=[
      ["Kurse & Buchungen","/courses","courses","Für Kursbuchungen muss die Studio-API Buchungen unterstützen."],
      ["Live-Auslastung","/occupancy","occupancy","Keine Live-Daten von der Schnittstelle verfügbar."],
      ["Bodycheck","/bodycheck","bodycheck","Keine Bodycheck-Daten von der Schnittstelle verfügbar."],
      ["News & Angebote","/news","news","Keine aktuellen Studio-News verfügbar."]
    ];
    const results=await Promise.all(endpoints.map(async ([label,path,key,fallback])=>{
      try { return {label,key,data:await request(path),error:""}; }
      catch(error) { return {label,key,data:null,error:fallback}; }
    }));
    renderCards(results);
    try {
      const profile=await request("/profile");
      if (profile) setStatus("Studio verbunden. Studioprofil konnte abgerufen werden.",true);
    } catch { /* Profilsynchronisierung ist optional */ }
  }
  function renderCards(results=null) {
    const cfg=getConfig();
    const list=results || [
      {label:"Kurse & Buchungen",key:"courses",error:"Nur mit Studio-Schnittstelle verfügbar."},
      {label:"Live-Auslastung",key:"occupancy",error:"Nur mit Studio-Schnittstelle verfügbar."},
      {label:"Bodycheck",key:"bodycheck",error:"Nur mit Studio-Schnittstelle verfügbar."},
      {label:"News & Angebote",key:"news",error:"Nur mit Studio-Schnittstelle verfügbar."}
    ];
    const box=document.getElementById("studioDataCards"); if(!box)return;
    box.innerHTML=list.map(item=>{
      const data=item.data;
      let body="";
      if (item.error) body='<p style="color:var(--muted);font-size:13px;line-height:1.5">'+esc(item.error)+'</p>';
      else if (data==null) body='<p style="color:var(--muted);font-size:13px">Keine Daten vorhanden.</p>';
      else if (Array.isArray(data)) body=data.length?'<ul style="padding-left:18px;line-height:1.8">'+data.slice(0,10).map(x=>'<li>'+esc(typeof x==="string"?x:(x.name||x.title||x.date||JSON.stringify(x)))+'</li>').join("")+'</ul>':'<p style="color:var(--muted);font-size:13px">Aktuell keine Einträge.</p>';
      else body='<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 inherit;color:var(--muted)">'+esc(JSON.stringify(data,null,2))+'</pre>';
      return '<div style="padding:13px;border:1px solid var(--border);border-radius:12px"><strong style="display:block;margin-bottom:7px">'+esc(item.label)+'</strong>'+body+'</div>';
    }).join("");
    const badge=document.getElementById("studioConnectionBadge");
    if (badge && cfg.apiBase && !results) badge.textContent="Verbindung prüfen";
  }
  function saveWorkout(event) {
    event.preventDefault();
    const title=document.getElementById("workoutTitle").value.trim();
    const minutes=Number(document.getElementById("workoutMinutes").value);
    const date=document.getElementById("workoutDate").value;
    if(!title||!date||!Number.isFinite(minutes)||minutes<1||minutes>600){setStatus("Bitte Training, Datum und eine gültige Dauer angeben.");return;}
    const store=getStore();
    store.workouts.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,date,minutes,notes:document.getElementById("workoutNotes").value.trim(),createdAt:new Date().toISOString()});
    saveStore(store);
    document.getElementById("studioWorkoutForm").reset();
    document.getElementById("workoutDate").value=new Date().toISOString().slice(0,10);
    render(); setStatus("Training wurde auf diesem Gerät gespeichert.",true);
  }
  function render() {
    const store=getStore(), history=document.getElementById("studioWorkoutHistory");
    if(!history)return;
    const workouts=store.workouts||[];
    document.getElementById("workoutCount").textContent=workouts.length+" Einträge";
    history.innerHTML=workouts.length?workouts.slice(0,20).map(w=>'<div style="padding:12px 0;border-bottom:1px solid var(--border)"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>'+esc(w.title)+'</strong><span style="color:var(--muted);font-size:12px">'+esc(w.date)+' · '+esc(w.minutes)+' Min.</span></div>'+(w.notes?'<p style="color:var(--muted);font-size:13px;margin-top:6px">'+esc(w.notes)+'</p>':'')+'<button type="button" class="secondary-btn" data-delete-workout="'+esc(w.id)+'" style="padding:6px 9px;margin-top:8px;font-size:12px">Eintrag löschen</button></div>').join(""):'<p style="color:var(--muted);font-size:13px">Noch keine Trainings gespeichert.</p>';
    history.querySelectorAll("[data-delete-workout]").forEach(button=>button.addEventListener("click",()=>{
      const next=getStore(); next.workouts=next.workouts.filter(w=>w.id!==button.dataset.deleteWorkout); saveStore(next); render();
    }));
    if(!apiBase())renderCards([]);
  }
  function disconnect() {
    localStorage.removeItem(CONFIG);
    document.getElementById("studioApiBase").value="";
    document.getElementById("studioName").value="";
    document.getElementById("studioConnectionBadge").textContent="Nicht verbunden";
    renderCards([]);
    setStatus("Studioverbindung getrennt. Deine lokalen Trainingseinträge bleiben erhalten.",true);
  }
  document.addEventListener("DOMContentLoaded", () => {
    initPage();
    const oldShowTab=window.showTab;
    if (typeof oldShowTab==="function" && !oldShowTab.__studioWrapped) {
      const wrapped=function(tabName){ if(tabName==="studio") initPage(); return oldShowTab.apply(this,arguments); };
      wrapped.__studioWrapped=true; window.showTab=wrapped;
    }
    if (apiBase()) {
      const badge=document.getElementById("studioConnectionBadge");
      if(badge)badge.textContent="Verbindung prüfen";
      renderCards([]);
    }
  });
})();