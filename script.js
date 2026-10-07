// ======================================================
// FITNESS AI PRO
// ======================================================

// ------------------------------------------------------
// GEMINI
// ------------------------------------------------------

// HIER DEINEN GEMINI API KEY EINTRAGEN
const GEMINI_API_KEY = "AQ.Ab8RN6J0m0ctfLgZbTnFDlebdpjiveGBeS2y0Sb7xVp67YsZwA";

// Aktuelles Gemini-Modell für schnelle Antworten
const GEMINI_MODEL = "gemini-2.5-flash";


// ------------------------------------------------------
// SUPABASE
// ------------------------------------------------------

const SUPABASE_URL = "https://qnouktkkbrwcdzgaqthi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sdHv-8wTkJ5s9WQQp88A8Q_ZyNKHm5t";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ------------------------------------------------------
// GLOBAL
// ------------------------------------------------------

let currentUser = null;
let currentProfile = null;
let weightEntries = [];
let feedbackEntries = [];


// ------------------------------------------------------
// HILFSFUNKTIONEN
// ------------------------------------------------------

function setStatus(message) {
  document.getElementById("status").textContent = message;
  document.getElementById("error").textContent = "";
}

function setError(message) {
  document.getElementById("error").textContent = message;
  document.getElementById("status").textContent = "";
}


// ------------------------------------------------------
// REGISTRIEREN
// ------------------------------------------------------

async function registerUser() {

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  if (!name || !email || !password) {
    setError("Bitte fülle alle Felder aus.");
    return;
  }

  if (password.length < 6) {
    setError("Das Passwort muss mindestens 6 Zeichen haben.");
    return;
  }

  setStatus("Konto wird erstellt...");

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name
      }
    }
  });

  if (error) {
    setError(error.message);
    return;
  }

  if (!data.user) {
    setError("Konto konnte nicht erstellt werden.");
    return;
  }

  currentUser = data.user;

  await createProfile(
    data.user.id,
    name,
    email
  );

  setStatus(
    "Konto erstellt! Falls E-Mail-Bestätigung aktiviert ist, bestätige zuerst deine E-Mail."
  );
}


// ------------------------------------------------------
// LOGIN
// ------------------------------------------------------

async function loginUser() {

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    setError("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  setStatus("Einloggen...");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    setError(error.message);
    return;
  }

  currentUser = data.user;

  await loadApp();

}


// ------------------------------------------------------
// LOGOUT
// ------------------------------------------------------

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;

  document.getElementById("appSection").classList.add("hidden");
  document.getElementById("authSection").classList.remove("hidden");
}


// ------------------------------------------------------
// PROFIL ERSTELLEN
// ------------------------------------------------------

async function createProfile(userId, name, email) {

  const { error } = await supabaseClient
    .from("profiles")
    .insert({
      id: userId,
      name: name,
      email: email
    });

  if (error) {
    console.log("Profil konnte nicht erstellt werden:", error);
  }
}


// ------------------------------------------------------
// APP LADEN
// ------------------------------------------------------

async function loadApp() {

  if (!currentUser) return;

  document.getElementById("authSection").classList.add("hidden");
  document.getElementById("appSection").classList.remove("hidden");

  await loadProfile();
  await loadWeights();
  await loadFeedback();

  renderExercises();
}


// ------------------------------------------------------
// PROFIL LADEN
// ------------------------------------------------------

async function loadProfile() {

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.log(error);
    return;
  }

  currentProfile = data;

  if (!currentProfile) return;

  document.getElementById("userName").textContent =
    currentProfile.name || "Nutzer";

  if (currentProfile.training_location) {
    document.getElementById("trainingLocation").value =
      currentProfile.training_location;
  }

  if (currentProfile.goal) {
    document.getElementById("fitnessGoal").value =
      currentProfile.goal;
  }

  updateDashboard();
}


// ------------------------------------------------------
// PROFIL SPEICHERN
// ------------------------------------------------------

async function saveProfile() {

  if (!currentUser) return;

  const trainingLocation =
    document.getElementById("trainingLocation").value;

  const goal =
    document.getElementById("fitnessGoal").value;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      training_location: trainingLocation,
      goal: goal
    })
    .eq("id", currentUser.id);

  if (error) {
    setError(error.message);
    return;
  }

  currentProfile.training_location = trainingLocation;
  currentProfile.goal = goal;

  renderExercises();

  alert("Einstellungen gespeichert.");
}


// ------------------------------------------------------
// TABS
// ------------------------------------------------------

function showTab(tabName, button) {

  document.querySelectorAll(".tab-content")
    .forEach(tab => tab.classList.remove("active"));

  document.querySelectorAll(".tab")
    .forEach(tab => tab.classList.remove("active"));

  document.getElementById(tabName)
    .classList.add("active");

  if (button) {
    button.classList.add("active");
  }
}


// ------------------------------------------------------
// TRAINING
// ------------------------------------------------------

const homeExercises = [
  {
    name: "Liegestütze",
    description: "Hände ungefähr schulterbreit aufstellen und den Körper gerade halten.",
    muscles: "Brust, Schulter, Trizeps"
  },
  {
    name: "Kniebeugen",
    description: "Füße ungefähr schulterbreit. Knie kontrolliert beugen und wieder aufrichten.",
    muscles: "Beine, Po"
  },
  {
    name: "Plank",
    description: "Körper gerade halten und Bauch aktiv anspannen.",
    muscles: "Bauch, Core"
  },
  {
    name: "Ausfallschritte",
    description: "Einen großen Schritt nach vorne machen und kontrolliert absenken.",
    muscles: "Beine, Po"
  }
];

const gymExercises = [
  {
    name: "Brustpresse",
    description: "Sitz einstellen, Rücken anlehnen und die Griffe kontrolliert nach vorne drücken.",
    muscles: "Brust, Trizeps"
  },
  {
    name: "Latzug",
    description: "Stange kontrolliert zur oberen Brust ziehen und langsam zurückführen.",
    muscles: "Rücken, Bizeps"
  },
  {
    name: "Beinpresse",
    description: "Füße stabil aufstellen und das Gewicht kontrolliert bewegen.",
    muscles: "Beine, Po"
  },
  {
    name: "Schulterpresse",
    description: "Gewicht kontrolliert nach oben drücken und langsam absenken.",
    muscles: "Schultern, Trizeps"
  }
];


function renderExercises() {

  const location =
    document.getElementById("trainingLocation").value;

  const exercises =
    location === "gym"
      ? gymExercises
      : homeExercises;

  document.getElementById("trainingDescription").textContent =
    location === "gym"
      ? "Übungen für das Fitnessstudio."
      : "Übungen, die du zu Hause machen kannst.";

  const container =
    document.getElementById("exerciseList");

  container.innerHTML = "";

  exercises.forEach(exercise => {

    const searchUrl =
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(
        exercise.name + " Übung richtig ausführen"
      );

    container.innerHTML += `
      <div class="exercise">
        <h3>${exercise.name}</h3>

        <p>${exercise.description}</p>

        <p style="margin:8px 0;">
          <strong>Muskelgruppen:</strong>
          ${exercise.muscles}
        </p>

        <a href="${searchUrl}" target="_blank">
          🎥 Übungsvideo ansehen
        </a>
      </div>
    `;
  });
}


// ------------------------------------------------------
// GEWICHT
// ------------------------------------------------------

async function addWeight() {

  if (!currentUser) return;

  const date =
    document.getElementById("weightDate").value;

  const weight =
    Number(document.getElementById("weightValue").value);

  if (!date || !weight) {
    alert("Bitte Datum und Gewicht eingeben.");
    return;
  }

  const { error } = await supabaseClient
    .from("weight_entries")
    .insert({
      user_id: currentUser.id,
      date,
      weight
    });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("weightValue").value = "";

  await loadWeights();
}


async function loadWeights() {

  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("weight_entries")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("date", { ascending: false });

  if (error) {
    console.log("Gewicht:", error);
    return;
  }

  weightEntries = data || [];

  renderWeights();
  updateDashboard();
}


function renderWeights() {

  const list =
    document.getElementById("weightList");

  if (!weightEntries.length) {

    list.innerHTML =
      "<p>Noch keine Werte eingetragen.</p>";

    document.getElementById("averageWeight").textContent = "–";

    return;
  }

  list.innerHTML = weightEntries.map(entry => `
    <div class="meal">
      <strong>${entry.date}</strong>
      <span>${entry.weight} kg</span>
    </div>
  `).join("");

  const average =
    weightEntries.reduce(
      (sum, item) => sum + Number(item.weight),
      0
    ) / weightEntries.length;

  document.getElementById("averageWeight").textContent =
    average.toFixed(1) + " kg";
}


// ------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------

function updateDashboard() {

  const location =
    document.getElementById("trainingLocation").value;

  document.getElementById("dashboardTraining").textContent =
    location === "gym"
      ? "Fitnessstudio"
      : "Zuhause";

  if (weightEntries.length) {

    const latest = weightEntries[0];

    document.getElementById("dashboardWeight").textContent =
      latest.weight + " kg";

  } else {

    document.getElementById("dashboardWeight").textContent =
      "–";
  }

  document.getElementById("dashboardFeedback").textContent =
    feedbackEntries.length;
}


// ------------------------------------------------------
// GEMINI
// ------------------------------------------------------

async function askGemini(prompt) {

  if (
    !GEMINI_API_KEY ||
    GEMINI_API_KEY === "DEIN_GEMINI_API_KEY"
  ) {
    throw new Error("Bitte zuerst deinen Gemini API-Key in script.js eintragen.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      "Gemini konnte keine Antwort liefern."
    );
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Keine Antwort erhalten."
  );
}


// ------------------------------------------------------
// ERNÄHRUNG KI
// ------------------------------------------------------

async function askNutritionAI() {

  const userPrompt =
    document.getElementById("nutritionPrompt").value.trim();

  if (!userPrompt) {
    alert("Bitte schreibe zuerst deine Frage.");
    return;
  }

  const result =
    document.getElementById("nutritionResult");

  result.innerHTML = "🤖 KI denkt nach...";

  try {

    const prompt = `
Du bist der Ernährungsassistent von FITNESS AI PRO.

Der Nutzer ist minderjährig.
Gib deshalb keine Crash-Diäten, keine extremen Kalorienziele
und keine gefährlichen Abnehmempfehlungen.

Fokus:
- ausgewogene Ernährung
- genügend Energie
- Protein
- Obst und Gemüse
- Vollkornprodukte
- ausreichend trinken
- altersgerechte, gesunde Gewohnheiten

Nutzerfrage:
${userPrompt}

Antworte übersichtlich auf Deutsch.
`;

    const answer =
      await askGemini(prompt);

    result.innerHTML =
      `<div class="meal">${formatAIText(answer)}</div>`;

    // Versuchen, einen Mahlzeitenplan zu erkennen
    document.getElementById("mealPlan").innerHTML =
      `<div class="meal">${formatAIText(answer)}</div>`;

  } catch (error) {

    result.innerHTML =
      `<p style="color:#ff7777">${escapeHTML(error.message)}</p>`;
  }
}


// ------------------------------------------------------
// SHOPPING LISTE
// ------------------------------------------------------

async function createShoppingList() {

  const mealPlan =
    document.getElementById("mealPlan").innerText;

  if (
    !mealPlan ||
    mealPlan.includes("Noch kein Mahlzeitenplan")
  ) {
    alert("Erstelle zuerst einen Mahlzeitenplan.");
    return;
  }

  const container =
    document.getElementById("shoppingList");

  container.innerHTML =
    "🛒 Einkaufsliste wird erstellt...";

  try {

    const prompt = `
Erstelle aus diesem Mahlzeitenplan eine einfache Einkaufsliste.

Gruppiere die Lebensmittel nach:
- Obst & Gemüse
- Milchprodukte
- Getreide
- Proteinquellen
- Sonstiges

Mahlzeitenplan:
${mealPlan}

Gib nur die Einkaufsliste aus.
`;

    const answer =
      await askGemini(prompt);

    container.innerHTML =
      `<div class="meal">${formatAIText(answer)}</div>`;

  } catch (error) {

    container.innerHTML =
      `<p style="color:#ff7777">${escapeHTML(error.message)}</p>`;
  }
}


// ------------------------------------------------------
// FEEDBACK
// ------------------------------------------------------

async function sendFeedback() {

  if (!currentUser) return;

  const message =
    document.getElementById("feedbackMessage").value.trim();

  const rating =
    Number(document.getElementById("feedbackRating").value);

  if (!message) {
    alert("Bitte schreibe zuerst dein Feedback.");
    return;
  }

  const { error } = await supabaseClient
    .from("feedback")
    .insert({
      user_id: currentUser.id,
      message,
      rating
    });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("feedbackMessage").value = "";

  await loadFeedback();

  alert("Danke für dein Feedback! ❤️");
}


async function loadFeedback() {

  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("feedback")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Feedback:", error);
    return;
  }

  feedbackEntries = data || [];

  renderMyFeedback();
  updateDashboard();

  // Admin-Ansicht versuchen
  checkAdmin();
}


function renderMyFeedback() {

  const container =
    document.getElementById("myFeedback");

  if (!feedbackEntries.length) {

    container.innerHTML =
      "<p>Noch kein Feedback abgegeben.</p>";

    return;
  }

  container.innerHTML =
    feedbackEntries.map(item => `
      <div class="feedback-item">
        <strong>${"⭐".repeat(item.rating || 0)}</strong>
        <p>${escapeHTML(item.message)}</p>
        <small>${item.created_at || ""}</small>
      </div>
    `).join("");
}


// ------------------------------------------------------
// ADMIN
// ------------------------------------------------------

async function checkAdmin() {

  if (!currentUser) return;

  // Hier deine Admin-E-Mail eintragen.
  const ADMIN_EMAIL = "DEINE_ADMIN_EMAIL";

  if (
    currentUser.email !== ADMIN_EMAIL ||
    ADMIN_EMAIL === "DEINE_ADMIN_EMAIL"
  ) {
    return;
  }

  document.getElementById("adminTab")
    .classList.remove("hidden");

  await loadAllFeedback();
}


async function loadAllFeedback() {

  const { data, error } =
    await supabaseClient
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("allFeedback").innerHTML =
      `<p>${escapeHTML(error.message)}</p>`;
    return;
  }

  const container =
    document.getElementById("allFeedback");

  if (!data || !data.length) {
    container.innerHTML =
      "<p>Noch kein Feedback vorhanden.</p>";
    return;
  }

  container.innerHTML =
    data.map(item => `
      <div class="feedback-item">
        <strong>${"⭐".repeat(item.rating || 0)}</strong>
        <p>${escapeHTML(item.message)}</p>
        <small>${item.created_at || ""}</small>
      </div>
    `).join("");
}


// ------------------------------------------------------
// FORMATIERUNG
// ------------------------------------------------------

function formatAIText(text) {

  return escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}


function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ------------------------------------------------------
// START
// ------------------------------------------------------

async function init() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();

  if (session?.user) {

    currentUser = session.user;

    await loadApp();

  } else {

    document.getElementById("authSection")
      .classList.remove("hidden");

  }

  document.getElementById("weightDate").value =
    new Date().toISOString().split("T")[0];
}


document
  .getElementById("trainingLocation")
  ?.addEventListener(
    "change",
    renderExercises
  );


init();
