/* =====================================================
   FITNESS AI PRO
   Haupt-JavaScript
   ===================================================== */

"use strict";

/* =====================================================
   DATEN
   ===================================================== */

const STORAGE_KEY = "fitness_ai_pro_data";

let appData = {
  profile: {
    name: "",
    age: "",
    height: "",
    weight: "",
    goal: "fitness"
  },

  nutrition: {
    diet: "normal",
    favoriteFood: ""
  },

  workout: [],

  weights: [],

  shopping: []
};


/* =====================================================
   START
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

  loadData();

  updateDashboard();

  renderWorkout();

  renderWeights();

  renderShopping();

  updateNutrition();

});


/* =====================================================
   SPEICHERN
   ===================================================== */

function saveData() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(appData)
  );

}


/* =====================================================
   LADEN
   ===================================================== */

function loadData() {

  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return;

  try {

    const data = JSON.parse(saved);

    appData = {
      ...appData,
      ...data,
      profile: {
        ...appData.profile,
        ...(data.profile || {})
      },
      nutrition: {
        ...appData.nutrition,
        ...(data.nutrition || {})
      }
    };

  } catch (error) {

    console.error(
      "Daten konnten nicht geladen werden:",
      error
    );

  }

  loadProfileIntoForm();

}


/* =====================================================
   NAVIGATION
   ===================================================== */

function showSection(id, button) {

  document
    .querySelectorAll(".section")
    .forEach(section => {
      section.classList.remove("active");
    });

  const section = document.getElementById(id);

  if (section) {
    section.classList.add("active");
  }

  document
    .querySelectorAll(".nav button")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  }

  const titles = {
    dashboard: "Dashboard",
    training: "Training",
    nutrition: "Ernährung",
    progress: "Fortschritt",
    shopping: "Einkaufsliste",
    ai: "AI Coach",
    profile: "Profil"
  };

  document.getElementById("pageTitle").textContent =
    titles[id] || "FITNESS AI PRO";

  closeSidebar();

}


function toggleSidebar() {

  document
    .getElementById("sidebar")
    .classList.toggle("open");

}


function closeSidebar() {

  document
    .getElementById("sidebar")
    .classList.remove("open");

}


/* =====================================================
   PROFIL
   ===================================================== */

function saveProfile() {

  appData.profile.name =
    document.getElementById("profileName").value.trim();

  appData.profile.age =
    document.getElementById("profileAge").value;

  appData.profile.height =
    document.getElementById("profileHeight").value;

  appData.profile.weight =
    document.getElementById("profileWeight").value;

  appData.profile.goal =
    document.getElementById("profileGoal").value;

  saveData();

  updateDashboard();

  alert("Profil gespeichert! ✅");

}


function loadProfileIntoForm() {

  document.getElementById("profileName").value =
    appData.profile.name || "";

  document.getElementById("profileAge").value =
    appData.profile.age || "";

  document.getElementById("profileHeight").value =
    appData.profile.height || "";

  document.getElementById("profileWeight").value =
    appData.profile.weight || "";

  document.getElementById("profileGoal").value =
    appData.profile.goal || "fitness";

}


/* =====================================================
   DASHBOARD
   ===================================================== */

function updateDashboard() {

  const profile = appData.profile;

  document.getElementById("dashboardName").textContent =
    profile.name
      ? `Hallo ${profile.name}!`
      : "Noch kein Profil erstellt.";

  document.getElementById("dashboardWeight").textContent =
    profile.weight
      ? `${profile.weight} kg`
      : "-- kg";

  document.getElementById("dashboardGoal").textContent =
    getGoalText(profile.goal);

  updateWorkoutProgress();

}


function getGoalText(goal) {

  const goals = {
    fitness: "Allgemeine Fitness",
    kraft: "Kraft aufbauen",
    muskeln: "Muskulatur aufbauen",
    ausdauer: "Ausdauer verbessern"
  };

  return goals[goal] || "Allgemeine Fitness";

}


/* =====================================================
   TRAINING
   ===================================================== */

function generateWorkout() {

  const goal = appData.profile.goal;

  let exercises;

  if (goal === "kraft") {

    exercises = [
      "Kniebeugen – 3 × 10",
      "Liegestütze – 3 × 8",
      "Ausfallschritte – 3 × 10",
      "Plank – 3 × 30 Sek.",
      "Superman – 3 × 10"
    ];

  } else if (goal === "muskeln") {

    exercises = [
      "Liegestütze – 3 × 10",
      "Kniebeugen – 3 × 12",
      "Pike Push-Ups – 3 × 8",
      "Glute Bridge – 3 × 12",
      "Plank – 3 × 30 Sek."
    ];

  } else if (goal === "ausdauer") {

    exercises = [
      "Jumping Jacks – 3 × 30 Sek.",
      "High Knees – 3 × 30 Sek.",
      "Mountain Climbers – 3 × 20",
      "Burpees – 3 × 8",
      "Plank – 3 × 30 Sek."
    ];

  } else {

    exercises = [
      "Kniebeugen – 3 × 10",
      "Liegestütze – 3 × 8",
      "Ausfallschritte – 3 × 10",
      "Plank – 3 × 30 Sek.",
      "Jumping Jacks – 3 × 30 Sek."
    ];

  }

  appData.workout = exercises.map(name => ({
    name,
    done: false
  }));

  saveData();

  renderWorkout();

}


function renderWorkout() {

  const container =
    document.getElementById("workoutList");

  if (!appData.workout.length) {

    container.innerHTML =
      "Noch kein Trainingsplan vorhanden.";

    updateWorkoutProgress();

    return;
  }

  container.innerHTML =
    appData.workout
      .map((exercise, index) => {

        return `
          <div class="exercise ${exercise.done ? "done" : ""}">
            <input
              type="checkbox"
              ${exercise.done ? "checked" : ""}
              onchange="toggleExercise(${index})"
            >

            <span>${escapeHTML(exercise.name)}</span>
          </div>
        `;

      })
      .join("");

  updateWorkoutProgress();

}


function toggleExercise(index) {

  if (!appData.workout[index]) return;

  appData.workout[index].done =
    !appData.workout[index].done;

  saveData();

  renderWorkout();

}


function updateWorkoutProgress() {

  const total =
    appData.workout.length;

  const done =
    appData.workout.filter(
      exercise => exercise.done
    ).length;

  const percent =
    total
      ? Math.round((done / total) * 100)
      : 0;

  document.getElementById("workoutProgress").style.width =
    `${percent}%`;

  document.getElementById("workoutProgressText").textContent =
    `${percent}% abgeschlossen`;

  document.getElementById("dashboardWorkout").textContent =
    `${percent}%`;

}


/* =====================================================
   GEWICHT
   ===================================================== */

function addWeight() {

  const input =
    document.getElementById("newWeight");

  const weight =
    parseFloat(input.value);

  if (!weight || weight <= 0) {

    alert("Bitte gib ein gültiges Gewicht ein.");

    return;
  }

  appData.weights.push({
    weight,
    date: new Date().toLocaleDateString("de-DE")
  });

  appData.profile.weight = weight;

  saveData();

  input.value = "";

  updateDashboard();

  renderWeights();

}


function renderWeights() {

  const container =
    document.getElementById("weightHistory");

  if (!appData.weights.length) {

    container.innerHTML =
      "Noch keine Gewichtsdaten.";

    return;
  }

  container.innerHTML =
    appData.weights
      .slice()
      .reverse()
      .map(entry => `
        <div class="exercise">
          <strong>${entry.weight} kg</strong>
          <span>${entry.date}</span>
        </div>
      `)
      .join("");

}


/* =====================================================
   ERNÄHRUNG
   ===================================================== */

function saveNutrition() {

  appData.nutrition.diet =
    document.getElementById("diet").value;

  appData.nutrition.favoriteFood =
    document.getElementById("favoriteFood").value.trim();

  saveData();

  updateNutrition();

  alert("Ernährung gespeichert! 🥗");

}


function updateNutrition() {

  document.getElementById("diet").value =
    appData.nutrition.diet || "normal";

  document.getElementById("favoriteFood").value =
    appData.nutrition.favoriteFood || "";

  let tips = [
    "Trinke über den Tag verteilt ausreichend Wasser.",
    "Iss regelmäßig und möglichst abwechslungsreich.",
    "Obst und Gemüse sind eine gute Ergänzung zu deinen Mahlzeiten.",
    "Für Jugendliche ist eine ausreichende Energie- und Nährstoffzufuhr besonders wichtig."
  ];

  document.getElementById("nutritionTips").innerHTML =
    tips
      .map(tip => `<p>• ${tip}</p>`)
      .join("");

}


/* =====================================================
   EINKAUFSLISTE
   ===================================================== */

function addShoppingItem() {

  const input =
    document.getElementById("shoppingInput");

  const value =
    input.value.trim();

  if (!value) return;

  appData.shopping.push({
    name: value,
    done: false
  });

  input.value = "";

  saveData();

  renderShopping();

}


function renderShopping() {

  const container =
    document.getElementById("shoppingList");

  if (!appData.shopping.length) {

    container.innerHTML =
      '<p class="empty">Die Einkaufsliste ist leer.</p>';

    return;
  }

  container.innerHTML =
    appData.shopping
      .map((item, index) => `
        <div class="shopping-item">
          <input
            type="checkbox"
            ${item.done ? "checked" : ""}
            onchange="toggleShoppingItem(${index})"
          >

          <span style="${item.done ? "text-decoration:line-through;opacity:.5" : ""}">
            ${escapeHTML(item.name)}
          </span>
        </div>
      `)
      .join("");

}


function toggleShoppingItem(index) {

  appData.shopping[index].done =
    !appData.shopping[index].done;

  saveData();

  renderShopping();

}


/* =====================================================
   AI COACH
   ===================================================== */

async function askAI() {

  const input =
    document.getElementById("aiInput");

  const question =
    input.value.trim();

  if (!question) return;

  addChatMessage(question, "user");

  input.value = "";

  const loading =
    addChatMessage("Ich denke nach... 🤖", "ai");

  try {

    /*
      WICHTIG:

      Hier kann später deine Gemini-API
      angeschlossen werden.

      Für den Moment antwortet die App
      mit einem lokalen Coach.
    */

    const answer =
      localAIResponse(question);

    loading.textContent = answer;

  } catch (error) {

    console.error(error);

    loading.textContent =
      "Leider ist gerade ein Fehler aufgetreten.";

  }

}


function addChatMessage(text, type) {

  const chat =
    document.getElementById("chat");

  const message =
    document.createElement("div");

  message.className =
    `message ${type}`;

  message.textContent = text;

  chat.appendChild(message);

  chat.scrollTop =
    chat.scrollHeight;

  return message;

}


function localAIResponse(question) {

  const q =
    question.toLowerCase();

  if (
    q.includes("training") ||
    q.includes("trainieren")
  ) {

    return "Für ein Training kannst du mit Kniebeugen, Liegestützen, Ausfallschritten und Planks starten. Achte auf eine saubere Technik und ausreichend Pausen.";

  }

  if (
    q.includes("essen") ||
    q.includes("ernährung")
  ) {

    return "Achte auf abwechslungsreiche Mahlzeiten mit Kohlenhydraten, Eiweiß, gesunden Fetten, Obst und Gemüse. Gerade als Jugendlicher solltest du keine strengen Diäten machen.";

  }

  if (
    q.includes("muskel") ||
    q.includes("muskeln")
  ) {

    return "Muskeln entwickeln sich durch regelmäßiges Training, ausreichend Essen, Schlaf und Erholung. Du musst dafür keine extremen Gewichte benutzen.";

  }

  if (
    q.includes("abnehmen") ||
    q.includes("gewicht verlieren")
  ) {

    return "Wenn du noch im Wachstum bist, solltest du nicht eigenständig eine Diät oder ein Kaloriendefizit starten. Sprich bei Gewichtsfragen am besten mit deinen Eltern oder einer medizinischen Fachperson.";

  }

  return "Ich kann dir bei Training, Ernährung, Übungen und deinem Fitnessplan helfen. Schreib mir einfach genauer, was du wissen möchtest. 💪";

}


/* =====================================================
   SICHERHEIT
   ===================================================== */

function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value;

  return div.innerHTML;

}


/* =====================================================
   ENTER-TASTE
   ===================================================== */

document.addEventListener("keydown", event => {

  if (
    event.key === "Enter" &&
    document.activeElement?.id === "shoppingInput"
  ) {

    addShoppingItem();

  }

});


console.log("FITNESS AI PRO – script.js geladen");
