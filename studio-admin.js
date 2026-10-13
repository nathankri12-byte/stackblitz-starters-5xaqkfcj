/* FITNESS AI PRO — Studio manager portal */
let studioAccessGranted = false;
let managedStudios = [];
let activeManagedStudioId = null;
let studioOffersCache = [];

function studioEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];
  });
}
function setStudioStatus(id, message, success) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("success", Boolean(success && message));
}
async function loadStudioPortal() {
  const select = document.getElementById("managedStudioSelect");
  if (!select || !supabaseClient || !currentUser) return;
  try {
    if (isCurrentUserAdmin()) {
      const result = await supabaseClient.from("fitness_studios").select("*").order("name");
      if (result.error) throw result.error;
      managedStudios = result.data || [];
    } else {
      const result = await supabaseClient.from("studio_admins").select("studio_id").eq("email", String(currentUser.email || "").trim().toLowerCase());
      if (result.error) throw result.error;
      const ids = (result.data || []).map(function(row) { return row.studio_id; });
      if (!ids.length) managedStudios = [];
      else {
        const studios = await supabaseClient.from("fitness_studios").select("*").in("id", ids).order("name");
        if (studios.error) throw studios.error;
        managedStudios = studios.data || [];
      }
    }
    if (!managedStudios.length) {
      select.innerHTML = '<option value="">Noch kein Studio zugeordnet</option>';
      activeManagedStudioId = null;
      document.getElementById("studioProfileForm").querySelectorAll("input,textarea,button").forEach(function(el) { el.disabled = true; });
      document.getElementById("studioOfferForm").querySelectorAll("input,textarea,button").forEach(function(el) { el.disabled = true; });
      document.getElementById("studioOffersList").innerHTML = '<p class="card-description">Es wurde noch kein Studio zugeordnet. Bitte wende dich an den FITNESS AI PRO Admin.</p>';
      setStudioStatus("studioProfileStatus", "");
      return;
    }
    document.getElementById("studioProfileForm").querySelectorAll("input,textarea,button").forEach(function(el) { el.disabled = false; });
    document.getElementById("studioOfferForm").querySelectorAll("input,textarea,button").forEach(function(el) { el.disabled = false; });
    select.innerHTML = managedStudios.map(function(studio) {
      return '<option value="' + studioEscape(studio.id) + '">' + studioEscape(studio.name || "Unbenanntes Studio") + (studio.is_published ? " · veröffentlicht" : " · noch nicht veröffentlicht") + '</option>';
    }).join("");
    const chosen = managedStudios.some(function(studio) { return studio.id === activeManagedStudioId; }) ? activeManagedStudioId : managedStudios[0].id;
    select.value = chosen;
    await selectManagedStudio(chosen);
  } catch (error) {
    console.error("Studio-Portal konnte nicht geladen werden:", error);
    setStudioStatus("studioProfileStatus", "Studio-Daten konnten nicht geladen werden. Prüfe die Datenbank-Berechtigungen.");
  }
}
async function selectManagedStudio(studioId) {
  activeManagedStudioId = studioId || null;
  const studio = managedStudios.find(function(item) { return item.id === activeManagedStudioId; });
  if (!studio) return;
  const values = {
    studioName: studio.name, studioCity: studio.city, studioAddress: studio.address,
    studioPhone: studio.phone, studioWebsite: studio.website, studioOpeningHours: studio.opening_hours,
    studioDescription: studio.description
  };
  Object.entries(values).forEach(function(entry) {
    const el = document.getElementById(entry[0]);
    if (el) el.value = entry[1] || "";
  });
  setStudioStatus("studioProfileStatus", studio.is_published ? "Dieses Studio ist veröffentlicht." : "Dieses Studio ist noch nicht veröffentlicht.");
  await loadStudioOffers();
}
async function saveStudioProfile(event) {
  event.preventDefault();
  if (!activeManagedStudioId || !supabaseClient) return;
  const button = document.getElementById("saveStudioProfileButton");
  button.disabled = true; button.textContent = "Wird gespeichert …";
  const payload = {
    name: document.getElementById("studioName").value.trim(),
    city: document.getElementById("studioCity").value.trim(),
    address: document.getElementById("studioAddress").value.trim(),
    phone: document.getElementById("studioPhone").value.trim(),
    website: document.getElementById("studioWebsite").value.trim(),
    opening_hours: document.getElementById("studioOpeningHours").value.trim(),
    description: document.getElementById("studioDescription").value.trim(),
    updated_at: new Date().toISOString()
  };
  try {
    if (!payload.name || !payload.city) throw new Error("Bitte gib mindestens Studio-Name und Stadt an.");
    if (payload.website && !/^https?:\/\//i.test(payload.website)) throw new Error("Die Website muss mit https:// oder http:// beginnen.");
    const result = await supabaseClient.from("fitness_studios").update(payload).eq("id", activeManagedStudioId);
    if (result.error) throw result.error;
    managedStudios = managedStudios.map(function(studio) { return studio.id === activeManagedStudioId ? Object.assign({}, studio, payload) : studio; });
    setStudioStatus("studioProfileStatus", "Studio-Informationen wurden gespeichert.", true);
    const select = document.getElementById("managedStudioSelect");
    if (select && select.selectedIndex >= 0) select.options[select.selectedIndex].text = payload.name + (managedStudios.find(function(s) { return s.id === activeManagedStudioId; }).is_published ? " · veröffentlicht" : " · noch nicht veröffentlicht");
  } catch (error) {
    console.error(error); setStudioStatus("studioProfileStatus", error.message || "Studio-Informationen konnten nicht gespeichert werden.");
  } finally { button.disabled = false; button.textContent = "Studio-Informationen speichern"; }
}
async function loadStudioOffers() {
  const target = document.getElementById("studioOffersList");
  if (!target || !activeManagedStudioId || !supabaseClient) return;
  target.innerHTML = '<p class="card-description">Angebote werden geladen …</p>';
  try {
    const result = await supabaseClient.from("studio_offers").select("*").eq("studio_id", activeManagedStudioId).order("created_at", {ascending:false});
    if (result.error) throw result.error;
    studioOffersCache = result.data || [];
    if (!studioOffersCache.length) {
      target.innerHTML = '<p class="card-description">Noch keine Angebote. Mit dem Formular oben kannst du das erste anlegen.</p>'; return;
    }
    target.innerHTML = studioOffersCache.map(function(offer) {
      const dates = [offer.valid_from ? "ab " + offer.valid_from : "", offer.valid_until ? "bis " + offer.valid_until : ""].filter(Boolean).join(" · ") || "ohne Zeitbegrenzung";
      return '<article class="admin-person-row"><div class="admin-person-main"><strong class="admin-person-name">' + studioEscape(offer.title) + '</strong><span class="admin-person-meta">' + studioEscape(offer.price_label || "Preis/Vorteil nicht angegeben") + ' · ' + studioEscape(dates) + '</span><span class="admin-person-meta">' + studioEscape(offer.description || "") + '</span><span class="admin-person-meta">' + (offer.is_active ? "Aktiv" : "Pausiert") + '</span></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="secondary-btn" type="button" onclick="toggleStudioOffer(\'' + studioEscape(offer.id) + '\',' + (!offer.is_active) + ')">' + (offer.is_active ? "Pausieren" : "Aktivieren") + '</button><button class="secondary-btn" type="button" onclick="deleteStudioOffer(\'' + studioEscape(offer.id) + '\')">Löschen</button></div></article>';
    }).join("");
  } catch (error) {
    console.error(error); target.innerHTML = '<p class="card-description">Angebote konnten nicht geladen werden. Prüfe die Datenbank-Berechtigungen.</p>';
  }
}
async function saveStudioOffer(event) {
  event.preventDefault();
  if (!activeManagedStudioId || !supabaseClient) return;
  const button = document.getElementById("saveStudioOfferButton");
  button.disabled = true; button.textContent = "Wird gespeichert …";
  const title = document.getElementById("studioOfferTitle").value.trim();
  const from = document.getElementById("studioOfferFrom").value || null;
  const until = document.getElementById("studioOfferUntil").value || null;
  if (!title) { setStudioStatus("studioOfferStatus", "Bitte gib einen Angebotstitel ein."); button.disabled = false; button.textContent = "Angebot speichern"; return; }
  if (from && until && until < from) { setStudioStatus("studioOfferStatus", "Das Enddatum darf nicht vor dem Startdatum liegen."); button.disabled = false; button.textContent = "Angebot speichern"; return; }
  try {
    const result = await supabaseClient.from("studio_offers").insert({
      studio_id: activeManagedStudioId, title: title,
      description: document.getElementById("studioOfferDescription").value.trim(),
      price_label: document.getElementById("studioOfferPrice").value.trim(),
      valid_from: from, valid_until: until, is_active: true,
      created_by_email: String(currentUser.email || "").trim().toLowerCase()
    });
    if (result.error) throw result.error;
    document.getElementById("studioOfferForm").reset();
    setStudioStatus("studioOfferStatus", "Angebot wurde gespeichert.", true);
    await loadStudioOffers();
  } catch (error) {
    console.error(error); setStudioStatus("studioOfferStatus", "Angebot konnte nicht gespeichert werden: " + (error.message || "Unbekannter Fehler"));
  } finally { button.disabled = false; button.textContent = "Angebot speichern"; }
}
async function toggleStudioOffer(offerId, nextActive) {
  if (!activeManagedStudioId || !supabaseClient) return;
  const result = await supabaseClient.from("studio_offers").update({is_active:Boolean(nextActive), updated_at:new Date().toISOString()}).eq("id",offerId).eq("studio_id",activeManagedStudioId);
  if (result.error) { setStudioStatus("studioOfferStatus", "Angebot konnte nicht aktualisiert werden: " + result.error.message); return; }
  setStudioStatus("studioOfferStatus", nextActive ? "Angebot aktiviert." : "Angebot pausiert.", true);
  await loadStudioOffers();
}
async function deleteStudioOffer(offerId) {
  if (!activeManagedStudioId || !supabaseClient) return;
  const offer = studioOffersCache.find(function(item) { return item.id === offerId; });
  if (!offer || !window.confirm("Angebot „" + offer.title + "“ wirklich löschen?")) return;
  const result = await supabaseClient.from("studio_offers").delete().eq("id",offerId).eq("studio_id",activeManagedStudioId);
  if (result.error) { setStudioStatus("studioOfferStatus", "Angebot konnte nicht gelöscht werden: " + result.error.message); return; }
  setStudioStatus("studioOfferStatus", "Angebot gelöscht.", true);
  await loadStudioOffers();
}
async function createStudioFromAdmin(event) {
  event.preventDefault();
  if (!isCurrentUserAdmin() || !supabaseClient) { setStudioStatus("createStudioStatus", "Nur Plattform-Admins dürfen Studios anlegen."); return; }
  const name = document.getElementById("newStudioName").value.trim();
  const city = document.getElementById("newStudioCity").value.trim();
  const managerEmail = document.getElementById("newStudioManagerEmail").value.trim().toLowerCase();
  if (!name || !city || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) { setStudioStatus("createStudioStatus", "Bitte Studio-Name, Stadt und gültige Admin-E-Mail eingeben."); return; }
  const button = document.getElementById("createStudioButton");
  button.disabled = true; button.textContent = "Studio wird angelegt …";
  try {
    const inserted = await supabaseClient.from("fitness_studios").insert({name:name,city:city,created_by_email:String(currentUser.email || "").trim().toLowerCase(),is_published:false}).select("*").single();
    if (inserted.error) throw inserted.error;
    const assigned = await supabaseClient.from("studio_admins").insert({studio_id:inserted.data.id,email:managerEmail,created_by_email:String(currentUser.email || "").trim().toLowerCase()});
    if (assigned.error) { setStudioStatus("createStudioStatus", "Studio wurde angelegt, aber die Admin-Zuordnung fehlgeschlagen: " + assigned.error.message + ". Bitte Zuordnung prüfen."); return; }
    document.getElementById("createStudioForm").reset();
    setStudioStatus("createStudioStatus", "Studio und Studio-Admin wurden angelegt. Das Admin-Konto kann sich anmelden und die Angaben selbst vervollständigen.", true);
    await loadAdminStudios(); await loadStudioPortal();
  } catch (error) {
    console.error(error); setStudioStatus("createStudioStatus", "Studio konnte nicht angelegt werden: " + (error.message || "Unbekannter Fehler"));
  } finally { button.disabled = false; button.textContent = "Studio + Admin anlegen"; }
}
async function loadAdminStudios() {
  const target = document.getElementById("adminStudioList");
  if (!target || !supabaseClient || !isCurrentUserAdmin()) return;
  try {
    const result = await supabaseClient.from("fitness_studios").select("id,name,city,is_published,created_at").order("created_at",{ascending:false});
    if (result.error) throw result.error;
    const studios = result.data || [];
    if (!studios.length) { target.innerHTML = '<p class="card-description">Noch keine Studios angelegt.</p>'; return; }
    const a = await supabaseClient.from("studio_admins").select("studio_id,email");
    if (a.error) throw a.error;
    target.innerHTML = studios.map(function(studio) {
      const emails = (a.data || []).filter(function(row) { return row.studio_id === studio.id; }).map(function(row) { return row.email; }).join(", ") || "Kein Studio-Admin zugeordnet";
      const publishButton = '<button class="secondary-btn" type="button" onclick="toggleStudioPublish(\'' + studioEscape(studio.id) + '\',' + (!studio.is_published) + ')">' + (studio.is_published ? "Veröffentlichung stoppen" : "Veröffentlichen") + '</button>';
      return '<article class="admin-person-row"><div class="admin-person-main"><strong class="admin-person-name">' + studioEscape(studio.name || "Unbenannt") + '</strong><span class="admin-person-meta">' + studioEscape(studio.city || "") + ' · ' + (studio.is_published ? "Veröffentlicht" : "Noch nicht veröffentlicht") + '</span><span class="admin-person-email">' + studioEscape(emails) + '</span></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="secondary-btn" type="button" onclick="openStudioFromAdmin(\'' + studioEscape(studio.id) + '\')">Im Studio-Center öffnen</button>' + publishButton + '</div></article>';
    }).join("");
  } catch (error) {
    console.error(error); target.innerHTML = '<p class="card-description">Studios konnten nicht geladen werden.</p>';
  }
}
async function toggleStudioPublish(studioId, published) {
  if (!isCurrentUserAdmin() || !supabaseClient) return;
  const result = await supabaseClient.from("fitness_studios").update({is_published:Boolean(published),updated_at:new Date().toISOString()}).eq("id",studioId);
  if (result.error) { setStudioStatus("createStudioStatus", "Veröffentlichung konnte nicht geändert werden: " + result.error.message); return; }
  setStudioStatus("createStudioStatus", published ? "Studio veröffentlicht." : "Veröffentlichung zurückgenommen.", true);
  await loadAdminStudios(); await loadStudioPortal();
}
async function openStudioFromAdmin(studioId) {
  activeManagedStudioId = studioId;
  await loadStudioPortal();
  const select = document.getElementById("managedStudioSelect");
  if (select) { select.value = studioId; await selectManagedStudio(studioId); }
  showTab("studioAdmin");
}
