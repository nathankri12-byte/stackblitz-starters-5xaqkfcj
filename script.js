"use strict";
console.log(" script.js wurde geladen");
/* =========================================================
   FITNESS AI PRO
   ========================================================= */

/* =========================
   CONFIG
========================= */

const SUPABASE_URL =
  "https://qnouktkkbrwcdzgaqthi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_sdHv-8wTkJ5s9WQQp88A8Q_ZyNKHm5t";

/*
  Gemini wird NICHT direkt aus dem Browser aufgerufen.

  Die KI läuft weiterhin über deine Supabase Edge Function:
  smooth-handler
*/

const GEMINI_FUNCTION = "smooth-handler";

const ADMIN_EMAIL = "nathankri12@gmail.com";

/* =========================
   GLOBAL STATE
========================= */

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;
let selectedRating = 0;


/* =========================================================
   SUPABASE
========================================================= */

function initSupabase() {
  if (!window.supabase) {
    console.error("Supabase CDN wurde nicht geladen.");
    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    console.log(" Supabase verbunden.");
    return true;

  } catch (error) {
    console.error(
      " Supabase konnte nicht initialisiert werden:",
      error
    );

    return false;
  }
}


/* =========================================================
   AUTH MODE
========================================================= */

function showAuthMode(mode) {
  const loginForm =
    document.getElementById("loginForm");

  const registerForm =
    document.getElementById("registerForm");

  const loginTab =
    document.getElementById("loginTab");

  const registerTab =
    document.getElementById("registerTab");

  if (!loginForm || !registerForm) {
    return;
  }

  if (mode === "login") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    loginTab?.classList.add("active");
    registerTab?.classList.remove("active");

  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");

    loginTab?.classList.remove("active");
    registerTab?.classList.add("active");
  }

  setAuthMessage("");
}


/* =========================================================
   AUTH MESSAGE
========================================================= */

function setInlineStatus(id, message, success = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message || "";
  element.style.color = success ? "var(--green)" : "var(--red)";
}

function setAuthMessage(
  message,
  success = false
) {
  const element =
    document.getElementById("authMessage");

  if (!element) return;

  element.textContent = message || "";

  element.style.color =
    success
      ? "#35d07f"
      : "#8d9aaa";
}


/* =========================================================
   REGISTER
========================================================= */

async function registerUser() {
  if (!supabaseClient) {
    setAuthMessage(
      "Supabase ist noch nicht verbunden."
    );
    return;
  }

  const name =
    document
      .getElementById("registerName")
      ?.value
      .trim();

  const email =
    document
      .getElementById("registerEmail")
      ?.value
      .trim();

  const password =
    document
      .getElementById("registerPassword")
      ?.value;

  if (!name || !email || !password) {
    setAuthMessage(
      "Bitte fülle alle Felder aus."
    );
    return;
  }

  if (password.length < 6) {
    setAuthMessage(
      "Das Passwort muss mindestens 6 Zeichen haben."
    );
    return;
  }

  setAuthMessage(
    "Konto wird erstellt..."
  );

  try {
    const redirectUrl =
      window.location.origin +
      window.location.pathname;

    const {
      data,
      error
    } =
      await supabaseClient.auth.signUp({
        email,
        password,

        options: {
          emailRedirectTo: redirectUrl,

          data: {
            name
          }
        }
      });

    if (error) {
      console.error(error);
      setAuthMessage(error.message);
      return;
    }

    if (data?.session?.user) {
      currentUser =
        data.session.user;

      await createProfile(
        currentUser.id,
        name,
        email
      );

      await loadApp();
      return;
    }

    setAuthMessage(
      "Fast geschafft!  Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich anmelden.",
      true
    );

  } catch (error) {
    console.error(error);

    setAuthMessage(
      "Bei der Registrierung ist ein Fehler aufgetreten."
    );
  }
}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser() {
  if (!supabaseClient) {
    setAuthMessage(
      "Supabase ist noch nicht verbunden."
    );
    return;
  }

  const email =
    document
      .getElementById("loginEmail")
      ?.value
      .trim();

  const password =
    document
      .getElementById("loginPassword")
      ?.value;

  if (!email || !password) {
    setAuthMessage(
      "Bitte E-Mail und Passwort eingeben."
    );
    return;
  }

  setAuthMessage(
    "Anmeldung läuft..."
  );

  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      console.error(error);
      setAuthMessage(error.message);
      return;
    }

    currentUser =
      data.user;

    // loadApp erstellt/prüft das Profil zentral; kein doppelter Aufruf hier.
    await loadApp();

  } catch (error) {
    console.error(error);

    setAuthMessage(
      "Anmeldung fehlgeschlagen."
    );
  }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (error) {
    console.error(error);
  }

  currentUser = null;
  currentProfile = null;

  document
    .getElementById("app")
    ?.classList.add("hidden");

  document
    .getElementById("authScreen")
    ?.classList.remove("hidden");

  showAuthMode("login");
}


/* =========================================================
   PROFILE
========================================================= */

/*
  WICHTIG:

  profiles.id       = bigint
  profiles.user_id  = uuid

  Die Supabase-Auth-ID gehört deshalb IMMER in user_id.
*/

async function createProfile(
  userId,
  name,
  email
) {
  if (!supabaseClient || !userId) return;

  const profileData = {
    user_id: userId,
    Name: name || "User",
    email: email || ""
  };

  try {
    /*
      user_id besitzt in Supabase einen UNIQUE-Index.
      upsert + ignoreDuplicates verhindert doppelte Profile,
      auch wenn Registrierung und App-Start gleichzeitig laufen.
    */
    const { error } = await supabaseClient
      .from("profiles")
      .upsert(profileData, {
        onConflict: "user_id",
        ignoreDuplicates: true
      });

    if (error) {
      console.error("Profil konnte nicht erstellt werden:", error);
    }
  } catch (error) {
    console.error("Profil konnte nicht erstellt werden:", error);
  }
}


async function createProfileIfMissing() {
  if (!currentUser || !supabaseClient) return;

  await createProfile(
    currentUser.id,
    currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "User",
    currentUser.email || ""
  );
}


async function loadProfile() {
  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "Profil konnte nicht geladen werden:",
        error
      );
      return;
    }

    /*
      DB-Spalten werden hier bewusst auf
      die bisherigen JS-Namen normalisiert.

      Dadurch muss die funktionierende KI
      nicht geändert werden.
    */

    if (data) {
      currentProfile = {
        id: data.id,
        user_id: data.user_id,

        name:
          data.Name || "",

        email:
          data.email ||
          currentUser.email ||
          "",

        age:
          data.Age ?? null,

        weight:
          data.Weight ?? null,

        height:
          data.Height ?? null,

        goal:
          data.Goal || "",

        diet:
          data.Diet || "",

        training_location:
          data.training_location || ""
      };
    } else {
      currentProfile = {};
    }

    fillProfileUI();

  } catch (error) {
    console.error(error);
  }
}


function fillProfileUI() {
  if (!currentProfile) {
    return;
  }

  const name =
    currentProfile.name ||
    currentUser
      ?.user_metadata
      ?.name ||
    "User";

  const email =
    currentProfile.email ||
    currentUser?.email ||
    "";

  const setText = (
    id,
    value
  ) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value ?? "";
    }
  };

  const setValue = (
    id,
    value
  ) => {
    const element =
      document.getElementById(id);

    if (element) {
      element.value =
        value ?? "";
    }
  };

  setText(
    "profileName",
    name
  );

  setText(
    "profileEmail",
    email
  );

  setValue(
    "profileNameInput",
    name
  );

  setValue(
    "profileAge",
    currentProfile.age
  );

  setValue(
    "profileHeight",
    currentProfile.height
  );

  setValue(
    "profileDiet",
    currentProfile.diet
  );

  setValue(
    "trainingLocation",
    currentProfile.training_location
  );

  setValue(
    "goal",
    currentProfile.goal
  );

  updateAIUserInfo();
}


async function saveProfile() {
  setInlineStatus("profileStatus", "");
  if (!currentUser || !supabaseClient) {
    setInlineStatus("profileStatus", "Bitte melde dich zuerst an.");
    return;
  }

  const name =
    document
      .getElementById(
        "profileNameInput"
      )
      ?.value
      .trim() ||
    currentProfile?.name ||
    "User";

  const age =
    document
      .getElementById(
        "profileAge"
      )
      ?.value;

  const height =
    document
      .getElementById(
        "profileHeight"
      )
      ?.value;

  const diet =
    document
      .getElementById(
        "profileDiet"
      )
      ?.value || "";

  const trainingLocation =
    document
      .getElementById(
        "trainingLocation"
      )
      ?.value || "";

  const goal =
    document
      .getElementById(
        "goal"
      )
      ?.value || "";

  // Eingaben vor dem Schreiben in die Datenbank validieren.
  if (name.length > 80) {
    setInlineStatus("profileStatus", "Der Name darf höchstens 80 Zeichen lang sein.");
    return;
  }

  const ageNumber = age === "" || age == null ? null : Number(age);
  if (ageNumber !== null && (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120)) {
    setInlineStatus("profileStatus", "Bitte gib ein gültiges Alter zwischen 1 und 120 Jahren ein.");
    return;
  }

  const heightNumber = height === "" || height == null ? null : Number(height);
  if (heightNumber !== null && (!Number.isFinite(heightNumber) || heightNumber < 50 || heightNumber > 250)) {
    setInlineStatus("profileStatus", "Bitte gib eine Körpergröße zwischen 50 und 250 cm ein.");
    return;
  }

  /*
    EXAKT die Namen deiner Supabase-Spalten.
  */

  const profileData = {
    user_id:
      currentUser.id,

    Name:
      name,

    Age: ageNumber,

    Height: heightNumber,

    Diet:
      diet,

    training_location:
      trainingLocation,

    Goal:
      goal,

    email:
      currentUser.email || ""
  };

  try {

    /*
      Ein einziger Datensatz pro user_id:
      upsert aktualisiert das bestehende Profil oder legt es an,
      ohne einen zweiten Datensatz zu erzeugen.
    */
    const { error } = await supabaseClient
      .from("profiles")
      .upsert(profileData, { onConflict: "user_id" });

    if (error) {
      console.error("Profil konnte nicht gespeichert werden:", error);
      alert("Profil konnte nicht gespeichert werden:\n\n" + error.message);
      return;
    }

    await loadProfile();

    updateDashboard();
    renderExercises();
    setInlineStatus("profileStatus", "Profil erfolgreich gespeichert.", true);

    console.log(
      " Profil gespeichert."
    );

  } catch (error) {

    console.error(
      "Profil konnte nicht gespeichert werden:",
      error
    );

    setInlineStatus("profileStatus", "Beim Speichern des Profils ist ein Fehler aufgetreten.");
  }
}


/* =========================================================
   MANUAL DAILY CHECK-IN
   These are user-entered values, never automatic device data.
========================================================= */

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

async function loadDailyCheckin() {
  const status = document.getElementById("dailyCheckinStatus");
  if (!currentUser || !supabaseClient) {
    if (status) status.textContent = "Bitte melde dich an, um deine Tageswerte zu laden.";
    return;
  }

  if (status) status.textContent = "Deine Einträge werden geladen …";

  try {
    const { data, error } = await supabaseClient
      .from("daily_checkins")
      .select("sleep_hours, water_glasses, steps, checkin_date")
      .eq("user_id", currentUser.id)
      .eq("checkin_date", getLocalDateString())
      .maybeSingle();

    if (error) throw error;

    const sleep = document.getElementById("dailySleepHours");
    const water = document.getElementById("dailyWaterGlasses");
    const steps = document.getElementById("dailySteps");

    if (sleep) sleep.value = data?.sleep_hours ?? "";
    if (water) water.value = data?.water_glasses ?? "";
    if (steps) steps.value = data?.steps ?? "";

    if (status) {
      status.textContent = data
        ? "Deine selbst eingetragenen Werte für heute sind geladen."
        : "Für heute sind noch keine Werte gespeichert.";
      status.style.color = "var(--muted)";
    }
  } catch (error) {
    console.error("Tages-Check-in konnte nicht geladen werden:", error);
    if (status) {
      status.textContent = "Tageswerte konnten nicht geladen werden. Bitte prüfe die Verbindung und versuche es erneut.";
      status.style.color = "var(--red)";
    }
  }
}

async function saveDailyCheckin() {
  const status = document.getElementById("dailyCheckinStatus");
  if (!currentUser || !supabaseClient) {
    if (status) status.textContent = "Bitte melde dich zuerst an.";
    return;
  }

  const readValue = (id, label, min, max, integerOnly = false) => {
    const input = document.getElementById(id);
    const raw = input?.value?.trim() ?? "";
    if (raw === "") return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max || (integerOnly && !Number.isInteger(value))) {
      throw new Error(label + ": Bitte gib einen gültigen Wert zwischen " + min + " und " + max + (integerOnly ? " als ganze Zahl" : "") + " ein.");
    }
    return value;
  };

  let sleepHours, waterGlasses, steps;
  try {
    sleepHours = readValue("dailySleepHours", "Schlaf", 0, 24);
    waterGlasses = readValue("dailyWaterGlasses", "Wasser", 0, 30, true);
    steps = readValue("dailySteps", "Schritte", 0, 200000, true);
  } catch (error) {
    if (status) {
      status.textContent = error.message;
      status.style.color = "var(--red)";
    }
    return;
  }

  if (sleepHours === null && waterGlasses === null && steps === null) {
    if (status) {
      status.textContent = "Trage mindestens einen Wert ein, bevor du speicherst.";
      status.style.color = "var(--red)";
    }
    return;
  }

  const button = document.querySelector('button[onclick="saveDailyCheckin()"]');
  if (button) {
    button.disabled = true;
    button.textContent = "Speichert …";
  }
  if (status) {
    status.textContent = "Deine Werte werden gespeichert …";
    status.style.color = "var(--muted)";
  }

  try {
    const { error } = await supabaseClient
      .from("daily_checkins")
      .upsert({
        user_id: currentUser.id,
        checkin_date: getLocalDateString(),
        sleep_hours: sleepHours,
        water_glasses: waterGlasses,
        steps
      }, { onConflict: "user_id,checkin_date" });

    if (error) throw error;

    if (status) {
      status.textContent = "Tageswerte erfolgreich gespeichert. Du kannst sie jederzeit ändern.";
      status.style.color = "var(--green)";
    }
  } catch (error) {
    console.error("Tages-Check-in konnte nicht gespeichert werden:", error);
    if (status) {
      status.textContent = "Speichern fehlgeschlagen. Bitte versuche es erneut.";
      status.style.color = "var(--red)";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Tageswerte speichern";
    }
  }
}

/* =========================================================
   APP
========================================================= */

async function loadApp() {
  document
    .getElementById("authScreen")
    ?.classList.add("hidden");

  document
    .getElementById("app")
    ?.classList.remove("hidden");

  if (
    !currentUser &&
    supabaseClient
  ) {
    const {
      data
    } =
      await supabaseClient.auth.getUser();

    currentUser =
      data?.user || null;
  }

  if (!currentUser) {
    return;
  }

  await createProfileIfMissing();
  await loadProfile();
  await ensureCommunityProfile();
  await loadDailyCheckin();
  await loadWeights();
  await loadTrainingProgress();
  await loadFeedback();
  await checkAdmin();

  /*
    Bereits gespeicherte Pläne laden.
  */

  loadSavedPlans();

  updateDashboard();
  renderExercises();
}


/* =========================================================
   NAVIGATION
========================================================= */

function showTab(tabName) {
  // Admin-Bereich auch bei direktem Aufruf nur für das festgelegte Konto öffnen.
  if (tabName === "admin" && !isCurrentUserAdmin()) {
    console.warn("Zugriff auf den Admin-Bereich verweigert.");
    tabName = "dashboard";
  }

  document
    .querySelectorAll(".page")
    .forEach(page => {
      page.classList.remove(
        "active"
      );
    });

  const selectedPage =
    document.getElementById(
      tabName
    );

  if (selectedPage) {
    selectedPage.classList.add(
      "active"
    );
  }

  document
    .querySelectorAll(
      "[data-tab]"
    )
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.tab ===
          tabName
      );
    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (tabName === "dashboard") {
    loadDailyCheckin();
  }
  if (tabName === "friends") {
    loadCommunity();
  }

  if (
    tabName ===
    "feedback"
  ) {
    loadFeedback();
  }

  if (
    tabName ===
    "admin"
  ) {
    loadAllFeedback();
  }

  if (
    tabName ===
    "progress"
  ) {
    loadWeights();
    loadTrainingProgress();
  }

  /*
    Wenn der Benutzer Training oder
    Ernährung öffnet, gespeicherte Pläne
    sicherheitshalber erneut laden.
  */

  if (
    tabName ===
    "training"
  ) {
    loadSavedTrainingPlan();
  }

  if (
    tabName ===
    "nutrition"
  ) {
    loadSavedMealPlan();
  }
}


/* =========================================================
   DASHBOARD
========================================================= */

function updateDashboard() {
  const name =
    currentProfile?.name ||
    currentUser
      ?.user_metadata
      ?.name ||
    "User";

  const greeting =
    document.getElementById(
      "dashboardGreeting"
    );

  if (greeting) {
    greeting.textContent =
      `Willkommen zurück, ${name}.`;
  }

  const email =
    document.getElementById(
      "userEmailDisplay"
    );

  if (email) {
    email.textContent =
      currentUser?.email ||
      "";
  }

  const location =
    document.getElementById(
      "dashboardTrainingLocation"
    );

  if (location) {
    location.textContent =
      currentProfile
        ?.training_location ||
      "—";
  }

  const goal =
    document.getElementById(
      "dashboardGoal"
    );

  if (goal) {
    goal.textContent =
      currentProfile?.goal ||
      "—";
  }

  const weight =
    document.getElementById(
      "dashboardWeight"
    );

  if (weight) {
    weight.textContent =
      currentProfile?.weight
        ? `${currentProfile.weight} kg`
        : "—";
  }

  updateAIUserInfo();
  updateDashboardWorkout();
}

function updateDashboardWorkout() {
  const element = document.getElementById("dashboardWorkout");
  if (!element) return;

  const plan = (localStorage.getItem("fitness_ai_training_plan") || "").trim();
  if (!plan) {
    element.textContent = "Noch kein Trainingsplan erstellt.";
    return;
  }

  const weekdayNames = ["SONNTAG", "MONTAG", "DIENSTAG", "MITTWOCH", "DONNERSTAG", "FREITAG", "SAMSTAG"];
  const todayName = weekdayNames[new Date().getDay()];
  const lines = plan.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const headingRegex = /^\s*(?:#{1,6}\s*)?(?:\*{1,2})?(MONTAG|DIENSTAG|MITTWOCH|DONNERSTAG|FREITAG|SAMSTAG|SONNTAG)(?:\*{1,2})?\s*(?:\||[-–—:]|\s+)?\s*(.*?)\s*$/i;
  const startIndex = lines.findIndex(line => {
    const match = line.match(headingRegex);
    return match && match[1].toUpperCase() === todayName;
  });

  if (startIndex === -1) {
    element.innerHTML = '<p>Trainingsplan vorhanden.</p><button class="secondary-btn" type="button" onclick="showTab(\'training\')">Trainingsplan öffnen</button>';
    return;
  }

  const heading = lines[startIndex].match(headingRegex);
  const focus = (heading?.[2] || "").replace(/^\s*[|:–—-]\s*/, "").trim();
  const workoutLines = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (headingRegex.test(lines[i])) break;
    if (/^ÜBUNG\s*:/i.test(lines[i])) workoutLines.push(lines[i].replace(/^ÜBUNG\s*:\s*/i, ""));
    else if (/^(?:RUHETAG|REST DAY|ERHOLUNG)\b/i.test(lines[i])) {
      workoutLines.length = 0;
      workoutLines.push("Heute ist ein Ruhetag – Zeit zur Erholung.");
      break;
    }
  }

  const safe = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  element.innerHTML = '<p><strong>' + safe(focus || todayName) + '</strong></p>' +
    (workoutLines.length ? '<ul>' + workoutLines.map(line => '<li>' + safe(line) + '</li>').join("") + '</ul>' : '<p>Dein Plan ist gespeichert. Öffne Training für alle Details.</p>') +
    '<button class="secondary-btn" type="button" onclick="showTab(\'training\')">Trainingsplan öffnen</button>';
}


/* =========================================================
   AI PROFILE INFO
========================================================= */

function updateAIUserInfo() {
  const element =
    document.getElementById(
      "aiUserInfo"
    );

  if (!element) {
    return;
  }

  if (!currentProfile) {
    element.textContent =
      "Noch keine Profildaten geladen.";
    return;
  }

  const parts = [];

  if (currentProfile.age) {
    parts.push(
      `Alter: ${currentProfile.age}`
    );
  }

  if (currentProfile.height) {
    parts.push(
      `Größe: ${currentProfile.height} cm`
    );
  }

  if (currentProfile.weight) {
    parts.push(
      `Gewicht: ${currentProfile.weight} kg`
    );
  }

  if (currentProfile.goal) {
    parts.push(
      `Ziel: ${currentProfile.goal}`
    );
  }

  if (
    currentProfile.training_location
  ) {
    parts.push(
      `Training: ${currentProfile.training_location}`
    );
  }

  if (currentProfile.diet) {
    parts.push(
      `Ernährung: ${currentProfile.diet}`
    );
  }

  element.textContent =
    parts.length
      ? parts.join(" • ")
      : "Noch keine Profildaten vorhanden.";
}


/* =========================================================
   EXERCISES
========================================================= */

function renderExercises() {
  const list =
    document.getElementById(
      "exerciseList"
    );

  if (!list) {
    return;
  }

  const location =
    currentProfile
      ?.training_location ||
    "Zuhause";

  let exercises;

  if (
    location ===
    "Fitnessstudio"
  ) {

    exercises = [
      {
        name: "Bankdrücken",
        description:
          "Brust, Schulter und Trizeps.",
        tags: [
          "Brust",
          "Schulter",
          "Trizeps"
        ],
        search:
          "Bankdrücken richtige Technik"
      },

      {
        name: "Latzug",
        description:
          "Rücken und Bizeps.",
        tags: [
          "Rücken",
          "Bizeps"
        ],
        search:
          "Latzug richtige Technik"
      },

      {
        name: "Beinpresse",
        description:
          "Beine und Gesäß.",
        tags: [
          "Beine",
          "Po"
        ],
        search:
          "Beinpresse richtige Technik"
      },

      {
        name: "Rudern",
        description:
          "Oberer Rücken und Bizeps.",
        tags: [
          "Rücken",
          "Bizeps"
        ],
        search:
          "Rudermaschine richtige Technik"
      },

      {
        name: "Schulterdrücken",
        description:
          "Schultern und Trizeps.",
        tags: [
          "Schulter",
          "Trizeps"
        ],
        search:
          "Schulterdrücken richtige Technik"
      },

      {
        name: "Kabelzug",
        description:
          "Vielseitige Übung für verschiedene Muskelgruppen.",
        tags: [
          "Ganzkörper"
        ],
        search:
          "Kabelzug Fitness richtige Technik"
      }

    ];

  } else {

    exercises = [
      {
        name: "Liegestütze",
        description:
          "Brust, Schulter und Trizeps.",
        tags: [
          "Brust",
          "Schulter",
          "Trizeps"
        ],
        search:
          "Liegestütze richtige Technik"
      },

      {
        name: "Kniebeugen",
        description:
          "Beine und Gesäß.",
        tags: [
          "Beine",
          "Po"
        ],
        search:
          "Kniebeugen richtige Technik"
      },

      {
        name: "Plank",
        description:
          "Rumpf und Core.",
        tags: [
          "Core",
          "Bauch"
        ],
        search:
          "Plank richtige Technik"
      },

      {
        name: "Ausfallschritte",
        description:
          "Beine und Gesäß.",
        tags: [
          "Beine",
          "Po"
        ],
        search:
          "Ausfallschritte richtige Technik"
      },

      {
        name: "Glute Bridge",
        description:
          "Gesäß und hintere Oberschenkel.",
        tags: [
          "Po",
          "Beine"
        ],
        search:
          "Glute Bridge richtige Technik"
      },

      {
        name: "Mountain Climbers",
        description:
          "Core und Kondition.",
        tags: [
          "Core",
          "Ausdauer"
        ],
        search:
          "Mountain Climbers richtige Technik"
      }
    ];
  }

  list.innerHTML =
    exercises
      .map(
        (
          exercise,
          index
        ) => {

          const tags =
            exercise.tags
              .map(
                tag =>
                  `<span class="tag">${escapeHTML(tag)}</span>`
              )
              .join("");

          const youtube =
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(
              exercise.search
            );

          return `
            <div class="card exercise-card">

              <div class="exercise-number">
                ${String(index + 1).padStart(2, "0")}
              </div>

              <h3>
                ${escapeHTML(
                  exercise.name
                )}
              </h3>

              <p class="card-description">
                ${escapeHTML(
                  exercise.description
                )}
              </p>

              <div class="exercise-tags">
                ${tags}
              </div>

              <div class="exercise-actions">

                <a
                  href="${youtube}"
                  target="_blank"
                  rel="noopener"
                >
                   Video
                </a>

                <button
                  onclick="useAIQuickPrompt('Erkläre mir die richtige Technik für ${escapeHTML(exercise.name)}.')"
                >
                   KI
                </button>

              </div>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   AI QUICK PROMPT
========================================================= */

function useAIQuickPrompt(prompt) {
  showTab("ai");

  const input =
    document.getElementById(
      "aiInput"
    );

  if (!input) {
    return;
  }

  input.value =
    prompt;

  input.focus();
}

/* =========================================================
   AI INPUT
========================================================= */

function setupAIInput() {
  const input =
    document.getElementById("aiInput");

  const sendButton =
    document.getElementById("aiSendButton");

  if (!input) {
    console.warn(" aiInput wurde nicht gefunden.");
    return;
  }

  /*
    Enter = Nachricht senden
    Shift + Enter = neue Zeile
  */

  input.addEventListener("keydown", event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      askGemini();
    }
  });

  /*
    Senden-Button zusätzlich per JavaScript
    verbinden.
    Dadurch funktioniert er auch dann,
    wenn das onclick im HTML einmal nicht greift.
  */

  if (sendButton) {
    sendButton.addEventListener("click", event => {
      event.preventDefault();

      askGemini();
    });
  }

  console.log(" KI-Eingabe bereit.");
}
/* =========================================================
   BUILD AI CONTEXT
========================================================= */

function buildAIContext() {
  if (!currentProfile) {
    return "Noch keine Profildaten vorhanden.";
  }

  return [
    `Name: ${currentProfile.name || "unbekannt"}`,
    `Alter: ${currentProfile.age || "unbekannt"}`,
    `Größe: ${currentProfile.height || "unbekannt"} cm`,
    `Gewicht: ${currentProfile.weight || "unbekannt"} kg`,
    `Ziel: ${currentProfile.goal || "nicht angegeben"}`,
    `Trainingsort: ${currentProfile.training_location || "nicht angegeben"}`,
    `Ernährungsweise: ${currentProfile.diet || "nicht angegeben"}`
  ].join("\n");
}


/* =========================================================
   TRAINING / MEAL INTENT
========================================================= */

function isTrainingPlanRequest(text) {
  const lower =
    String(text || "")
      .toLowerCase();

  const hasPlanWord =
    lower.includes("trainingsplan") ||
    lower.includes("trainings plan") ||
    lower.includes("wochenplan") ||
    lower.includes("trainingswoche");

  const hasCreateWord =
    lower.includes("erstell") ||
    lower.includes("mach") ||
    lower.includes("generier") ||
    lower.includes("plan");

  return (
    hasPlanWord &&
    hasCreateWord
  );
}


function isMealPlanRequest(text) {
  const lower =
    String(text || "")
      .toLowerCase();

  const hasMealWord =
    lower.includes("essensplan") ||
    lower.includes("ernährungsplan") ||
    lower.includes("mahlzeitenplan") ||
    lower.includes("wochen-mahlzeitenplan") ||
    lower.includes("wochen essensplan");

  const hasCreateWord =
    lower.includes("erstell") ||
    lower.includes("mach") ||
    lower.includes("generier") ||
    lower.includes("plan");

  return (
    hasMealWord &&
    hasCreateWord
  );
}

/* =========================================================
   AI CHAT UI
========================================================= */

function addAIMessage(role, text) {
  const chat = document.getElementById("aiChat");

  if (!chat) {
    console.error(" aiChat wurde nicht gefunden.");
    return null;
  }

  const message = document.createElement("div");

  message.className =
    role === "user"
      ? "ai-message user"
      : "ai-message ai";

  message.innerHTML = formatAIText(text);

  chat.appendChild(message);

  chat.scrollTop = chat.scrollHeight;

  return message;
}


function updateLastAIMessage(text) {
  const chat = document.getElementById("aiChat");

  if (!chat) {
    console.error(" aiChat wurde nicht gefunden.");
    return;
  }

  const messages =
    chat.querySelectorAll(".ai-message");

  if (!messages.length) {
    return;
  }

  const lastMessage =
    messages[messages.length - 1];

  lastMessage.innerHTML = text;

  chat.scrollTop = chat.scrollHeight;
}
/* =========================================================
   AI CHAT
========================================================= */

async function askGemini(
  userMessage = null,
  options = {}
) {

  const {
    showInChat = true,
    systemInstruction = ""
  } = options;

  const input =
    document.getElementById(
      "aiInput"
    );

  if (!userMessage) {
    userMessage =
      input?.value?.trim() ||
      "";
  }

  if (!userMessage) {
    return null;
  }

  /*
    WICHTIG:

    Wenn jemand über den normalen Chat
    ausdrücklich einen Trainingsplan oder
    Essensplan anfordert, wird die Anfrage
    NICHT im Chat verarbeitet.

    Stattdessen wird direkt der entsprechende
    Bereich geöffnet.
  */

  if (
    showInChat &&
    isTrainingPlanRequest(userMessage)
  ) {
    return generateTrainingPlan(userMessage);
  }

  if (
    showInChat &&
    isMealPlanRequest(userMessage)
  ) {
    return generateMealPlan();
  }

  if (!supabaseClient) {

    if (showInChat) {
      addAIMessage(
        "assistant",
        " Supabase ist nicht verbunden."
      );
    }

    return null;
  }

  if (!currentUser) {

    if (showInChat) {
      addAIMessage(
        "assistant",
        " Bitte melde dich zuerst an."
      );
    }

    return null;
  }

  /*
    Nachricht anzeigen
  */

  if (showInChat) {

    addAIMessage(
      "user",
      userMessage
    );

    addAIMessage(
      "assistant",
      " Die KI denkt gerade …"
    );

    if (input) {
      input.value = "";
    }
  }

  const profile =
    currentProfile || {};

  /*
    DIESE KI-INSTRUKTION BLEIBT WIE IN DEINER
    BISHERIGEN VERSION.
  */

  const defaultSystemInstruction = `
Du bist FITNESS AI PRO, ein freundlicher und sicherer Fitness-Coach.

Der Nutzer ist minderjährig.

Antworte altersgerecht, verständlich und motivierend.

Deine Aufgaben:
- Training erklären
- Übungen erklären
- Trainingspläne erstellen
- gesunde Ernährung unterstützen
- Regeneration erklären
- Schlaf erklären
- Motivation geben
- Fortschritte sinnvoll einordnen

Wichtig:
- Keine Crash-Diäten
- Keine extreme Kalorienrestriktion
- Keine Empfehlungen zum schnellen Abnehmen
- Keine leistungssteigernden Substanzen
- Keine gefährlichen Trainingsmethoden
- Keine ungesunden Essensregeln
- Fokus auf gesundes Wachstum
- Fokus auf ausreichend Energie
- Fokus auf Technik
- Fokus auf Schlaf und Regeneration
- Bei gesundheitlichen Problemen an Eltern oder medizinische Fachpersonen verweisen.

Nutzerprofil:

Name:
${profile.name || "unbekannt"}

Alter:
${profile.age || "unbekannt"}

Größe:
${profile.height || "unbekannt"} cm

Gewicht:
${profile.weight || "unbekannt"} kg

Ziel:
${profile.goal || "unbekannt"}

Trainingsort:
${profile.training_location || "unbekannt"}

Ernährung:
${profile.diet || "keine Angabe"}

${systemInstruction}
`;

  try {

    console.log(
      " Anfrage an smooth-handler..."
    );

    /*
      DER AUFRUF IST DERSELBE WIE VORHER.
    */

    const requestPromise =
      supabaseClient.functions.invoke(
        GEMINI_FUNCTION,
        {
          body: {

            message:
              userMessage,

            profile: {
              name:
                profile.name ||
                "unbekannt",

              age:
                profile.age ||
                "unbekannt",

              height:
                profile.height ||
                "unbekannt",

              weight:
                profile.weight ||
                "unbekannt",

              goal:
                profile.goal ||
                "unbekannt",

              training_location:
                profile.training_location ||
                "unbekannt",

              diet:
                profile.diet ||
                "keine Angabe"
            },

            systemInstruction:
              defaultSystemInstruction,

            history: []
          }
        }
      );

    let timeoutId;

    const timeoutPromise =
      new Promise(
        (_, reject) => {
          timeoutId = window.setTimeout(
            () => {
              reject(
                new Error(
                  "Die KI braucht zu lange. Bitte versuche es erneut."
                )
              );
            },
            30000
          );
        }
      );

    let result;

    try {
      result = await Promise.race([
        requestPromise,
        timeoutPromise
      ]);
    } finally {
      window.clearTimeout(timeoutId);
    }

    const {
      data,
      error
    } = result;

    if (error) {
      let details =
        error.message ||
        "Die Verbindung zur KI ist fehlgeschlagen.";

      /*
        Supabase zeigt bei HTTP-Fehlern oft nur
        „Edge Function returned a non-2xx status code“.
        Wenn möglich, lesen wir zusätzlich den eigentlichen
        Fehlertext aus der Response der Edge Function.
      */
      try {
        const response = error.context;
        if (response && typeof response.clone === "function") {
          const body = await response.clone().json();
          details =
            body?.error ||
            body?.message ||
            details;
        }
      } catch (parseError) {
        console.warn(
          "Die genaue KI-Fehlermeldung konnte nicht gelesen werden:",
          parseError
        );
      }

      throw new Error(details);
    }

    if (!data) {
      throw new Error(
        "Die KI hat keine Antwort zurückgegeben."
      );
    }

    if (!data.success) {
      throw new Error(
        data.error ||
        "Die KI konnte keine Antwort erstellen."
      );
    }

    const answer =
      String(
        data.answer || ""
      ).trim();

    if (!answer) {
      throw new Error(
        "Die KI hat keine verwertbare Antwort zurückgegeben."
      );
    }

    console.log(
      " Antwort von smooth-handler erhalten."
    );

    if (showInChat) {
      updateLastAIMessage(
        formatAIText(answer)
      );
    }

    /*
      Nur normale KI-Antworten dürfen hier
      noch automatisch erkannt werden.

      Die direkten Plan-Funktionen speichern
      ihre Pläne selbst.
    */

    return answer;

  } catch (error) {

    console.error(
      " KI-FEHLER:",
      error
    );

    const readableError =
      error?.message ||
      "Unbekannter Fehler bei der KI.";

    if (showInChat) {

      updateLastAIMessage(
        formatAIText(
          ` KI-Fehler\n\n${readableError}`
        )
      );
    }

    return null;
  }
}


/* =========================================================
   DIRECT TRAINING PLAN
========================================================= */

async function generateTrainingPlan(customPrompt = "") {
  if (!supabaseClient || !currentUser) {
    alert("Bitte melde dich zuerst an.");
    return null;
  }

  const container = document.getElementById("trainingPlan");
  const preferencesInput = document.getElementById("trainingPreferences");
  const requestedPreferences = String(customPrompt || preferencesInput?.value || "").trim();

  // Aktuelle Formularwerte haben Vorrang vor eventuell veralteten Profilwerten.
  const savedProfile = currentProfile || {};
  const profile = {
    ...savedProfile,
    name: document.getElementById("profileNameInput")?.value?.trim() || savedProfile.name || "",
    age: document.getElementById("profileAge")?.value !== undefined && document.getElementById("profileAge")?.value !== ""
      ? Number(document.getElementById("profileAge").value) : savedProfile.age,
    height: document.getElementById("profileHeight")?.value !== undefined && document.getElementById("profileHeight")?.value !== ""
      ? Number(document.getElementById("profileHeight").value) : savedProfile.height,
    goal: document.getElementById("goal")?.value || savedProfile.goal || "",
    training_location: document.getElementById("trainingLocation")?.value || savedProfile.training_location || ""
  };

  // Nicht stillschweigend einen allgemeinen Plan erstellen, wenn die nötigen Angaben fehlen.
  const missing = [];
  if (!profile.age || !Number.isFinite(Number(profile.age))) missing.push("dein Alter im Profil");
  if (!profile.height || !Number.isFinite(Number(profile.height))) missing.push("deine Körpergröße im Profil");
  if (!profile.goal) missing.push("dein Trainingsziel");
  if (!profile.training_location) missing.push("deinen Trainingsort");

  if (missing.length) {
    showTab("training");
    if (container) {
      container.innerHTML = '<div class="card"><h3>Dein Plan braucht noch Angaben</h3><p class="card-description">Damit ich keinen Standardplan erstelle, ergänze bitte zuerst: ' +
        missing.map(value => value.replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]))).join(", ") +
        '.</p></div>';
    }
    return null;
  }

  // Die Auswahl direkt vor der KI-Anfrage speichern, damit keine alten Werte verwendet werden.
  try {
    const profileUpdate = {
      user_id: currentUser.id,
      Name: profile.name || "User",
      Age: Number(profile.age),
      Height: Number(profile.height),
      Goal: profile.goal,
      training_location: profile.training_location,
      Diet: profile.diet || "",
      email: currentUser.email || ""
    };
    const { error } = await supabaseClient.from("profiles").upsert(profileUpdate, { onConflict: "user_id" });
    if (error) console.error("Trainingsprofil konnte nicht synchronisiert werden:", error);
    currentProfile = { ...savedProfile, ...profile };
    updateAIUserInfo();
  } catch (error) {
    console.error("Trainingsprofil konnte nicht synchronisiert werden:", error);
  }

  showTab("training");

  if (container) {
    container.innerHTML = '<div class="card"><p class="card-description">Dein persönlicher Trainingsplan wird anhand deiner Angaben erstellt …</p></div>';
  }

  const prompt = `
Du bist ein persönlicher Trainingsplaner. Erstelle einen WIRKLICH INDIVIDUELLEN, vollständigen Wochenplan für genau diesen Nutzer. Ein allgemeiner Standardplan ist ausdrücklich nicht erlaubt. Nutze alle folgenden Daten aktiv und mache die Entscheidungen im Trainingsplan sichtbar.

PERSÖNLICHES PROFIL:
Name: ${profile.name || "nicht angegeben"}
Alter: ${profile.age} Jahre
Größe: ${profile.height} cm
Gewicht: ${profile.weight || "nicht angegeben"} kg
Trainingsziel: ${profile.goal}
Trainingsort: ${profile.training_location}
Ernährungsweise: ${profile.diet || "nicht angegeben"}

PERSÖNLICHE WÜNSCHE, die konkret im Plan umgesetzt werden müssen:
${requestedPreferences || "Keine zusätzlichen Wünsche. Passe den Plan dennoch konkret an Ziel, Alter und Trainingsort an."}

VERBINDLICHE REGELN:
- Erstelle sieben Abschnitte von MONTAG bis SONNTAG.
- Erfinde keine fehlenden Profilangaben und gib keinen austauschbaren Beispiel- oder Standardplan aus.
- Passe Übungsauswahl, Trainingsaufteilung, Belastung und Erholung an das angegebene Ziel, Alter und den Trainingsort an.
- Bei Trainingsort „Zuhause“: nur Übungen mit Körpergewicht und/oder typischerweise verfügbaren Haushaltsmitteln; keine Geräte voraussetzen, die nicht genannt wurden.
- Bei Trainingsort „Fitnessstudio“: nutze passende Studio-Geräte und freie Gewichte, aber nur altersgerechte, kontrollierbare Belastungen.
- Berücksichtige ausdrücklich genannte Muskelgruppen, Trainingstage, verfügbare Ausrüstung, Einschränkungen und Erfahrungslevel. Die Wünsche müssen sich in den konkreten Übungen und der Wochenaufteilung wiederfinden.
- Wenn eine bestimmte Zahl an Trainingstagen gewünscht wird, halte sie exakt ein. An allen anderen Tagen Ruhe oder leichte Erholung.
- Wenn keine Anzahl genannt wird, wähle eine realistische Anzahl mit ausreichender Regeneration.
- Der Nutzer ist minderjährig: keine Maximalversuche, keine extremen Gewichte, keine gefährlichen Methoden; Technik und Betreuung haben Vorrang.
- Maximal 6 Übungen pro Trainingstag.
- Format pro Tag: „MONTAG | konkreter Schwerpunkt“ oder „MONTAG | RUHETAG“.
- Jede Übung in einer eigenen Zeile im Format: „ÜBUNG: Name | SÄTZE: 3 | WIEDERHOLUNGEN: 8–12“ oder bei Zeitübungen „ÜBUNG: Name | SÄTZE: 3 | DAUER: 30 Sekunden“.
- Nenne keine Übungen, die am ausgewählten Trainingsort nicht möglich sind.
- Gib ausschließlich den Wochenplan aus, ohne Einleitung und ohne allgemeine Fitness-Tipps.
`.trim();

  const answer = await askGemini(prompt, { showInChat: false });

  if (!answer) {
    if (container) {
      container.innerHTML = '<div class="card"><p class="card-description">Dein individueller Trainingsplan konnte gerade nicht erstellt werden. Es wurde kein Standardplan eingesetzt. Bitte prüfe die Verbindung und versuche es erneut.</p><button type="button" class="secondary-btn" onclick="generateTrainingPlan()">Erneut versuchen</button></div>';
    }
    return null;
  }

  // Reject obviously incomplete/generic responses rather than silently treating them as a plan.
  const dayHeadings = (answer.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?(MONTAG|DIENSTAG|MITTWOCH|DONNERSTAG|FREITAG|SAMSTAG|SONNTAG)\b/gim) || []).length;
  if (dayHeadings < 5) {
    if (container) {
      container.innerHTML = '<div class="card"><p class="card-description">Die KI hat keinen vollständigen Wochenplan geliefert. Ich speichere diese Antwort nicht als Trainingsplan, damit kein unpassender Standardplan angezeigt wird.</p><button type="button" class="secondary-btn" onclick="generateTrainingPlan()">Erneut versuchen</button></div>';
    }
    console.warn("KI-Antwort verworfen: zu wenige erkennbare Wochentage.");
    return null;
  }

  localStorage.setItem("fitness_ai_training_plan", answer);
  localStorage.setItem("fitness_ai_training_plan_updated", new Date().toISOString());
  renderTrainingPlan(answer);
  return answer;
}

/* =========================================================
   DIRECT MEAL PLAN
========================================================= */

async function generateMealPlan(
  customPrompt = ""
) {

  if (
    !supabaseClient ||
    !currentUser
  ) {
    alert(
      "Bitte melde dich zuerst an."
    );
    return null;
  }

  /*
    Direkt zur Ernährung.
    Kein sichtbarer Chat.
  */

  showTab("nutrition");

  const container =
    document.getElementById(
      "mealPlan"
    );

  if (container) {
    container.innerHTML = `
      <div class="card">
        <p class="card-description">
           Dein persönlicher Essensplan wird gerade erstellt …
        </p>
      </div>
    `;
  }

  const profile =
    currentProfile || {};

  const prompt =
    customPrompt?.trim() ||
    "Erstelle mir einen ausgewogenen Wochen-Mahlzeitenplan.";

  const aiPrompt = `
Erstelle mir einen persönlichen und ausgewogenen Wochen-Essensplan.

Berücksichtige mein Profil:

Name: ${profile.name || "unbekannt"}
Alter: ${profile.age || "unbekannt"}
Größe: ${profile.height || "unbekannt"} cm
Gewicht: ${profile.weight || "unbekannt"} kg
Ziel: ${profile.goal || "unbekannt"}
Ernährungsweise: ${profile.diet || "keine Angabe"}

Der Nutzer ist minderjährig.

Wichtig:
- Fokus auf gesundes Wachstum
- ausreichend Energie und Nährstoffe
- keine Crash-Diät
- keine extreme Kalorienrestriktion
- keine Empfehlungen zum schnellen Abnehmen
- ausgewogene Mahlzeiten
- alltagstaugliche Lebensmittel

Mein zusätzlicher Wunsch:
${prompt}

Strukturiere den Plan übersichtlich nach Montag bis Sonntag.

Für jeden Tag:
- Frühstück
- Mittagessen
- Snack
- Abendessen

Erstelle danach eine übersichtliche Einkaufsliste.

Keine Kalorienzählung nötig.

Antworte ausschließlich mit dem Essensplan und der Einkaufsliste.
  `.trim();

  const answer =
    await askGemini(
      aiPrompt,
      {
        showInChat: false
      }
    );

  if (!answer) {

    if (container) {
      container.innerHTML = `
        <div class="card">
          <p class="card-description">
             Der Essensplan konnte nicht erstellt werden.
            Bitte versuche es erneut.
          </p>
        </div>
      `;
    }

    return null;
  }

  /*
    Essensplan speichern.
  */

  localStorage.setItem(
    "fitness_ai_meal_plan",
    answer
  );

  localStorage.setItem(
    "fitness_ai_meal_plan_updated",
    new Date().toISOString()
  );

  renderMealPlan(answer);
  createShoppingList();

  return answer;
}


/* =========================================================
   NUTRITION AI
========================================================= */

async function askNutritionAI() {

  const promptElement =
    document.getElementById(
      "nutritionPrompt"
    );

  const prompt =
    promptElement?.value?.trim() ||
    "Erstelle mir einen ausgewogenen Wochen-Mahlzeitenplan.";

  await generateMealPlan(prompt);
}


/* =========================================================
   SHOPPING LIST
========================================================= */

function createShoppingList() {

  const mealPlan =
    localStorage.getItem(
      "fitness_ai_meal_plan"
    );

  if (!mealPlan) {

    alert(
      "Bitte erstelle zuerst einen Essensplan."
    );

    return;
  }

  const list =
    document.getElementById(
      "shoppingList"
    );

  if (!list) {
    return;
  }

  /*
    Wir versuchen zunächst einen Bereich
    "Einkaufsliste" aus der KI-Antwort zu
    erkennen.
  */

  const lower =
    mealPlan.toLowerCase();

  const shoppingIndex =
    lower.indexOf(
      "einkaufsliste"
    );

  if (shoppingIndex < 0) {
    list.innerHTML = '<p class="card-description">In deinem Mahlzeitenplan wurde keine Einkaufsliste erkannt. Bitte die KI um eine Einkaufsliste.</p>';
    return;
  }

  let shoppingText = mealPlan;

  if (shoppingIndex >= 0) {
    shoppingText =
      mealPlan.substring(
        shoppingIndex +
        "einkaufsliste".length
      );
  }

  const items =
    shoppingText
      .split(/\r?\n+/)
      .map(line => line.trim())
      .map(line => line
        .replace(/^\s*(?:[-•*+]\s+|\d+[.)]\s+)/, "")
        .replace(/^#{1,6}\s*/, "")
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
        .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
        .replace(/^\*+\s*|\s*\*+$/g, "")
        .replace(/^:+|:+$/g, "")
        .trim()
      )
      .filter(line =>
        line &&
        !/^[-_*]{2,}$/.test(line) &&
        !/^einkaufsliste\s*:?$/i.test(line) &&
        !/^montag$/i.test(line) &&
        !/^dienstag$/i.test(line) &&
        !/^mittwoch$/i.test(line) &&
        !/^donnerstag$/i.test(line) &&
        !/^freitag$/i.test(line) &&
        !/^samstag$/i.test(line) &&
        !/^sonntag$/i.test(line)
      )
      .slice(0, 40);

  list.innerHTML = `
    <ul class="shopping-list">
      ${items
        .map(
          item =>
            `<li>${escapeHTML(item)}</li>`
        )
        .join("")}
    </ul>
  `;
}


/* =========================================================
   PLAN LOADING
========================================================= */

function loadSavedPlans() {
  loadSavedTrainingPlan();
  loadSavedMealPlan();
}


function loadSavedTrainingPlan() {

  const plan =
    localStorage.getItem(
      "fitness_ai_training_plan"
    );

  if (plan) {
    renderTrainingPlan(plan);
  }
}


function loadSavedMealPlan() {

  const plan =
    localStorage.getItem(
      "fitness_ai_meal_plan"
    );

  if (plan) {
    renderMealPlan(plan);
    createShoppingList();
  }
}


/* =========================================================
   MEAL PLAN RENDER
========================================================= */

function renderMealPlan(
  text
) {

  const container =
    document.getElementById(
      "mealPlan"
    );

  if (!container) {
    return;
  }

  const lines =
    text
      .split("\n")
      .map(
        line =>
          line.trim()
      )
      .filter(Boolean)
      .slice(0, 60);

  container.innerHTML = `
    <div style="display:grid;gap:9px">

      ${lines
        .map(
          line => `
            <div
              style="
                padding:11px;
                border:1px solid var(--border);
                border-radius:10px;
                background:#10161e;
                line-height:1.6;
              "
            >
              ${formatAIText(line)}
            </div>
          `
        )
        .join("")}

    </div>
  `;
}


/* =========================================================
   TRAINING PLAN RENDER
========================================================= */

function getTrainingDateForDay(dayName, referenceDate = new Date()) {
  const weekdays = { SONNTAG: 0, MONTAG: 1, DIENSTAG: 2, MITTWOCH: 3, DONNERSTAG: 4, FREITAG: 5, SAMSTAG: 6 };
  const targetDay = weekdays[String(dayName || "").toUpperCase()];
  if (targetDay === undefined) return null;
  const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset + ((targetDay + 6) % 7));
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function renderTrainingPlan(text) {
  const container = document.getElementById("trainingPlan");
  if (!container) return;

  const rawText = String(text || "").trim();
  if (!rawText) {
    container.innerHTML = '<p class="card-description">Noch kein Trainingsplan vorhanden.</p>';
    return;
  }

  const days = [];
  let currentDay = null;
  const dayNames = "MONTAG|DIENSTAG|MITTWOCH|DONNERSTAG|FREITAG|SAMSTAG|SONNTAG";
  const dayHeading = new RegExp(
    "^\\s*(?:#{1,6}\\s*)?(?:\\*{1,2})?(" + dayNames + ")(?:\\*{1,2})?\\s*(?:\\||[-–—:]|\\s+)?\\s*(.*?)(?:\\*{1,2})?\\s*$",
    "i"
  );

  for (const originalLine of rawText.split(/\r?\n/)) {
    const line = originalLine.trim().replace(/^[-*•]+\s*/, "").replace(/^\*{1,2}|\*{1,2}$/g, "");
    if (!line) continue;

    const heading = line.match(dayHeading);
    if (heading) {
      currentDay = {
        name: heading[1].toUpperCase(),
        focus: (heading[2] || "").replace(/^\s*[|:–—-]\s*/, "").trim() || "Trainingsplan",
        exercises: []
      };
      days.push(currentDay);
      continue;
    }

    if (/^(?:RUHETAG|REST DAY|ERHOLUNG)(?:\b|$)/i.test(line)) {
      if (!currentDay) {
        currentDay = { name: "ERHOLUNG", focus: "Regeneration", exercises: [] };
        days.push(currentDay);
      } else {
        currentDay.focus = line.replace(/[.!]$/, "");
      }
      continue;
    }

    if (!currentDay) continue;

    let exerciseLine = line;
    if (/^ÜBUNG\s*:/i.test(exerciseLine)) {
      exerciseLine = exerciseLine.replace(/^ÜBUNG\s*:\s*/i, "");
    } else if (/^(?:[-•*]\s*)/.test(originalLine.trim())) {
      exerciseLine = originalLine.trim().replace(/^[-•*]\s*/, "");
    } else if (/^\d+[.)]\s+/.test(exerciseLine)) {
      exerciseLine = exerciseLine.replace(/^\d+[.)]\s+/, "");
    } else {
      continue;
    }

    const parts = exerciseLine.split("|").map(value => value.trim()).filter(Boolean);
    const name = (parts.shift() || "").replace(/\*{1,2}/g, "").trim();
    if (!name || /^(RUHETAG|REST DAY|ERHOLUNG)$/i.test(name)) continue;
    currentDay.exercises.push({ name, details: parts });
  }

  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  if (!days.length) {
    // Wenn die KI vom gewünschten Format abweicht, trotzdem den ganzen Plan anzeigen.
    container.innerHTML = '<section class="card"><h3> Dein KI-Trainingsplan</h3><div class="training-plan-text">' +
      rawText.split(/\r?\n/).filter(Boolean).map(line =>
        '<p style="white-space:pre-wrap;line-height:1.6;margin:8px 0">' + escape(line) + '</p>'
      ).join("") +
      '</div></section>';
    console.warn("Trainingsplan wurde als Text angezeigt, da kein Tagesformat erkannt wurde.");
    return;
  }

  container.innerHTML = '<div class="training-days">' + days.map(day =>
    '<section class="card training-day-card"><div class="section-header"><div><h3> ' + escape(day.name) +
    '</h3><p class="card-description">' + escape(day.focus) + '</p></div><span class="tag">' + day.exercises.length + ' Übungen</span></div>' +
    (day.exercises.length
      ? '<div class="training-exercises">' + day.exercises.map(exercise =>
          '<article class="card exercise-card training-exercise-card"><div class="training-exercise-heading">' +
          '<input type="checkbox" class="training-exercise-checkbox" data-exercise="' + escape(exercise.name) +
          '" data-day="' + escape(day.name) + '" onchange="toggleTrainingExercise(this)" aria-label="' + escape(exercise.name) + ' erledigt">' +
          '<div class="training-exercise-title"><h4>' + escape(exercise.name) + '</h4><div class="exercise-tags">' +
          exercise.details.map(detail => '<span class="tag">' + escape(detail) + '</span>').join("") +
          '</div></div></div><div class="training-metrics">' +
          '<div class="field"><label>Gewicht (kg)</label><input type="number" min="0" step="0.5" placeholder="z. B. 20" class="training-weight-input" inputmode="decimal"></div>' +
          '<div class="field"><label>Wiederholungen</label><input type="number" min="0" step="1" placeholder="z. B. 10" class="training-reps-input" inputmode="numeric"></div>' +
          '<div class="field"><label>Dauer (Sek.)</label><input type="number" min="0" step="1" placeholder="z. B. 60" class="training-duration-input" inputmode="numeric"></div>' +
          '</div><button type="button" class="primary-btn save-performance-btn" onclick="saveTrainingPerformance(this)">Werte speichern</button></article>'
        ).join("") + '</div>'
      : '<p class="card-description training-rest-day">Für diesen Tag sind keine Übungen eingeplant.</p>') +
    '</section>'
  ).join("") + '</div>';

  void loadSavedTrainingEntries();
  updateDashboardWorkout();
}

function readTrainingNumber(input, label, integer = false) {
  const raw = input?.value?.trim() || "";
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new Error(label + (integer ? " muss eine ganze Zahl ab 0 sein." : " muss eine Zahl ab 0 sein."));
  }
  return value;
}

async function loadSavedTrainingEntries() {
  if (!currentUser || !supabaseClient) return;
  try {
    const { data, error } = await supabaseClient.from("training_entries")
      .select("exercise_name, training_date, completed, weight, reps, duration_seconds")
      .eq("user_id", currentUser.id);
    if (error) throw error;
    const entries = new Map((data || []).map(entry => [entry.exercise_name + "::" + entry.training_date, entry]));
    document.querySelectorAll(".training-exercise-checkbox").forEach(checkbox => {
      const date = getTrainingDateForDay(checkbox.dataset.day);
      const entry = date ? entries.get(checkbox.dataset.exercise + "::" + date) : null;
      const card = checkbox.closest(".training-exercise-card");
      checkbox.checked = entry?.completed === true;
      const weight = card?.querySelector(".training-weight-input");
      const reps = card?.querySelector(".training-reps-input");
      const duration = card?.querySelector(".training-duration-input");
      if (weight) weight.value = entry?.weight ?? "";
      if (reps) reps.value = entry?.reps ?? "";
      if (duration) duration.value = entry?.duration_seconds ?? "";
    });
  } catch (error) {
    console.error("Gespeicherte Trainingsdaten konnten nicht geladen werden:", error);
  }
}

async function saveTrainingPerformance(button) {
  if (!currentUser || !supabaseClient) {
    alert("Bitte melde dich zuerst an.");
    return;
  }
  const card = button?.closest(".training-exercise-card");
  const checkbox = card?.querySelector(".training-exercise-checkbox");
  const exerciseName = checkbox?.dataset.exercise;
  const trainingDate = getTrainingDateForDay(checkbox?.dataset.day);
  if (!card || !exerciseName || !trainingDate) {
    alert("Die Trainingskarte konnte nicht erkannt werden. Bitte lade die Seite neu.");
    return;
  }

  let weight, reps, duration;
  try {
    weight = readTrainingNumber(card.querySelector(".training-weight-input"), "Gewicht");
    reps = readTrainingNumber(card.querySelector(".training-reps-input"), "Wiederholungen", true);
    duration = readTrainingNumber(card.querySelector(".training-duration-input"), "Dauer", true);
  } catch (error) {
    alert(error.message);
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Speichert …";
  try {
    const { error } = await supabaseClient.from("training_entries").upsert({
      user_id: currentUser.id, exercise_name: exerciseName, training_date: trainingDate,
      completed: checkbox.checked, weight, reps, duration_seconds: duration
    }, { onConflict: "user_id,exercise_name,training_date" });
    if (error) throw error;
    button.textContent = "✓ Gespeichert";
    await loadTrainingProgress();
    window.setTimeout(() => { if (button.isConnected) button.textContent = "Werte speichern"; }, 1800);
  } catch (error) {
    console.error("Fehler beim Speichern der Trainingsleistung:", error);
    button.textContent = "Erneut versuchen";
    alert("Die Werte konnten nicht gespeichert werden. Bitte versuche es erneut.");
  } finally {
    button.disabled = false;
    if (button.textContent === "Speichert …") button.textContent = originalLabel;
  }
}

async function toggleTrainingExercise(checkbox) {
  if (!currentUser || !supabaseClient) {
    alert("Bitte melde dich zuerst an.");
    checkbox.checked = false;
    return;
  }
  const exerciseName = checkbox.dataset.exercise;
  const trainingDate = getTrainingDateForDay(checkbox.dataset.day);
  const card = checkbox.closest(".training-exercise-card");
  if (!exerciseName || !trainingDate || !card) {
    checkbox.checked = !checkbox.checked;
    return;
  }

  checkbox.disabled = true;
  try {
    const { data: existing, error: lookupError } = await supabaseClient.from("training_entries")
      .select("weight, reps, duration_seconds")
      .eq("user_id", currentUser.id).eq("exercise_name", exerciseName).eq("training_date", trainingDate).maybeSingle();
    if (lookupError) throw lookupError;
    const weightInput = card.querySelector(".training-weight-input");
    const repsInput = card.querySelector(".training-reps-input");
    const durationInput = card.querySelector(".training-duration-input");
    const weight = weightInput?.value.trim() !== "" ? readTrainingNumber(weightInput, "Gewicht") : existing?.weight ?? null;
    const reps = repsInput?.value.trim() !== "" ? readTrainingNumber(repsInput, "Wiederholungen", true) : existing?.reps ?? null;
    const duration = durationInput?.value.trim() !== "" ? readTrainingNumber(durationInput, "Dauer", true) : existing?.duration_seconds ?? null;
    const { error } = await supabaseClient.from("training_entries").upsert({
      user_id: currentUser.id, exercise_name: exerciseName, training_date: trainingDate,
      completed: checkbox.checked, weight, reps, duration_seconds: duration
    }, { onConflict: "user_id,exercise_name,training_date" });
    if (error) throw error;
  } catch (error) {
    console.error("Fehler beim Speichern des Übungsstatus:", error);
    checkbox.checked = !checkbox.checked;
    alert("Die Übung konnte nicht gespeichert werden. Bitte prüfe deine Verbindung und versuche es erneut.");
  } finally {
    checkbox.disabled = false;
  }
}

async function loadTrainingProgress() {
  const container = document.getElementById("trainingProgressCharts");
  if (!container) return;
  if (!currentUser || !supabaseClient) {
    container.innerHTML = '<p class="card-description">Melde dich an, um deinen Trainingsfortschritt zu sehen.</p>';
    return;
  }
  container.innerHTML = '<p class="card-description">Trainingsfortschritt wird geladen …</p>';
  try {
    const { data, error } = await supabaseClient.from("training_entries")
      .select("exercise_name, training_date, completed, weight, reps, duration_seconds")
      .eq("user_id", currentUser.id).order("training_date", { ascending: true });
    if (error) throw error;
    renderTrainingProgress(data || []);
  } catch (error) {
    console.error("Trainingsfortschritt konnte nicht geladen werden:", error);
    container.innerHTML = '<p class="card-description">Der Trainingsfortschritt konnte nicht geladen werden. Bitte versuche es später erneut.</p>';
  }
}

function renderTrainingProgress(entries) {
  const container = document.getElementById("trainingProgressCharts");
  if (!container) return;
  const grouped = new Map();
  entries.forEach(entry => {
    if (!grouped.has(entry.exercise_name)) grouped.set(entry.exercise_name, []);
    grouped.get(entry.exercise_name).push(entry);
  });
  const cards = [];
  for (const [name, values] of grouped) {
    const charts = [
      renderMetricChart(values, "weight", "Gewicht", "kg"),
      renderMetricChart(values, "reps", "Wiederholungen", "Wdh."),
      renderMetricChart(values, "duration_seconds", "Dauer", "Sek.")
    ].filter(Boolean);
    if (charts.length) cards.push('<article class="card training-progress-exercise"><div class="section-header"><h4>' +
      escapeHTML(name) + '</h4><span class="tag">' + values.length + ' Einträge</span></div><div class="training-progress-grid">' +
      charts.join("") + '</div></article>');
  }
  container.innerHTML = cards.length ? cards.join("") :
    '<p class="card-description">Noch keine Trainingswerte vorhanden. Trage Gewicht, Wiederholungen oder Dauer ein und speichere sie, dann erscheint hier dein Verlauf.</p>';
}

function renderMetricChart(entries, field, label, unit) {
  const points = entries.filter(entry => entry[field] !== null && entry[field] !== undefined && entry[field] !== "")
    .map(entry => ({ date: entry.training_date, value: Number(entry[field]) }))
    .filter(point => Number.isFinite(point.value)).sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) return "";
  const width = 320, height = 112, padding = 14;
  const min = Math.min(...points.map(point => point.value));
  const max = Math.max(...points.map(point => point.value));
  const range = max - min || 1;
  const chartWidth = width - padding * 2, chartHeight = height - padding * 2;
  const plotted = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? width / 2 : padding + index / (points.length - 1) * chartWidth,
    y: height - padding - (point.value - min) / range * chartHeight
  }));
  const polyline = plotted.map(point => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
  const circles = plotted.map(point => '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4"><title>' +
    escapeHTML(formatDate(point.date)) + ': ' + point.value + ' ' + unit + '</title></circle>').join("");
  const latest = plotted[plotted.length - 1];
  const value = field === "weight" ? latest.value.toFixed(1) : String(latest.value);
  return '<div class="training-metric-chart"><div class="training-chart-heading"><span>' + escapeHTML(label) +
    '</span><strong>' + escapeHTML(value) + ' ' + escapeHTML(unit) + '</strong></div><svg viewBox="0 0 ' + width + ' ' + height +
    '" role="img" aria-label="' + escapeHTML(label) + '-Verlauf für ' + escapeHTML(entries[0]?.exercise_name || "Übung") + '">' +
    '<line x1="' + padding + '" y1="' + (height - padding) + '" x2="' + (width - padding) + '" y2="' + (height - padding) +
    '" class="training-chart-axis"></line><polyline points="' + polyline + '" class="training-chart-line"></polyline>' + circles +
    '</svg><div class="training-chart-dates"><span>' + escapeHTML(formatDate(plotted[0].date)) + '</span><span>' +
    escapeHTML(formatDate(latest.date)) + '</span></div></div>';
}

/* =========================================================
   WEIGHT
========================================================= */

async function addWeight() {
  setInlineStatus("weightStatus", "");

  if (!currentUser || !supabaseClient) {
    setInlineStatus("weightStatus", "Bitte melde dich zuerst an.");
    return;
  }

  const date =
    document
      .getElementById(
        "weightDate"
      )
      ?.value;

  const weight =
    document
      .getElementById(
        "weightValue"
      )
      ?.value;

  if (!date || weight === "" || weight == null) {
    setInlineStatus("weightStatus", "Bitte Datum und Gewicht eingeben.");
    return;
  }

  // Keine zukünftigen Einträge: Sie verfälschen Verlauf und Durchschnitt.
  const today = getLocalDateInputValue();
  if (date > today) {
    setInlineStatus("weightStatus", "Bitte wähle heute oder ein Datum in der Vergangenheit.");
    return;
  }

  const numericWeight = Number(weight);

  if (
    !Number.isFinite(
      numericWeight
    ) ||
    numericWeight <= 0 ||
    numericWeight > 500
  ) {
    setInlineStatus("weightStatus", "Bitte gib ein gültiges Gewicht zwischen 1 und 500 kg ein.");
    return;
  }

  try {

    // Pro Tag nur einen Gewichtswert führen. Ein erneutes Speichern
    // desselben Datums aktualisiert den vorhandenen Eintrag statt Duplikate anzulegen.
    const { data: existingEntry, error: lookupError } = await supabaseClient
      .from("weight_entries")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("date", date)
      .limit(1)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let saveResult;
    if (existingEntry) {
      saveResult = await supabaseClient
        .from("weight_entries")
        .update({ weight: numericWeight })
        .eq("user_id", currentUser.id)
        .eq("id", existingEntry.id);
    } else {
      saveResult = await supabaseClient
        .from("weight_entries")
        .insert({
          user_id: currentUser.id,
          date,
          weight: numericWeight
        });
    }

    const { error } = saveResult;

    if (error) {

      console.error(error);

      setInlineStatus("weightStatus", "Der Gewichtseintrag konnte nicht gespeichert werden. Bitte versuche es erneut.");

      return;
    }

    /*
      Zusätzlich das aktuelle Gewicht
      im Profil aktualisieren.
    */

    const {
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .update({
          Weight:
            numericWeight
        })
        .eq(
          "user_id",
          currentUser.id
        );

    if (profileError) {
      console.warn(
        "Profilgewicht konnte nicht aktualisiert werden:",
        profileError
      );
    }

    if (currentProfile) {
      currentProfile.weight =
        numericWeight;
    }

    const input =
      document.getElementById(
        "weightValue"
      );

    if (input) {
      input.value = "";
    }

    updateDashboard();
    await loadWeights();
    setInlineStatus("weightStatus", "Gewicht erfolgreich gespeichert.", true);

  } catch (error) {
    console.error("Gewichtseintrag konnte nicht verarbeitet werden:", error);
    setInlineStatus("weightStatus", "Der Gewichtseintrag konnte nicht verarbeitet werden. Bitte versuche es erneut.");
  }
}


async function loadWeights() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "weight_entries"
        )
        .select("*")
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "date",
          {
            ascending: false
          }
        );

    if (error) {
      console.error("Gewichtsdaten konnten nicht geladen werden:", error);
      const message = "Gewichtsdaten konnten nicht geladen werden. Bitte prüfe deine Verbindung und versuche es erneut.";
      const list = document.getElementById("weightList");
      const chart = document.getElementById("weightChart");
      const average = document.getElementById("averageWeight");
      const dashboardWeight = document.getElementById("dashboardWeight");
      if (list) list.innerHTML = '<p class="card-description">' + escapeHTML(message) + '</p>';
      if (chart) chart.innerHTML = '<p class="card-description">' + escapeHTML(message) + '</p>';
      if (average) average.textContent = "—";
      if (dashboardWeight) dashboardWeight.textContent = "—";
      return;
    }

    renderWeights(
      data || []
    );

  } catch (error) {
    console.error("Gewichtsdaten konnten nicht geladen werden:", error);
    const list = document.getElementById("weightList");
    const average = document.getElementById("averageWeight");
    if (list) {
      list.innerHTML = '<p class="card-description">Gewichtsdaten konnten nicht geladen werden. Bitte versuche es später erneut.</p>';
    }
    if (average) average.textContent = "—";
  }
}


function renderWeights(
  entries
) {

  const list =
    document.getElementById(
      "weightList"
    );

  const average =
    document.getElementById(
      "averageWeight"
    );

  if (!list || !average) {
    return;
  }

  renderWeightChart(entries);

  if (!entries.length) {
    list.innerHTML = '<p class="card-description">Noch keine Einträge.</p>';
    average.textContent = "—";
    const dashboardWeight = document.getElementById("dashboardWeight");
    if (dashboardWeight) dashboardWeight.textContent = "—";
    return;
  }

  list.innerHTML =
    entries
      .map(
        entry => `
          <div class="weight-row">

            <span>
              ${formatDate(
                entry.date
              )}
            </span>

            <strong>
              ${Number(
                entry.weight
              ).toFixed(1)} kg
            </strong>

          </div>
        `
      )
      .join("");

  const values =
    entries
      .map(
        entry =>
          Number(
            entry.weight
          )
      )
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );

  if (!values.length) {
    average.textContent =
      "—";
    return;
  }

  const avg =
    values.reduce(
      (
        sum,
        value
      ) =>
        sum + value,
      0
    ) /
    values.length;

  average.textContent =
    `${avg.toFixed(1)} kg`;

  const dashboardWeight =
    document.getElementById(
      "dashboardWeight"
    );

  if (dashboardWeight) {
    dashboardWeight.textContent =
      `${values[0].toFixed(1)} kg`;
  }

  if (currentProfile) {
    currentProfile.weight =
      values[0];
  }
}



function renderWeightChart(entries) {
  const container = document.getElementById("weightChart");
  if (!container) return;

  const points = (entries || [])
    .map(entry => ({ date: entry.date, value: Number(entry.weight) }))
    .filter(point => point.date && Number.isFinite(point.value) && point.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!points.length) {
    container.innerHTML = '<p class="card-description">Sobald du mindestens einen Gewichtseintrag speicherst, erscheint hier dein Verlauf.</p>';
    return;
  }

  const width = 720, height = 250, left = 52, right = 22, top = 22, bottom = 42;
  const chartWidth = width - left - right, chartHeight = height - top - bottom;
  const minValue = Math.min(...points.map(point => point.value));
  const maxValue = Math.max(...points.map(point => point.value));
  const paddingValue = Math.max((maxValue - minValue) * 0.18, 0.5);
  const min = Math.max(0, minValue - paddingValue), max = maxValue + paddingValue;
  const range = max - min || 1;
  const plotted = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? left + chartWidth / 2 : left + index / (points.length - 1) * chartWidth,
    y: top + (max - point.value) / range * chartHeight
  }));
  const ticks = [0, 1, 2, 3].map(index => {
    const value = max - range * index / 3, y = top + chartHeight * index / 3;
    return '<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '" class="training-chart-axis" />' +
      '<text x="' + (left - 9) + '" y="' + (y + 4) + '" text-anchor="end" class="weight-chart-label">' + value.toFixed(1) + '</text>';
  }).join("");
  const line = plotted.map(point => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
  const dots = plotted.map(point =>
    '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="5" class="weight-chart-dot"><title>' +
    escapeHTML(formatDate(point.date) + ": " + point.value.toFixed(1) + " kg") + '</title></circle>'
  ).join("");
  const first = plotted[0], last = plotted[plotted.length - 1], delta = last.value - first.value;
  const deltaText = points.length < 2 ? "Erster Eintrag" : (delta > 0 ? "+" : "") + delta.toFixed(1) + " kg seit dem ersten Eintrag";
  container.innerHTML =
    '<div class="weight-chart-summary"><span>' + points.length + (points.length === 1 ? ' Eintrag' : ' Einträge') +
    '</span><strong>' + escapeHTML(deltaText) + '</strong></div>' +
    '<div class="weight-chart-scroll"><svg viewBox="0 0 ' + width + ' ' + height +
    '" role="img" aria-label="Gewichtsverlauf mit ' + points.length + ' gespeicherten Einträgen">' +
    ticks + '<polyline points="' + line + '" class="training-chart-line"></polyline>' + dots +
    '<text x="' + left + '" y="' + (height - 12) + '" class="weight-chart-label">' + escapeHTML(formatDate(first.date)) + '</text>' +
    '<text x="' + (width - right) + '" y="' + (height - 12) + '" text-anchor="end" class="weight-chart-label">' + escapeHTML(formatDate(last.date)) + '</text>' +
    '</svg></div>';
}


/* =========================================================
   FEEDBACK
========================================================= */

function selectRating(
  rating
) {

  selectedRating =
    rating;

  document
    .querySelectorAll(
      "#feedbackRating button"
    )
    .forEach(
      (
        button,
        index
      ) => {

        button.classList.toggle(
          "selected",
          index + 1 ===
            rating
        );

      }
    );
}


async function sendFeedback() {

  if (
    !currentUser ||
    !supabaseClient
  ) {

    const status =
      document.getElementById(
        "feedbackStatus"
      );

    if (status) {
      status.textContent =
        " Bitte melde dich zuerst an.";
    }

    return;
  }

  const input =
    document.getElementById(
      "feedbackMessage"
    );

  const status =
    document.getElementById(
      "feedbackStatus"
    );

  const message =
    input?.value?.trim() ||
    "";

  if (!message) {

    if (status) {
      status.textContent =
        "Bitte schreibe eine Nachricht.";
    }

    return;
  }

  try {

    const {
      error
    } =
      await supabaseClient
        .from("feedback")
        .insert({
          user_id:
            currentUser.id,

          message,

          rating:
            selectedRating ||
            null
        });

    if (error) {

      console.error(
        " Feedback-Fehler:",
        error
      );

      if (status) {
        status.style.color =
          "#ff6b6b";

        status.textContent =
          ` Feedback konnte nicht gespeichert werden: ${error.message}`;
      }

      return;
    }

    if (input) {
      input.value = "";
    }

    selectedRating =
      0;

    selectRating(0);

    if (status) {

      status.textContent =
        " Vielen Dank für dein Feedback!";

      status.style.color =
        "#35d07f";
    }

    await loadFeedback();

  } catch (error) {

    console.error(
      "Feedback-Fehler:",
      error
    );

    if (status) {
      status.textContent =
        " Beim Senden ist ein Fehler aufgetreten.";
    }
  }
}


async function loadFeedback() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("feedback")
        .select("*")
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "id",
          {
            ascending: false
          }
        );

    if (error) {
      console.error(
        "Feedback konnte nicht geladen werden:",
        error
      );
      return;
    }

    renderMyFeedback(
      data || []
    );

  } catch (error) {
    console.error(error);
  }
}


function renderMyFeedback(
  items
) {

  const container =
    document.getElementById(
      "myFeedback"
    );

  if (!container) {
    return;
  }

  if (!items.length) {

    container.innerHTML =
      `
        <p class="card-description">
          Du hast noch kein Feedback gesendet.
        </p>
      `;

    return;
  }

  container.innerHTML =
    items
      .map(
        item => `
          <div class="feedback-item">

            <div class="feedback-meta">
              Bewertung:
              ${
                item.rating ||
                "—"
              }/5
            </div>

            <div>
              ${escapeHTML(
                item.message ||
                  ""
              )}
            </div>

          </div>
        `
      )
      .join("");
}


/* =========================================================
   ADMIN
========================================================= */

let adminAccessGranted = false;
let adminFeedbackCache = [];

function isCurrentUserAdmin() {
  return Boolean(
    currentUser &&
    (
      currentUser.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      adminAccessGranted
    )
  );
}

function setAdminStatus(message, success = false) {
  const element = document.getElementById("adminManagementStatus");
  if (!element) return;
  element.textContent = message || "";
  element.style.color = success ? "var(--green)" : "var(--red)";
}

async function checkAdmin() {
  const buttons = [
    document.getElementById("adminNavButton"),
    document.getElementById("mobileAdminNavButton")
  ].filter(Boolean);

  adminAccessGranted = Boolean(
    currentUser?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  if (currentUser && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("app_admins")
        .select("email")
        .eq("email", currentUser.email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        console.warn("Admin-Berechtigung konnte nicht aus der Datenbank gelesen werden:", error.message);
      } else {
        adminAccessGranted = Boolean(data);
      }
    } catch (error) {
      console.error("Admin-Prüfung fehlgeschlagen:", error);
    }
  }

  buttons.forEach(button => {
    button.classList.toggle("hidden", !isCurrentUserAdmin());
  });

  if (!isCurrentUserAdmin() && document.getElementById("admin")?.classList.contains("active")) {
    showTab("dashboard");
  }
}

function getAdminDisplayName(email, profileByEmail) {
  return profileByEmail.get(String(email || "").trim().toLowerCase()) || "";
}

async function addAdminFromForm(event) {
  event?.preventDefault();
  if (!isCurrentUserAdmin() || !supabaseClient) {
    setAdminStatus("Du hast keine Berechtigung, Administratoren zu verwalten.");
    return;
  }

  const input = document.getElementById("newAdminEmail");
  const email = String(input?.value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAdminStatus("Bitte gib eine gültige E-Mail-Adresse ein.");
    return;
  }

  const button = document.getElementById("addAdminButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Wird hinzugefügt …";
  }
  setAdminStatus("");

  try {
    const { error } = await supabaseClient
      .from("app_admins")
      .insert({ email, added_by: currentUser.id });

    if (error) {
      if (error.code === "23505") {
        setAdminStatus("Diese E-Mail-Adresse ist bereits als Admin eingetragen.");
      } else {
        console.error("Admin konnte nicht hinzugefügt werden:", error);
        setAdminStatus("Admin konnte nicht hinzugefügt werden: " + error.message);
      }
      return;
    }

    if (input) input.value = "";
    setAdminStatus("Administrator wurde hinzugefügt.", true);
    await loadAllFeedback();
  } catch (error) {
    console.error(error);
    setAdminStatus("Beim Hinzufügen ist ein unerwarteter Fehler aufgetreten.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Admin hinzufügen";
    }
  }
}

async function removeAdmin(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!isCurrentUserAdmin() || !supabaseClient) {
    setAdminStatus("Du hast keine Berechtigung, Administratoren zu verwalten.");
    return;
  }
  if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
    setAdminStatus("Das geschützte Hauptkonto kann nicht entfernt werden.");
    return;
  }
  if (!window.confirm("Admin-Berechtigung für " + normalizedEmail + " wirklich entfernen?")) return;

  try {
    const { error } = await supabaseClient
      .from("app_admins")
      .delete()
      .eq("email", normalizedEmail);

    if (error) {
      console.error("Admin konnte nicht entfernt werden:", error);
      setAdminStatus("Admin konnte nicht entfernt werden: " + error.message);
      return;
    }

    setAdminStatus("Admin-Berechtigung wurde entfernt.", true);
    await checkAdmin();
    if (isCurrentUserAdmin()) await loadAllFeedback();
  } catch (error) {
    console.error(error);
    setAdminStatus("Beim Entfernen ist ein unerwarteter Fehler aufgetreten.");
  }
}

function filterAdminFeedback(query = "") {
  const target = document.getElementById("allFeedback");
  if (!target) return;

  const term = String(query).trim().toLocaleLowerCase("de");
  const filtered = adminFeedbackCache.filter(item => {
    const haystack = [
      item.displayName,
      item.email,
      item.message,
      item.rating,
      item.createdLabel
    ].join(" ").toLocaleLowerCase("de");
    return !term || haystack.includes(term);
  });

  if (!filtered.length) {
    target.innerHTML = '<p class="card-description">Keine passenden Feedback-Einträge gefunden.</p>';
    return;
  }

  target.innerHTML = filtered.map(item => `
    <article class="admin-feedback-entry">
      <div class="admin-feedback-entry-head">
        <div>
          <div class="admin-feedback-user">${escapeHTML(item.displayName)}</div>
          ${item.email ? `<div class="admin-feedback-email">${escapeHTML(item.email)}</div>` : ""}
          <div class="admin-feedback-date">${escapeHTML(item.createdLabel)}</div>
        </div>
        <div class="admin-feedback-rating">${item.rating ? escapeHTML(String(item.rating)) + "/5" : "Ohne Bewertung"}</div>
      </div>
      <div class="admin-feedback-message">${escapeHTML(item.message || "Kein Text hinterlegt.")}</div>
    </article>
  `).join("");
}

async function loadAllFeedback() {
  const container = document.getElementById("allFeedback");
  if (!container || !currentUser || !supabaseClient) return;

  if (!isCurrentUserAdmin()) {
    container.innerHTML = '<p class="card-description">Kein Zugriff.</p>';
    return;
  }

  container.innerHTML = '<p class="card-description">Admin-Daten werden geladen …</p>';
  const adminList = document.getElementById("adminList");
  if (adminList) adminList.innerHTML = '<p class="card-description">Administratoren werden geladen …</p>';

  try {
    const [feedbackResult, profilesResult, adminsResult, communityResult] = await Promise.all([
      supabaseClient.from("feedback").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("profiles").select("user_id,Name,email,created_at").order("id", { ascending: false }),
      supabaseClient.from("app_admins").select("email,created_at,added_by").order("created_at", { ascending: true }),
      supabaseClient.from("community_profiles").select("user_id,display_name")
    ]);

    const queryError = feedbackResult.error || profilesResult.error || adminsResult.error || communityResult.error;
    if (queryError) {
      console.error("Admin-Daten konnten nicht vollständig geladen werden:", queryError);
      container.innerHTML = '<p class="card-description">Ein Teil der Admin-Daten konnte nicht geladen werden. Bitte aktualisieren und die Zugriffsregeln prüfen.</p>';
      if (adminList) adminList.innerHTML = '<p class="card-description">Die Admin-Liste konnte nicht geladen werden.</p>';
      return;
    }

    const profiles = profilesResult.data || [];
    const feedback = feedbackResult.data || [];
    const admins = adminsResult.data || [];
    const communityProfiles = communityResult.data || [];
    const profileByUser = new Map();
    const profileByEmail = new Map();
    const communityNameByUser = new Map();

    profiles.forEach(profile => {
      const uid = String(profile.user_id || "");
      const name = String(profile.Name || "").trim();
      const email = String(profile.email || "").trim();
      if (uid && !profileByUser.has(uid) && name) profileByUser.set(uid, name);
      if (email && name && !profileByEmail.has(email.toLowerCase())) profileByEmail.set(email.toLowerCase(), name);
      if (email && !profileByEmail.has(email.toLowerCase())) profileByEmail.set(email.toLowerCase(), email);
    });

    communityProfiles.forEach(profile => {
      const uid = String(profile.user_id || "");
      const name = String(profile.display_name || "").trim();
      if (uid && name) communityNameByUser.set(uid, name);
    });

    const resolveUser = userId => {
      const uid = String(userId || "");
      const profile = profiles.find(item => String(item.user_id || "") === uid);
      const name = profileByUser.get(uid) || communityNameByUser.get(uid) || String(profile?.email || "").trim();
      return { name: name || "Nutzer", email: String(profile?.email || "").trim() };
    };

    const statUsers = document.getElementById("adminStatUsers");
    const statFeedback = document.getElementById("adminStatFeedback");
    const statAdmins = document.getElementById("adminStatAdmins");
    if (statUsers) statUsers.textContent = String(new Set(profiles.map(p => p.user_id).filter(Boolean)).size);
    if (statFeedback) statFeedback.textContent = String(feedback.length);
    if (statAdmins) statAdmins.textContent = String(admins.length);

    if (adminList) {
      if (!admins.length) {
        adminList.innerHTML = '<p class="card-description">Noch keine Administratoren eingetragen.</p>';
      } else {
        adminList.innerHTML = admins.map(admin => {
          const email = String(admin.email || "").trim().toLowerCase();
          const displayName = getAdminDisplayName(email, profileByEmail) || email;
          const isOwner = email === ADMIN_EMAIL.toLowerCase();
          const addedDate = admin.created_at ? new Date(admin.created_at).toLocaleDateString("de-DE") : "";
          return `
            <div class="admin-person-row">
              <div class="admin-person-main">
                <span class="admin-person-name">${escapeHTML(displayName)}</span>
                <span class="admin-person-email">${escapeHTML(email)}</span>
                ${addedDate ? `<span class="admin-person-meta">Hinzugefügt am ${escapeHTML(addedDate)}</span>` : ""}
              </div>
              ${isOwner
                ? '<span class="admin-owner-badge">Hauptadmin · geschützt</span>'
                : `<button type="button" class="admin-remove-btn" onclick="removeAdmin('${escapeHTML(email)}')">Entfernen</button>`}
            </div>`;
        }).join("");
      }
    }

    adminFeedbackCache = feedback.map(item => {
      const user = resolveUser(item.user_id);
      const createdDate = item.created_at ? new Date(item.created_at) : null;
      return {
        displayName: user.name,
        email: user.email,
        message: String(item.message || ""),
        rating: item.rating,
        createdLabel: createdDate && !Number.isNaN(createdDate.getTime())
          ? createdDate.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
          : "Datum unbekannt"
      };
    });

    const search = document.getElementById("adminFeedbackSearch");
    filterAdminFeedback(search?.value || "");
  } catch (error) {
    console.error("Admin-Bereich konnte nicht geladen werden:", error);
    container.innerHTML = '<p class="card-description">Beim Laden ist ein unerwarteter Fehler aufgetreten.</p>';
  }
}


/* =========================================================
   FORMAT AI TEXT
========================================================= */

function formatAIText(
  text
) {

  let safe =
    escapeHTML(text);

  safe =
    safe.replace(
      /\*\*(.*?)\*\*/g,
      "<strong>$1</strong>"
    );

  safe =
    safe.replace(
      /\n/g,
      "<br>"
    );

  return safe;
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================================================
   DATE
========================================================= */

function formatDate(
  dateString
) {

  if (!dateString) {
    return "—";
  }

  const date =
    new Date(
      dateString
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return dateString;
  }

  return date.toLocaleDateString(
    "de-DE"
  );
}


/* =========================================================
   INIT
========================================================= */

function getLocalDateInputValue(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

async function init() {

  const weightDate =
    document.getElementById(
      "weightDate"
    );

  if (weightDate) {
    const today = getLocalDateInputValue();
    weightDate.value = today;
    weightDate.max = today;
  }

  /*
    Supabase starten
  */

  if (!initSupabase()) {
    console.warn(
      "Supabase ist nicht verfügbar."
    );
    return;
  }

  /*
    AI Input vorbereiten
  */

  setupAIInput();

  /*
    Vorhandene Session prüfen
  */

  try {

    const {
      data
    } =
      await supabaseClient.auth.getSession();

    if (
      data?.session?.user
    ) {

      currentUser =
        data.session.user;

      await loadApp();
    }

  } catch (error) {

    console.error(
      "Session konnte nicht geladen werden:",
      error
    );
  }

  /*
    Auth-State überwachen
  */

  supabaseClient.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      if (
        event ===
          "SIGNED_IN" &&
        session?.user
      ) {

        currentUser =
          session.user;

        setTimeout(
          async () => {

            await createProfileIfMissing();
            await loadApp();

          },
          100
        );
      }

      if (
        event ===
        "SIGNED_OUT"
      ) {

        currentUser =
          null;

        currentProfile =
          null;

        document
          .getElementById(
            "app"
          )
          ?.classList.add(
            "hidden"
          );

        document
          .getElementById(
            "authScreen"
          )
          ?.classList.remove(
            "hidden"
          );
      }

    }
  );
}


/* =========================================================
   START
========================================================= */


/* COMMUNITY — echte Inhalte aus Supabase, keine Demo-Beiträge */
const communityState = { feed:"all", channelUserId:null, profiles:[], posts:[], following:new Set(), likes:new Set(), likeCounts:new Map(), comments:[] };
function communityEscape(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
function communityInitials(name){const p=String(name||"FP").trim().split(/\s+/).filter(Boolean);return (p.length>1?p[0][0]+p[1][0]:(p[0]||"FP").slice(0,2)).toUpperCase();}
function communityDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleString("de-DE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});}
function communityStatus(id,message,success=false){const el=document.getElementById(id);if(el){el.textContent=message||"";el.style.color=success?"var(--accent)":"var(--muted)";}}
async function ensureCommunityProfile(){
 if(!supabaseClient||!currentUser)return;
 const name=currentProfile?.name||currentUser.user_metadata?.name||currentUser.email?.split("@")[0]||"Mitglied";
 const {error}=await supabaseClient.from("community_profiles").upsert({user_id:currentUser.id,display_name:String(name).slice(0,40)},{onConflict:"user_id",ignoreDuplicates:true});
 if(error)console.warn("Community-Profil konnte nicht initialisiert werden:",error.message);
}
async function loadCommunity(){
 const feed=document.getElementById("communityFeed");if(!feed)return;
 if(!supabaseClient||!currentUser){feed.innerHTML='<div class="card community-empty"><strong>Bitte anmelden</strong><p>Du musst angemeldet sein, um echte Beiträge zu sehen oder zu veröffentlichen.</p></div>';return;}
 feed.innerHTML='<div class="card community-empty"><span class="community-loading-dot"></span><p>Gespeicherte Beiträge werden geladen …</p></div>';
 try{
  await ensureCommunityProfile();
  const [pr,po,fo,li]=await Promise.all([
   supabaseClient.from("community_profiles").select("user_id,display_name,bio,avatar_url,created_at").order("created_at",{ascending:true}).limit(300),
   supabaseClient.from("community_posts").select("id,user_id,body,image_path,created_at,updated_at").order("created_at",{ascending:false}).limit(60),
   supabaseClient.from("community_follows").select("following_id").eq("follower_id",currentUser.id),
   supabaseClient.from("community_likes").select("post_id").eq("user_id",currentUser.id)
  ]);
  for(const r of [pr,po,fo,li])if(r.error)throw r.error;
  communityState.profiles=pr.data||[];
  communityState.posts=await Promise.all((po.data||[]).map(async post=>{
   if(!post.image_path)return post;
   const {data,error}=await supabaseClient.storage.from("community-images").createSignedUrl(post.image_path,3600);
   if(error){console.warn("Beitragsbild konnte nicht geladen werden:",error.message);return {...post,image_url:null};}
   return {...post,image_url:data?.signedUrl||null};
  }));
  communityState.following=new Set((fo.data||[]).map(x=>x.following_id));
  communityState.likes=new Set((li.data||[]).map(x=>x.post_id));
  const ids=communityState.posts.map(p=>p.id);
  if(ids.length){
   const [commentResult,allLikesResult]=await Promise.all([
    supabaseClient.from("community_comments").select("id,post_id,user_id,body,created_at").in("post_id",ids).order("created_at",{ascending:true}).limit(180),
    supabaseClient.from("community_likes").select("post_id,user_id").in("post_id",ids).limit(1000)
   ]);
   if(commentResult.error)throw commentResult.error;
   if(allLikesResult.error)throw allLikesResult.error;
   communityState.comments=commentResult.data||[];
   communityState.likeCounts=new Map();
   for(const row of allLikesResult.data||[])communityState.likeCounts.set(row.post_id,(communityState.likeCounts.get(row.post_id)||0)+1);
  }else{communityState.comments=[];communityState.likeCounts=new Map();}
  const own=communityState.profiles.find(p=>p.user_id===currentUser.id);
  if(own){
   const n=document.getElementById("communityDisplayName"),b=document.getElementById("communityBio"),a=document.getElementById("communityMyAvatar");
   if(n&&document.activeElement!==n)n.value=own.display_name||"";
   if(b&&document.activeElement!==b)b.value=own.bio||"";
   if(a)a.textContent=communityInitials(own.display_name);
  }
  renderCommunityPeople();renderCommunityFeed();
 }catch(error){
  console.error("Community konnte nicht geladen werden:",error);
  feed.innerHTML='<div class="card community-empty"><strong>Community konnte nicht geladen werden.</strong><p>Die Daten konnten gerade nicht abgerufen werden. Bitte prüfe deine Verbindung und versuche es erneut.</p><button class="secondary-btn" type="button" onclick="loadCommunity()">Erneut versuchen</button></div>';
 }
}
function setCommunityFeed(mode){communityState.feed=mode==="following"?"following":"all";communityState.channelUserId=null;document.querySelectorAll("[data-community-feed]").forEach(b=>b.classList.toggle("active",b.dataset.communityFeed===communityState.feed));const reset=document.getElementById("communityChannelReset");if(reset)reset.hidden=true;const title=document.querySelector(".community-feed-header h3");if(title)title.textContent="Dein Feed";renderCommunityFeed();}
function viewCommunityChannel(userId){if(!userId)return;communityState.channelUserId=userId;communityState.feed="all";document.querySelectorAll("[data-community-feed]").forEach(b=>b.classList.toggle("active",b.dataset.communityFeed==="all"));const reset=document.getElementById("communityChannelReset");if(reset)reset.hidden=false;const profile=communityState.profiles.find(p=>p.user_id===userId);const title=document.querySelector(".community-feed-header h3");if(title)title.textContent="Kanal: "+(profile?.display_name||"Mitglied");renderCommunityFeed();document.getElementById("communityFeed")?.scrollIntoView({behavior:"smooth",block:"start"});}
function communityProfileMap(){return new Map(communityState.profiles.map(p=>[p.user_id,p]));}
function renderCommunityFeed(){
 const feed=document.getElementById("communityFeed");if(!feed)return;
 const map=communityProfileMap();let posts=communityState.posts;
 if(communityState.channelUserId)posts=posts.filter(p=>p.user_id===communityState.channelUserId);
 else if(communityState.feed==="following")posts=posts.filter(p=>communityState.following.has(p.user_id));
 if(!posts.length){const f=communityState.feed==="following";feed.innerHTML='<div class="card community-empty"><strong>'+(communityState.channelUserId?"Dieser Kanal hat noch keine Beiträge.":f?"Noch keine Beiträge von Kanälen, die du abonniert hast.":"Noch keine Beiträge")+'</strong><p>'+(communityState.channelUserId?"Wenn dort Beiträge veröffentlicht werden, erscheinen sie hier.":f?"Abonniere Kanäle, um ihre Beiträge hier zu sehen.":"Sei das erste Mitglied, das einen Beitrag teilt. Hier erscheinen nur erfolgreich gespeicherte Beiträge.")+'</p></div>';return;}
 feed.innerHTML=posts.map(post=>{
  const p=map.get(post.user_id),name=p?.display_name||"Community-Mitglied",mine=post.user_id===currentUser?.id,liked=communityState.likes.has(post.id);
  const comments=communityState.comments.filter(c=>c.post_id===post.id);
  const image=post.image_url||"";
  const commentHtml=comments.map(c=>'<div class="community-comment"><div class="community-avatar" style="width:28px;height:28px;flex-basis:28px;font-size:9px">'+communityEscape(communityInitials(map.get(c.user_id)?.display_name||"FP"))+'</div><div><strong>'+communityEscape(map.get(c.user_id)?.display_name||"Mitglied")+'</strong><span>'+communityEscape(c.body)+'</span></div></div>').join("");
  return '<article class="card community-post" data-post-id="'+communityEscape(post.id)+'"><div class="community-post-head"><div class="community-avatar">'+communityEscape(communityInitials(name))+'</div><div class="community-post-author"><strong>'+communityEscape(name)+'</strong><small>'+communityEscape(communityDate(post.created_at))+'</small></div>'+(mine?'<button class="community-post-menu" type="button" aria-label="Beitrag löschen" title="Beitrag löschen" onclick="deleteCommunityPost(\''+communityEscape(post.id)+'\')">×</button>':'')+'</div>'+(post.body?'<div class="community-post-body">'+communityEscape(post.body)+'</div>':'')+(image?'<img class="community-post-image" src="'+communityEscape(image)+'" alt="Bild zum Community-Beitrag" loading="lazy">':'')+'<div class="community-post-stats">'+(communityState.likeCounts.get(post.id)||0)+' Likes · '+comments.length+' Kommentare</div><div class="community-post-actions"><button type="button" class="'+(liked?"liked":"")+'" onclick="toggleCommunityLike(\''+communityEscape(post.id)+'\')">'+(liked?" Gefällt dir":" Gefällt mir")+'</button><button type="button" onclick="document.getElementById(\'communityComment-'+communityEscape(post.id)+'\')?.focus()">▢ Kommentieren</button>'+(mine?"":'<button type="button" onclick="followCommunityUser(\''+communityEscape(post.user_id)+'\')">'+(communityState.following.has(post.user_id)?"✓ Abonniert":"+ Abonnieren")+'</button>')+'</div><div class="community-comments">'+(commentHtml||'<p class="community-muted">Noch keine Kommentare.</p>')+'<form class="community-comment-form" onsubmit="event.preventDefault();submitCommunityComment(\''+communityEscape(post.id)+'\',this)"><label class="sr-only" for="communityComment-'+communityEscape(post.id)+'">Kommentar schreiben</label><input id="communityComment-'+communityEscape(post.id)+'" name="comment" maxlength="500" placeholder="Schreibe einen Kommentar …" required><button type="submit">Senden</button></form></div></article>';
 }).join("");
}
function renderCommunityPeople(){
 const box=document.getElementById("communityPeople");if(!box)return;
 const people=communityState.profiles.filter(p=>p.user_id!==currentUser?.id),count=document.getElementById("communityMemberCount");
 if(count)count.textContent=String(communityState.profiles.length);
 if(!people.length){box.innerHTML='<p class="community-muted">Noch keine weiteren Kanäle. Sobald andere Nutzer ein Profil angelegt haben, erscheinen ihre echten Kanäle hier.</p>';return;}
 box.innerHTML=people.map(p=>{
  const yes=communityState.following.has(p.user_id),posts=communityState.posts.filter(post=>post.user_id===p.user_id).length;
  return '<div class="community-person"><div class="community-avatar" style="width:36px;height:36px;flex-basis:36px;font-size:11px">'+communityEscape(communityInitials(p.display_name))+'</div><div class="community-person-info"><button type="button" class="community-channel-name" onclick="viewCommunityChannel(\''+communityEscape(p.user_id)+'\')">'+communityEscape(p.display_name||"Mitglied")+'</button><small>'+communityEscape(p.bio||"Fitness-Kanal")+'</small></div><button type="button" class="community-follow-btn '+(yes?"following":"")+'" onclick="followCommunityUser(\''+communityEscape(p.user_id)+'\')">'+(yes?"Abonniert":"Abonnieren")+'</button><small class="community-channel-post-count">'+posts+" Beiträge</small></div>";
 }).join("");
}
async function saveCommunityProfile(){
 if(!supabaseClient||!currentUser){communityStatus("communityProfileStatus","Bitte melde dich zuerst an.");return;}
 const name=document.getElementById("communityDisplayName")?.value.trim()||"",bio=document.getElementById("communityBio")?.value.trim()||"";
 if(!name||name.length>40||bio.length>180){communityStatus("communityProfileStatus","Bitte gib einen Anzeigenamen (1–40 Zeichen) und eine Bio mit höchstens 180 Zeichen ein.");return;}
 const {error}=await supabaseClient.from("community_profiles").upsert({user_id:currentUser.id,display_name:name,bio,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 if(error){console.error(error);communityStatus("communityProfileStatus","Profil konnte nicht gespeichert werden. Bitte erneut versuchen.");return;}
 communityStatus("communityProfileStatus","Community-Profil gespeichert.",true);await loadCommunity();
}
let communitySelectedImage=null,communityPreviewUrl=null;
function previewCommunityImage(event){
 const file=event?.target?.files?.[0]||null,preview=document.getElementById("communityImagePreview"),status=document.getElementById("communityPostStatus");
 communitySelectedImage=null;if(communityPreviewUrl)URL.revokeObjectURL(communityPreviewUrl);communityPreviewUrl=null;
 if(preview){preview.innerHTML="";preview.hidden=true;}if(!file)return;
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)){if(status)status.textContent="Bitte wähle ein JPG-, PNG- oder WebP-Bild.";event.target.value="";return;}
 if(file.size>5*1024*1024){if(status)status.textContent="Das Bild ist größer als 5 MB. Bitte verkleinere es.";event.target.value="";return;}
 communitySelectedImage=file;communityPreviewUrl=URL.createObjectURL(file);
 if(preview){const img=document.createElement("img");img.src=communityPreviewUrl;img.alt="Vorschau des ausgewählten Bildes";const remove=document.createElement("button");remove.type="button";remove.textContent="Bild entfernen";remove.onclick=clearCommunityImage;preview.append(img,remove);preview.hidden=false;}
 if(status)status.textContent="";
}
function clearCommunityImage(){communitySelectedImage=null;if(communityPreviewUrl)URL.revokeObjectURL(communityPreviewUrl);communityPreviewUrl=null;const i=document.getElementById("communityImageInput"),p=document.getElementById("communityImagePreview");if(i)i.value="";if(p){p.innerHTML="";p.hidden=true;}}
async function publishCommunityPost(){
 const text=document.getElementById("communityPostText")?.value.trim()||"",status="communityPostStatus",button=document.getElementById("communityPublishBtn");
 if(!supabaseClient||!currentUser){communityStatus(status,"Bitte melde dich an, bevor du etwas veröffentlichst.");return;}
 if(!text&&!communitySelectedImage){communityStatus(status,"Schreibe etwas oder füge ein Bild hinzu.");return;}
 if(text.length>1200){communityStatus(status,"Dein Beitrag darf höchstens 1.200 Zeichen enthalten.");return;}
 if(button){button.disabled=true;button.textContent="Wird veröffentlicht …";}communityStatus(status,"Beitrag wird gespeichert …",true);
 let imagePath=null;
 try{
  if(communitySelectedImage){const file=communitySelectedImage,ext=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp"})[file.type];imagePath=currentUser.id+"/"+Date.now()+"-"+crypto.randomUUID()+"."+ext;
   const {error}=await supabaseClient.storage.from("community-images").upload(imagePath,file,{contentType:file.type,cacheControl:"3600",upsert:false});if(error)throw error;}
  const {error}=await supabaseClient.from("community_posts").insert({user_id:currentUser.id,body:text,image_path:imagePath});
  if(error){if(imagePath)await supabaseClient.storage.from("community-images").remove([imagePath]);throw error;}
  const el=document.getElementById("communityPostText");if(el)el.value="";clearCommunityImage();communityStatus(status,"Beitrag erfolgreich veröffentlicht.",true);await loadCommunity();
 }catch(error){console.error("Community-Beitrag konnte nicht gespeichert werden:",error);communityStatus(status,"Nicht veröffentlicht: Der Beitrag konnte nicht gespeichert werden. Bitte erneut versuchen.");}
 finally{if(button){button.disabled=false;button.textContent="Beitrag veröffentlichen";}}
}
async function toggleCommunityLike(postId){
 if(!supabaseClient||!currentUser)return;const yes=communityState.likes.has(postId);
 const result=yes?await supabaseClient.from("community_likes").delete().eq("post_id",postId).eq("user_id",currentUser.id):await supabaseClient.from("community_likes").insert({post_id:postId,user_id:currentUser.id});
 if(result.error){console.error("Like konnte nicht gespeichert werden:",result.error);alert("Das Like konnte nicht gespeichert werden. Bitte erneut versuchen.");return;}
 if(yes){communityState.likes.delete(postId);communityState.likeCounts.set(postId,Math.max(0,(communityState.likeCounts.get(postId)||0)-1));}else{communityState.likes.add(postId);communityState.likeCounts.set(postId,(communityState.likeCounts.get(postId)||0)+1);}renderCommunityFeed();
}
async function followCommunityUser(userId){
 if(!supabaseClient||!currentUser||!userId||userId===currentUser.id)return;const yes=communityState.following.has(userId);
 const result=yes?await supabaseClient.from("community_follows").delete().eq("follower_id",currentUser.id).eq("following_id",userId):await supabaseClient.from("community_follows").insert({follower_id:currentUser.id,following_id:userId});
 if(result.error){console.error("Follow-Aktion fehlgeschlagen:",result.error);alert("Das Folgen konnte nicht gespeichert werden. Bitte erneut versuchen.");return;}
 if(yes)communityState.following.delete(userId);else communityState.following.add(userId);renderCommunityPeople();renderCommunityFeed();
}
async function submitCommunityComment(postId,form){
 if(!supabaseClient||!currentUser)return;const input=form?.elements?.comment,body=input?.value.trim()||"";if(!body||body.length>500)return;
 const button=form.querySelector("button[type='submit']");if(button){button.disabled=true;button.textContent="…";}
 const {error}=await supabaseClient.from("community_comments").insert({post_id:postId,user_id:currentUser.id,body});
 if(error){console.error("Kommentar konnte nicht gespeichert werden:",error);alert("Der Kommentar wurde nicht gespeichert. Bitte erneut versuchen.");if(button){button.disabled=false;button.textContent="Senden";}return;}
 await loadCommunity();
}
async function deleteCommunityPost(postId){
 if(!supabaseClient||!currentUser)return;const post=communityState.posts.find(p=>p.id===postId);if(!post||post.user_id!==currentUser.id)return;
 if(!confirm("Diesen Beitrag wirklich löschen?"))return;
 const {error}=await supabaseClient.from("community_posts").delete().eq("id",postId).eq("user_id",currentUser.id);
 if(error){console.error("Beitrag konnte nicht gelöscht werden:",error);alert("Der Beitrag konnte nicht gelöscht werden. Bitte erneut versuchen.");return;}
 if(post.image_path){const {error:imageError}=await supabaseClient.storage.from("community-images").remove([post.image_path]);if(imageError)console.warn("Beitragsbild konnte nicht entfernt werden:",imageError.message);}
 await loadCommunity();
}


/* CUSTOM ACTIVITY TIMERS — presets are saved on this device */
const CUSTOM_TIMERS_KEY = "fitnessAiPro.customTimers.v1";
let customTimerPresets = [];
let customTimerActiveId = "builtin-plank-rest";
let customTimerDuration = 60;
let customTimerRemaining = 60;
let customTimerInterval = null;
let customTimerEndsAt = 0;
let customTimerRunning = false;
function allCustomTimerPresets(){
 const builtins=[
  {id:"builtin-plank-rest",name:"Pause zwischen Planks",seconds:60,builtin:true},
  {id:"builtin-plank",name:"Plank halten",seconds:30,builtin:true},
  {id:"builtin-stretch",name:"Dehnen",seconds:45,builtin:true},
  {id:"builtin-water",name:"Kurze Erholung",seconds:90,builtin:true}
 ];
 return [...builtins,...customTimerPresets];
}
function loadCustomTimerPresets(){
 try{customTimerPresets=JSON.parse(localStorage.getItem(CUSTOM_TIMERS_KEY)||"[]");if(!Array.isArray(customTimerPresets))customTimerPresets=[];}catch(e){customTimerPresets=[];}
 renderCustomTimerPresets();
 selectCustomTimer(customTimerActiveId,false);
}
function escapeTimerText(value){
 return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function formatCustomTimer(seconds){
 const n=Math.max(0,Math.floor(Number(seconds)||0));
 return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
}
function renderCustomTimerPresets(){
 const box=document.getElementById("customTimerPresets");if(!box)return;
 box.innerHTML=allCustomTimerPresets().map(p=>{
  const active=p.id===customTimerActiveId;
  return '<div class="timer-preset '+(active?"active":"")+'"><button type="button" class="timer-preset" style="border:0;flex:1" onclick="selectCustomTimer(\''+escapeTimerText(p.id)+'\')"><span class="timer-preset-icon">'+(p.id.includes("plank")?"Ⅱ":p.id.includes("stretch")?"":"◷")+'</span><span class="timer-preset-copy"><strong>'+escapeTimerText(p.name)+'</strong><small>'+formatCustomTimer(p.seconds)+'</small></span></button>'+(p.builtin?"":'<button type="button" class="timer-preset-delete" aria-label="Timer löschen" onclick="deleteCustomTimerPreset(\''+escapeTimerText(p.id)+'\')"><span aria-hidden="true">×</span><span>Löschen</span></button>')+'</div>';
 }).join("");
}
function stopCustomTimerInterval(){
 if(customTimerInterval){clearInterval(customTimerInterval);customTimerInterval=null;}
 customTimerRunning=false;customTimerEndsAt=0;
}
function updateCustomTimerDisplay(){
 const display=document.getElementById("customTimerDisplay");
 const bar=document.getElementById("customTimerProgress");
 const start=document.getElementById("customTimerStart");
 if(display)display.textContent=formatCustomTimer(customTimerRemaining);
 if(bar)bar.style.width=(customTimerDuration?Math.max(0,Math.min(100,customTimerRemaining/customTimerDuration*100)):0)+"%";
 if(start)start.textContent=customTimerRunning?"Pause":"Start";
}
function selectCustomTimer(id,rerender=true){
 const preset=allCustomTimerPresets().find(p=>p.id===id);if(!preset)return;
 stopCustomTimerInterval();customTimerActiveId=preset.id;customTimerDuration=preset.seconds;customTimerRemaining=preset.seconds;
 const name=document.getElementById("customTimerName");
 const status=document.getElementById("customTimerStatus");
 if(name)name.textContent=preset.name;
 if(status)status.textContent="Bereit, wenn du es bist.";
 updateCustomTimerDisplay();
 if(rerender)renderCustomTimerPresets();
}
function toggleCustomTimer(){
 const status=document.getElementById("customTimerStatus");
 if(customTimerRunning){
  customTimerRemaining=Math.max(0,Math.ceil((customTimerEndsAt-Date.now())/1000));
  stopCustomTimerInterval();if(status)status.textContent="Timer pausiert.";updateCustomTimerDisplay();return;
 }
 if(customTimerRemaining<=0)customTimerRemaining=customTimerDuration;
 if(customTimerRemaining<=0){if(status)status.textContent="Bitte stelle eine Zeit größer als 0 ein.";return;}
 customTimerRunning=true;customTimerEndsAt=Date.now()+customTimerRemaining*1000;
 if(status)status.textContent="Läuft …";updateCustomTimerDisplay();
 customTimerInterval=setInterval(()=>{
  customTimerRemaining=Math.max(0,Math.ceil((customTimerEndsAt-Date.now())/1000));updateCustomTimerDisplay();
  if(customTimerRemaining<=0){
   stopCustomTimerInterval();updateCustomTimerDisplay();if(status)status.textContent="Zeit ist um.";
   try{if("vibrate" in navigator)navigator.vibrate([180,80,180]);}catch(e){}
  }
 },200);
}
function resetCustomTimer(){
 stopCustomTimerInterval();customTimerRemaining=customTimerDuration;
 const status=document.getElementById("customTimerStatus");if(status)status.textContent="Timer zurückgesetzt.";
 updateCustomTimerDisplay();
}
function saveCustomTimerPreset(){
 const name=document.getElementById("customTimerLabel")?.value.trim()||"";
 const minutes=Number(document.getElementById("customTimerMinutes")?.value);
 const seconds=Number(document.getElementById("customTimerSeconds")?.value);
 const status=document.getElementById("customTimerFormStatus");
 const total=minutes*60+seconds;
 if(!name||name.length>50||!Number.isFinite(total)||total<1||total>10800||!Number.isInteger(minutes)||!Number.isInteger(seconds)||minutes<0||seconds<0||seconds>59){
  if(status)status.textContent="Bitte Name und eine gültige Zeit zwischen 1 Sekunde und 3 Stunden eingeben.";return;
 }
 const preset={id:"custom-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),name,seconds:total};
 customTimerPresets.push(preset);localStorage.setItem(CUSTOM_TIMERS_KEY,JSON.stringify(customTimerPresets));
 const form=document.getElementById("customTimerForm");if(form)form.reset();
 const mins=document.getElementById("customTimerMinutes"),secs=document.getElementById("customTimerSeconds");
 if(mins)mins.value="1";if(secs)secs.value="0";if(status)status.textContent="Timer gespeichert.";
 customTimerActiveId=preset.id;renderCustomTimerPresets();selectCustomTimer(preset.id,false);
}
function deleteCustomTimerPreset(id){
 if(!customTimerPresets.some(p=>p.id===id))return;
 if(!confirm("Diesen eigenen Timer löschen?"))return;
 customTimerPresets=customTimerPresets.filter(p=>p.id!==id);
 localStorage.setItem(CUSTOM_TIMERS_KEY,JSON.stringify(customTimerPresets));
 if(customTimerActiveId===id)customTimerActiveId="builtin-plank-rest";
 loadCustomTimerPresets();
}
function showSettingsSection(name){
 document.querySelectorAll("[data-settings-target]").forEach(button=>button.classList.toggle("active",button.dataset.settingsTarget===name));
 document.querySelectorAll("[data-settings-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.settingsPanel===name));
}

document.addEventListener("DOMContentLoaded", loadCustomTimerPresets);
document.addEventListener(
  "DOMContentLoaded",
  init
);