/* =========================================================
   FITNESS AI PRO
   Frontend
   ========================================================= */

// ---------------------------------------------------------
// SUPABASE
// ---------------------------------------------------------

const SUPABASE_URL = "DEINE_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "DEIN_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

let currentUser = null;
let profile = null;
let weightEntries = [];
let shoppingItems = [];
let feedbackItems = [];
let trainingLocation = "home";
let authMode = "login";

// ---------------------------------------------------------
// START
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("weightDate").value =
    new Date().toISOString().split("T")[0];

  supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      currentUser = session.user;
      await enterApp();
    } else {
      currentUser = null;
      showAuth();
    }
  });

  const { data } = await supabaseClient.auth.getSession();

  if (data?.session?.user) {
    currentUser = data.session.user;
    await enterApp();
  } else {
    showAuth();
  }
});

// ---------------------------------------------------------
// AUTH
// ---------------------------------------------------------

function switchAuth(mode) {
  authMode = mode;

  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const nameField = document.getElementById("nameField");
  const title = document.getElementById("authTitle");
  const submit = document.getElementById("authSubmit");
  const forgot = document.getElementById("forgotPassword");

  if (mode === "login") {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    nameField.classList.add("hidden");
    title.textContent = "Willkommen zurück";
    submit.textContent = "Einloggen";
    forgot.classList.remove("hidden");
  } else {
    loginTab.classList.remove("active");
    registerTab.classList.add("active");
    nameField.classList.remove("hidden");
    title.textContent = "Account erstellen";
    submit.textContent = "Registrieren";
    forgot.classList.add("hidden");
  }

  clearAuthMessage();
}

document.getElementById("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const name = document.getElementById("authName").value.trim();

  if (!email || !password) {
    showAuthMessage("Bitte E-Mail und Passwort eingeben.", "error");
    return;
  }

  if (authMode === "register" && password.length < 6) {
    showAuthMessage("Das Passwort muss mindestens 6 Zeichen haben.", "error");
    return;
  }

  setAuthLoading(true);

  try {
    if (authMode === "register") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        showAuthMessage("Account erstellt.", "success");
      } else {
        showAuthMessage(
          "Account erstellt. Bitte bestätige deine E-Mail-Adresse.",
          "success"
        );
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    }
  } catch (error) {
    showAuthMessage(error.message || "Anmeldung fehlgeschlagen.", "error");
  } finally {
    setAuthLoading(false);
  }
});

async function resetPassword() {
  const email = document.getElementById("authEmail").value.trim();

  if (!email) {
    showAuthMessage("Gib zuerst deine E-Mail-Adresse ein.", "error");
    return;
  }

  const redirectUrl = `${window.location.origin}/`;

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl
  });

  if (error) {
    showAuthMessage(error.message, "error");
  } else {
    showAuthMessage(
      "Wenn die Adresse registriert ist, wurde eine E-Mail zum Zurücksetzen verschickt.",
      "success"
    );
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
}

function showAuth() {
  document.getElementById("authScreen").classList.remove("hidden");
  document.getElementById("app").classList.add("hidden");
}

function showAuthMessage(message, type) {
  const element = document.getElementById("authMessage");
  element.textContent = message;
  element.className = `message show ${type}`;
}

function clearAuthMessage() {
  const element = document.getElementById("authMessage");
  element.className = "message";
  element.textContent = "";
}

function setAuthLoading(loading) {
  const button = document.getElementById("authSubmit");
  button.disabled = loading;
  button.textContent = loading
    ? "Bitte warten..."
    : authMode === "login"
      ? "Einloggen"
      : "Registrieren";
}

// ---------------------------------------------------------
// APP START
// ---------------------------------------------------------

async function enterApp() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("userEmail").textContent =
    currentUser.email || "";

  document.getElementById("profileEmail").textContent =
    currentUser.email || "";

  await loadProfile();
  await loadWeights();
  await loadShopping();
  await loadFeedback();
  await checkAdmin();
  updateDashboard();
}

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  profile = data;

  if (!profile) {
    const metadataName =
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "Athlet";

    const newProfile = {
      id: currentUser.id,
      name: metadataName,
      age: null,
      weight: null,
      height: null,
      goal: "fitness",
      diet: "",
      training_location: "home"
    };

    const { data: created, error: createError } = await supabaseClient
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (!createError) {
      profile = created;
    } else {
      console.error(createError);
    }
  }

  if (!profile) return;

  document.getElementById("profileName").value = profile.name || "";
  document.getElementById("profileAge").value = profile.age || "";
  document.getElementById("profileHeight").value = profile.height || "";
  document.getElementById("profileLocation").value =
    profile.training_location || "home";
  document.getElementById("profileGoal").value =
    profile.goal || "fitness";
  document.getElementById("profileDiet").value =
    profile.diet || "";

  selectTrainingLocation(
    profile.training_location || "home",
    false
  );
}

async function saveProfile() {
  if (!currentUser) return;

  const updatedProfile = {
    id: currentUser.id,
    name: document.getElementById("profileName").value.trim(),
    age: Number(document.getElementById("profileAge").value) || null,
    height: Number(document.getElementById("profileHeight").value) || null,
    goal: document.getElementById("profileGoal").value,
    diet: document.getElementById("profileDiet").value.trim(),
    training_location: document.getElementById("profileLocation").value
  };

  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert(updatedProfile)
    .select()
    .single();

  const status = document.getElementById("profileStatus");

  if (error) {
    status.textContent = error.message;
    status.className = "message show error";
    return;
  }

  profile = data;

  selectTrainingLocation(profile.training_location, false);
  updateDashboard();

  status.textContent = "Profil gespeichert.";
  status.className = "message show success";
}

// ---------------------------------------------------------
// NAVIGATION
// ---------------------------------------------------------

function showSection(id, button) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.getElementById(id)?.classList.add("active");
  button?.classList.add("active");

  if (id === "feedback") {
    loadFeedback();
  }

  if (id === "admin") {
    loadAdminFeedback();
  }
}

function showSectionById(id) {
  const button = [...document.querySelectorAll(".nav-btn")]
    .find(btn => btn.getAttribute("onclick")?.includes(`'${id}'`));

  showSection(id, button);
}

// ---------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------

function updateDashboard() {
  if (!profile) return;

  document.getElementById("dashboardName").textContent =
    profile.name || "Athlet";

  const latest = weightEntries[0];

  document.getElementById("dashWeight").textContent =
    latest ? `${latest.weight} kg` : "–";

  const average = calculateAverage();

  document.getElementById("dashAverage").textContent =
    average ? `${average} kg` : "–";

  document.getElementById("dashLocation").textContent =
    profile.training_location === "gym"
      ? "🏋️ Gym"
      : "🏠 Zuhause";

  document.getElementById("dashGoal").textContent =
    goalLabel(profile.goal);

  const openShopping = shoppingItems.filter(item => !item.done).length;
  document.getElementById("dashShopping").textContent = openShopping;
}

function goalLabel(goal) {
  const labels = {
    fitness: "Fitness verbessern",
    muscle: "Muskulatur aufbauen",
    strength: "Stärker werden",
    healthy: "Gesunde Gewohnheiten",
    weight_management: "Gewicht gesund begleiten"
  };

  return labels[goal] || goal || "Noch kein Ziel";
}

// ---------------------------------------------------------
// TRAINING
// ---------------------------------------------------------

function selectTrainingLocation(location, save = false) {
  trainingLocation = location;

  document.getElementById("homeChoice")
    .classList.toggle("selected", location === "home");

  document.getElementById("gymChoice")
    .classList.toggle("selected", location === "gym");

  document.getElementById("profileLocation").value = location;

  if (save && profile) {
    profile.training_location = location;
  }
}

async function generateWorkout() {
  if (!profile) return;

  selectTrainingLocation(trainingLocation, false);

  const duration = Number(
    document.getElementById("trainingDuration").value
  );

  showLoading("Dein Trainingsplan wird erstellt...");

  try {
    const result = await callAI("workout", {
      profile,
      location: trainingLocation,
      duration
    });

    renderWorkout(result);
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

function renderWorkout(data) {
  const container = document.getElementById("workoutResult");

  if (!data?.exercises?.length) {
    container.innerHTML = `<div class="empty">Kein Trainingsplan erhalten.</div>`;
    return;
  }

  container.innerHTML = `
    <h3>${escapeHtml(data.title || "Dein Trainingsplan")}</h3>
    <p class="subtitle">${escapeHtml(data.description || "")}</p>
    ${data.exercises.map(exercise => {
      const search = encodeURIComponent(
        `${exercise.name} richtige Ausführung`
      );

      return `
        <div class="exercise">
          <div class="exercise-head">
            <div>
              <div class="exercise-name">${escapeHtml(exercise.name)}</div>
              <div class="tag">${escapeHtml(exercise.muscle || "Ganzkörper")}</div>
            </div>
            <strong>${escapeHtml(exercise.sets || "")} × ${escapeHtml(exercise.reps || "")}</strong>
          </div>

          <p>${escapeHtml(exercise.instructions || "")}</p>

          <a
            class="video-link"
            href="https://www.youtube.com/results?search_query=${search}"
            target="_blank"
            rel="noopener noreferrer"
          >
            🎥 Video-Erklärung ansehen
          </a>
        </div>
      `;
    }).join("")}
  `;
}

// ---------------------------------------------------------
// AI
// ---------------------------------------------------------

async function callAI(type, payload) {
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type,
      ...payload
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "KI-Anfrage fehlgeschlagen.");
  }

  return data;
}

// ---------------------------------------------------------
// NUTRITION
// ---------------------------------------------------------

function askFoodOptimization() {
  document.getElementById("foodPromptBox").classList.remove("hidden");
}

async function optimizeFood() {
  const prompt = document.getElementById("foodPrompt").value.trim();

  if (!prompt) {
    alert("Beschreibe zuerst dein Essen.");
    return;
  }

  showLoading("Die KI optimiert dein Essen...");

  try {
    const result = await callAI("food", {
      profile,
      prompt
    });

    document.getElementById("mealResult").innerHTML = `
      <div class="meal">
        <strong>KI-Empfehlung</strong>
        <p>${escapeHtml(result.advice || result.text || "")}</p>
      </div>
    `;
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function generateMealPlan(type) {
  showLoading(
    type === "week"
      ? "Dein Wochenplan wird erstellt..."
      : "Dein Tagesplan wird erstellt..."
  );

  try {
    const result = await callAI("meal", {
      profile,
      planType: type
    });

    renderMealPlan(result);

    if (result.shoppingList?.length) {
      await addMealIngredientsToShopping(result.shoppingList);
    }
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

function renderMealPlan(data) {
  const container = document.getElementById("mealResult");

  const days = data.days || [];

  if (!days.length) {
    container.innerHTML = `<div class="empty">Kein Essensplan erhalten.</div>`;
    return;
  }

  container.innerHTML = `
    ${days.map(day => `
      <div class="meal">
        <strong>${escapeHtml(day.day || "Tag")}</strong>

        ${(day.meals || []).map(meal => `
          <div style="margin-top:10px;">
            <b>${escapeHtml(meal.type || "Mahlzeit")}</b>
            <div>${escapeHtml(meal.name || "")}</div>
            <small class="subtitle">
              ${(meal.ingredients || []).map(escapeHtml).join(", ")}
            </small>
          </div>
        `).join("")}
      </div>
    `).join("")}
  `;
}

// ---------------------------------------------------------
// WEIGHT / PROGRESS
// ---------------------------------------------------------

async function loadWeights() {
  const { data, error } = await supabaseClient
    .from("weight_entries")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    weightEntries = [];
  } else {
    weightEntries = data || [];
  }

  renderWeights();
}

async function addWeightEntry() {
  const date = document.getElementById("weightDate").value;
  const weight = Number(document.getElementById("weightValue").value);

  if (!date || !weight || weight <= 0) {
    alert("Bitte Datum und Gewicht eingeben.");
    return;
  }

  const { error } = await supabaseClient
    .from("weight_entries")
    .upsert({
      user_id: currentUser.id,
      date,
      weight
    }, {
      onConflict: "user_id,date"
    });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("weightValue").value = "";

  await loadWeights();
  updateDashboard();
}

function calculateAverage() {
  if (!weightEntries.length) return null;

  const total = weightEntries.reduce(
    (sum, item) => sum + Number(item.weight),
    0
  );

  return (total / weightEntries.length).toFixed(1);
}

function renderWeights() {
  const latest = weightEntries[0];

  document.getElementById("currentWeight").textContent =
    latest ? `${latest.weight} kg` : "–";

  document.getElementById("averageWeight").textContent =
    calculateAverage() ? `${calculateAverage()} kg` : "–";

  document.getElementById("weightCount").textContent =
    weightEntries.length;

  const list = document.getElementById("weightList");

  if (!weightEntries.length) {
    list.innerHTML = `<div class="empty">Noch keine Gewichtseinträge.</div>`;
  } else {
    list.innerHTML = weightEntries.map(item => `
      <div class="weight-entry">
        <span>${formatDate(item.date)}</span>
        <strong>${Number(item.weight).toFixed(1)} kg</strong>
      </div>
    `).join("");
  }

  renderWeightChart();
}

function renderWeightChart() {
  const container = document.getElementById("weightChart");

  if (!weightEntries.length) {
    container.innerHTML = `<div class="empty">Noch keine Daten für den Verlauf.</div>`;
    return;
  }

  const sorted = [...weightEntries].reverse();

  const min = Math.min(...sorted.map(x => Number(x.weight)));
  const max = Math.max(...sorted.map(x => Number(x.weight)));

  const range = Math.max(max - min, 1);

  container.innerHTML = `
    <div style="
      display:flex;
      align-items:flex-end;
      gap:8px;
      height:220px;
      padding:20px 5px 5px;
      border-bottom:1px solid var(--border);
    ">
      ${sorted.map(item => {
        const value = Number(item.weight);
        const height = 35 + ((value - min) / range) * 130;

        return `
          <div style="
            flex:1;
            min-width:25px;
            height:${height}px;
            background:var(--accent);
            border-radius:7px 7px 2px 2px;
            position:relative;
          ">
            <span style="
              position:absolute;
              top:-22px;
              left:50%;
              transform:translateX(-50%);
              font-size:11px;
              white-space:nowrap;
            ">${value.toFixed(1)}</span>
          </div>
        `;
      }).join("")}
    </div>

    <div style="
      display:flex;
      gap:8px;
      margin-top:8px;
      color:var(--muted);
      font-size:10px;
    ">
      ${sorted.map(item => `
        <div style="flex:1;text-align:center;">
          ${formatDate(item.date)}
        </div>
      `).join("")}
    </div>
  `;
}

// ---------------------------------------------------------
// SHOPPING LIST
// ---------------------------------------------------------

async function loadShopping() {
  const { data, error } = await supabaseClient
    .from("shopping_items")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    shoppingItems = [];
  } else {
    shoppingItems = data || [];
  }

  renderShopping();
}

async function addShoppingItem() {
  const input = document.getElementById("shoppingInput");
  const name = input.value.trim();

  if (!name) return;

  const { error } = await supabaseClient
    .from("shopping_items")
    .insert({
      user_id: currentUser.id,
      name,
      done: false
    });

  if (error) {
    alert(error.message);
    return;
  }

  input.value = "";
  await loadShopping();
  updateDashboard();
}

async function toggleShopping(id, done) {
  const { error } = await supabaseClient
    .from("shopping_items")
    .update({ done: !done })
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadShopping();
  updateDashboard();
}

async function deleteShopping(id) {
  const { error } = await supabaseClient
    .from("shopping_items")
    .delete()
    .eq("id", id)
    .eq("user_id", currentUser.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadShopping();
  updateDashboard();
}

async function clearCompletedShopping() {
  const { error } = await supabaseClient
    .from("shopping_items")
    .delete()
    .eq("user_id", currentUser.id)
    .eq("done", true);

  if (error) {
    alert(error.message);
    return;
  }

  await loadShopping();
  updateDashboard();
}

function renderShopping() {
  const container = document.getElementById("shoppingList");

  if (!shoppingItems.length) {
    container.innerHTML =
      `<div class="empty">Deine Einkaufsliste ist leer.</div>`;
    return;
  }

  container.innerHTML = shoppingItems.map(item => `
    <div class="shopping-item ${item.done ? "done" : ""}">
      <label>
        <input
          type="checkbox"
          ${item.done ? "checked" : ""}
          onchange="toggleShopping('${item.id}', ${item.done})"
          style="width:auto;"
        />
        ${escapeHtml(item.name)}
      </label>

      <button
        class="danger-btn"
        onclick="deleteShopping('${item.id}')"
      >
        ×
      </button>
    </div>
  `).join("");
}

async function addMealIngredientsToShopping(items) {
  const cleanItems = [
    ...new Set(
      items
        .map(item => String(item).trim())
        .filter(Boolean)
    )
  ];

  if (!cleanItems.length) return;

  const rows = cleanItems.map(name => ({
    user_id: currentUser.id,
    name,
    done: false
  }));

  const { error } = await supabaseClient
    .from("shopping_items")
    .insert(rows);

  if (error) {
    console.error(error);
  }

  await loadShopping();
  updateDashboard();
}

// ---------------------------------------------------------
// AI COACH
// ---------------------------------------------------------

async function sendCoachMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();

  if (!message) return;

  addChatMessage(message, "user");
  input.value = "";

  try {
    const result = await callAI("coach", {
      profile,
      message
    });

    addChatMessage(
      result.text || "Ich konnte gerade keine Antwort erzeugen.",
      "ai"
    );
  } catch (error) {
    addChatMessage(
      "Leider ist gerade ein Fehler aufgetreten: " + error.message,
      "ai"
    );
  }
}

function addChatMessage(text, type) {
  const chat = document.getElementById("chat");

  const element = document.createElement("div");
  element.className = `chat-message ${type}`;
  element.textContent = text;

  chat.appendChild(element);
  chat.scrollTop = chat.scrollHeight;
}

// ---------------------------------------------------------
// FEEDBACK
// ---------------------------------------------------------

async function submitFeedback() {
  const rating = Number(
    document.getElementById("feedbackRating").value
  );

  const category =
    document.getElementById("feedbackCategory").value;

  const message =
    document.getElementById("feedbackMessage").value.trim();

  if (!message) {
    showFeedbackStatus("Bitte schreibe eine Nachricht.", "error");
    return;
  }

  const { error } = await supabaseClient
    .from("feedback")
    .insert({
      user_id: currentUser.id,
      message,
      rating,
      category
    });

  if (error) {
    showFeedbackStatus(error.message, "error");
    return;
  }

  document.getElementById("feedbackMessage").value = "";

  showFeedbackStatus("Feedback erfolgreich gespeichert.", "success");

  await loadFeedback();
}

function showFeedbackStatus(message, type) {
  const element = document.getElementById("feedbackStatus");

  element.textContent = message;
  element.className = `message show ${type}`;
}

async function loadFeedback() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("feedback")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  feedbackItems = data || [];
  renderMyFeedback();
}

function renderMyFeedback() {
  const container = document.getElementById("myFeedback");

  if (!feedbackItems.length) {
    container.innerHTML =
      `<div class="empty">Du hast noch kein Feedback gesendet.</div>`;
    return;
  }

  container.innerHTML = feedbackItems.map(item => `
    <div class="feedback-item">
      <div>
        <strong>${"⭐".repeat(Number(item.rating || 0))}</strong>
        <div>${escapeHtml(item.message)}</div>
        <small class="subtitle">
          ${escapeHtml(item.category || "Allgemein")} ·
          ${formatDateTime(item.created_at)}
        </small>
      </div>
    </div>
  `).join("");
}

// ---------------------------------------------------------
// ADMIN
// ---------------------------------------------------------

async function checkAdmin() {
  try {
    const { data: sessionData } =
      await supabaseClient.auth.getSession();

    const token = sessionData?.session?.access_token;

    if (!token) return;

    const response = await fetch("/api/admin/check", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const data = await response.json();

    if (data.isAdmin) {
      document.getElementById("adminNav").classList.remove("hidden");
    } else {
      document.getElementById("adminNav").classList.add("hidden");
    }
  } catch (error) {
    console.error(error);
  }
}

async function loadAdminFeedback() {
  const container = document.getElementById("adminFeedback");

  container.innerHTML = `<div class="empty">Feedback wird geladen...</div>`;

  try {
    const { data: sessionData } =
      await supabaseClient.auth.getSession();

    const token = sessionData?.session?.access_token;

    const response = await fetch("/api/admin/feedback", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Keine Berechtigung.");
    }

    if (!data.feedback?.length) {
      container.innerHTML =
        `<div class="empty">Noch kein Nutzerfeedback vorhanden.</div>`;
      return;
    }

    container.innerHTML = data.feedback.map(item => `
      <div class="feedback-item">
        <div>
          <strong>${"⭐".repeat(Number(item.rating || 0))}</strong>
          <div style="margin-top:5px;">
            ${escapeHtml(item.message)}
          </div>

          <small class="subtitle">
            ${escapeHtml(item.category || "Allgemein")}
            · ${formatDateTime(item.created_at)}
            · ${escapeHtml(item.user_email || "Unbekannt")}
          </small>
        </div>
      </div>
    `).join("");

  } catch (error) {
    container.innerHTML = `
      <div class="message show error">
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

// ---------------------------------------------------------
// LOADING
// ---------------------------------------------------------

function showLoading(text) {
  document.getElementById("loadingText").textContent = text;
  document.getElementById("loadingModal").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingModal").classList.add("hidden");
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

function formatDate(date) {
  if (!date) return "–";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

function formatDateTime(date) {
  if (!date) return "–";

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(date));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}