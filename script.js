"use strict";

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
  Gemini wird NICHT mehr direkt aus dem Browser aufgerufen.

  Die KI läuft über deine Supabase Edge Function:
  smooth-handler
*/

const GEMINI_FUNCTION = "smooth-handler";

const ADMIN_EMAIL = "DEINE_ADMIN_EMAIL";

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

    console.log("✅ Supabase verbunden.");
    return true;
  } catch (error) {
    console.error(
      "❌ Supabase konnte nicht initialisiert werden:",
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
      "Fast geschafft! 📧 Bitte bestätige deine E-Mail-Adresse. Danach kannst du dich anmelden.",
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

    await createProfileIfMissing();
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

async function createProfile(
  userId,
  name,
  email
) {
  if (!supabaseClient || !userId) {
    return;
  }

  try {
    const {
      error
    } =
      await supabaseClient
        .from("profiles")
        .upsert(
          {
            id: userId,
            name: name || "User",
            email: email || ""
          },
          {
            onConflict: "id"
          }
        );

    if (error) {
      console.error(
        "Profil konnte nicht erstellt werden:",
        error
      );
    }

  } catch (error) {
    console.error(error);
  }
}

async function createProfileIfMissing() {
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
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
      console.error(
        "Profilprüfung fehlgeschlagen:",
        error
      );
      return;
    }

    if (!data) {
      await createProfile(
        currentUser.id,

        currentUser
          .user_metadata
          ?.name ||
          currentUser
            .email
            ?.split("@")[0] ||
          "User",

        currentUser.email || ""
      );
    }

  } catch (error) {
    console.error(error);
  }
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
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {
      console.error(
        "Profil konnte nicht geladen werden:",
        error
      );
      return;
    }

    currentProfile =
      data || {};

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
  if (
    !currentUser ||
    !supabaseClient
  ) {
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

  const updateData = {
    name,

    age:
      age
        ? Number(age)
        : null,

    height:
      height
        ? Number(height)
        : null,

    diet,

    training_location:
      trainingLocation,

    goal
  };

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .update(updateData)
        .eq("id", currentUser.id)
        .select()
        .maybeSingle();

    if (error) {
      console.error(error);

      const {
        error: insertError
      } =
        await supabaseClient
          .from("profiles")
          .insert({
            id: currentUser.id,
            email:
              currentUser.email || "",
            ...updateData
          });

      if (insertError) {
        console.error(
          "Profil konnte nicht gespeichert werden:",
          insertError
        );
        return;
      }

    } else if (data) {
      currentProfile =
        data;
    }

    await loadProfile();

    updateDashboard();
    renderExercises();

  } catch (error) {
    console.error(error);
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
  await loadWeights();
  await loadFeedback();
  await checkAdmin();

  updateDashboard();
  renderExercises();
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function showTab(tabName) {
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
                  🎥 Video
                </a>

                <button
                  onclick="useAIQuickPrompt('Erkläre mir die richtige Technik für ${escapeHTML(exercise.name)}.')"
                >
                  🤖 KI
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

  /*
    WICHTIG:

    Der HTML-Button ruft askGemini()
    ohne Argument auf.

    Deshalb lesen wir hier den Text
    direkt aus dem Eingabefeld.
  */

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

  if (!supabaseClient) {

    if (showInChat) {
      addAIMessage(
        "assistant",
        formatAIText(
          "❌ Supabase ist nicht verbunden."
        )
      );
    }

    return null;
  }

  if (!currentUser) {

    if (showInChat) {
      addAIMessage(
        "assistant",
        formatAIText(
          "❌ Bitte melde dich zuerst an."
        )
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
      "⏳ Die KI denkt gerade …"
    );

    if (input) {
      input.value = "";
    }
  }

  const profile =
    currentProfile || {};

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
      "🚀 Anfrage an smooth-handler..."
    );

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

    const timeoutPromise =
      new Promise(
        (_, reject) => {

          setTimeout(
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

    const result =
      await Promise.race([
        requestPromise,
        timeoutPromise
      ]);

    const {
      data,
      error
    } = result;

    if (error) {
      throw new Error(
        error.message ||
        "Die Verbindung zur KI ist fehlgeschlagen."
      );
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
      "✅ Antwort von smooth-handler erhalten."
    );

    if (showInChat) {
      updateLastAIMessage(
        formatAIText(answer)
      );
    }

    maybeExtractPlan(
      answer
    );

    return answer;

  } catch (error) {

    console.error(
      "❌ KI-FEHLER:",
      error
    );

    const readableError =
      error?.message ||
      "Unbekannter Fehler bei der KI.";

    if (showInChat) {

      updateLastAIMessage(
        formatAIText(
          `❌ KI-Fehler\n\n${readableError}`
        )
      );
    }

    return null;
  }
}

/* =========================================================
   AI MESSAGE
   ========================================================= */

function addAIMessage(
  type,
  text,
  id = null
) {

  const chat =
    document.getElementById(
      "aiChat"
    );

  if (!chat) {
    return;
  }

  const message =
    document.createElement(
      "div"
    );

  message.className =
    `ai-message ${type}`;

  if (id) {
    message.id =
      id;
  }

  if (type === "user") {
    message.innerHTML =
      escapeHTML(text);
  } else {
    message.innerHTML =
      text;
  }

  chat.appendChild(
    message
  );

  chat.scrollTop =
    chat.scrollHeight;
}

function updateLastAIMessage(
  text
) {

  const chat =
    document.getElementById(
      "aiChat"
    );

  if (!chat) {
    return;
  }

  const messages =
    chat.querySelectorAll(
      ".ai-message.assistant"
    );

  const lastMessage =
    messages[
      messages.length - 1
    ];

  if (lastMessage) {
    lastMessage.innerHTML =
      text;
  }
}

/* =========================================================
   ENTER KEY
   ========================================================= */

function setupAIInput() {

  const input =
    document.getElementById(
      "aiInput"
    );

  if (!input) {
    return;
  }

  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        askGemini();
      }

    }
  );
}

/* =========================================================
   NUTRITION AI
   ========================================================= */

async function askNutritionAI() {

  const promptElement =
    document.getElementById(
      "nutritionPrompt"
    );

  if (!promptElement) {
    return;
  }

  const prompt =
    promptElement.value.trim() ||
    "Erstelle mir einen ausgewogenen Wochen-Mahlzeitenplan.";

  showTab("ai");

  const input =
    document.getElementById(
      "aiInput"
    );

  if (!input) {
    return;
  }

  input.value = `
Erstelle mir einen ausgewogenen Mahlzeitenplan.

${prompt}

Bitte strukturiere ihn übersichtlich nach Tagen und Mahlzeiten.

Erstelle danach auch eine passende Einkaufsliste.
  `.trim();

  await askGemini();
}

/* =========================================================
   SHOPPING LIST
   ========================================================= */

async function createShoppingList() {

  const mealPlan =
    localStorage.getItem(
      "fitness_ai_meal_plan"
    );

  if (!mealPlan) {

    showTab("ai");

    useAIQuickPrompt(
      "Erstelle mir zuerst einen ausgewogenen Wochen-Mahlzeitenplan und danach eine vollständige Einkaufsliste."
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

  const items =
    mealPlan
      .split(/\n+/)
      .filter(
        line =>
          line.trim()
      )
      .slice(0, 30);

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
   PLAN EXTRACTION
   ========================================================= */

function maybeExtractPlan(
  answer
) {

  const lower =
    answer.toLowerCase();

  if (
    lower.includes(
      "frühstück"
    ) ||
    lower.includes(
      "mittagessen"
    ) ||
    lower.includes(
      "abendessen"
    )
  ) {

    localStorage.setItem(
      "fitness_ai_meal_plan",
      answer
    );

    renderMealPlan(
      answer
    );
  }

  if (
    lower.includes(
      "trainingsplan"
    ) ||
    lower.includes(
      "montag"
    ) ||
    lower.includes(
      "dienstag"
    )
  ) {

    localStorage.setItem(
      "fitness_ai_training_plan",
      answer
    );

    renderTrainingPlan(
      answer
    );
  }
}

/* =========================================================
   MEAL PLAN
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
      .slice(0, 12);

  container.innerHTML =
    lines
      .map(
        (
          line,
          index
        ) => `
          <div class="card meal-card">

            <div class="meal-time">
              ${
                index % 3 === 0
                  ? "MAHLZEIT"
                  : "PLAN"
              }
            </div>

            <p style="line-height:1.6">
              ${escapeHTML(line)}
            </p>

          </div>
        `
      )
      .join("");
}

/* =========================================================
   TRAINING PLAN
   ========================================================= */

function renderTrainingPlan(
  text
) {

  const container =
    document.getElementById(
      "trainingPlan"
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
      .slice(0, 20);

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
                line-height:1.5;
              "
            >
              ${escapeHTML(line)}
            </div>
          `
        )
        .join("")}

    </div>
  `;
}

/* =========================================================
   WEIGHT
   ========================================================= */

async function addWeight() {

  if (
    !currentUser ||
    !supabaseClient
  ) {
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

  if (!date || !weight) {
    alert(
      "Bitte Datum und Gewicht eingeben."
    );
    return;
  }

  try {

    const {
      error
    } =
      await supabaseClient
        .from(
          "weight_entries"
        )
        .insert({
          user_id:
            currentUser.id,

          date,

          weight:
            Number(weight)
        });

    if (error) {

      console.error(error);

      alert(
        "Der Gewichtseintrag konnte nicht gespeichert werden."
      );

      return;
    }

    const input =
      document.getElementById(
        "weightValue"
      );

    if (input) {
      input.value = "";
    }

    await loadWeights();

  } catch (error) {
    console.error(error);
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
      console.error(error);
      return;
    }

    renderWeights(
      data || []
    );

  } catch (error) {
    console.error(error);
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

  if (!entries.length) {

    list.innerHTML =
      `
        <p class="card-description">
          Noch keine Einträge.
        </p>
      `;

    average.textContent =
      "—";

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

      console.error(error);

      if (status) {
        status.textContent =
          "Feedback konnte nicht gespeichert werden.";
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
        "✅ Vielen Dank für dein Feedback!";

      status.style.color =
        "#35d07f";
    }

    await loadFeedback();

  } catch (error) {
    console.error(error);
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
      console.error(error);
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

async function checkAdmin() {

  const button =
    document.getElementById(
      "adminNavButton"
    );

  if (
    !button ||
    !currentUser
  ) {
    return;
  }

  const isAdmin =
    ADMIN_EMAIL !==
      "DEINE_ADMIN_EMAIL" &&
    currentUser.email
      ?.toLowerCase() ===
      ADMIN_EMAIL
        .toLowerCase();

  button.classList.toggle(
    "hidden",
    !isAdmin
  );
}

async function loadAllFeedback() {

  const container =
    document.getElementById(
      "allFeedback"
    );

  if (
    !container ||
    !currentUser
  ) {
    return;
  }

  const isAdmin =
    ADMIN_EMAIL !==
      "DEINE_ADMIN_EMAIL" &&
    currentUser.email
      ?.toLowerCase() ===
      ADMIN_EMAIL
        .toLowerCase();

  if (!isAdmin) {

    container.innerHTML =
      `
        <p class="card-description">
          Kein Zugriff.
        </p>
      `;

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
        .order(
          "id",
          {
            ascending: false
          }
        );

    if (error) {

      console.error(error);

      container.innerHTML =
        `
          <p class="card-description">
            Feedback konnte nicht geladen werden.
          </p>
        `;

      return;
    }

    if (!data?.length) {

      container.innerHTML =
        `
          <p class="card-description">
            Noch kein Feedback vorhanden.
          </p>
        `;

      return;
    }

    container.innerHTML =
      data
        .map(
          item => `
            <div class="feedback-item">

              <div class="feedback-meta">
                User ID:
                ${escapeHTML(
                  String(
                    item.user_id ||
                      "—"
                  )
                )}

                • Bewertung:
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

  } catch (error) {
    console.error(error);
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

async function init() {

  const weightDate =
    document.getElementById(
      "weightDate"
    );

  if (weightDate) {

    weightDate.value =
      new Date()
        .toISOString()
        .split("T")[0];
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

document.addEventListener(
  "DOMContentLoaded",
  init
);