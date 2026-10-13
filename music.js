"use strict";

/* FITNESS AI PRO — eingebetteter Musikbereich.
   Nutzt offizielle Spotify-/Apple-Music-Embed-Player; keine Zugangsdaten werden gespeichert. */
(() => {
  const STORAGE_KEY = "fitnessAiProMusicPrefsV1";
  let provider = "spotify";

  const $ = (id) => document.getElementById(id);

  function setStatus(message, isError = false) {
    const status = $("musicStatus");
    if (!status) return;
    status.textContent = message;
    status.style.color = isError ? "var(--red)" : "var(--muted)";
  }

  function setProvider(next) {
    provider = next;
    document.querySelectorAll("[data-music-provider]").forEach((button) => {
      const active = button.dataset.musicProvider === provider;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const input = $("musicUrl");
    if (input) {
      input.placeholder = provider === "spotify"
        ? "https://open.spotify.com/playlist/…"
        : "https://music.apple.com/…";
    }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      saved.provider = provider;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch (_) {}
  }

  function embedUrl(raw) {
    let url;
    try { url = new URL(raw.trim()); } catch (_) { return null; }
    if (url.protocol !== "https:") return null;

    if (provider === "spotify") {
      if (url.hostname !== "open.spotify.com" && url.hostname !== "spotify.com") return null;
      const match = url.pathname.match(/^\/(playlist|album|track|artist|episode|show)\/([A-Za-z0-9]+)\/?$/);
      if (!match) return null;
      return {
        embed: "https://open.spotify.com/embed/" + match[1] + "/" + match[2] + "?utm_source=generator",
        external: "https://open.spotify.com/" + match[1] + "/" + match[2]
      };
    }

    if (url.hostname !== "music.apple.com" && url.hostname !== "www.music.apple.com") return null;
    if (!/^\/[a-z]{2}\/(?:album|playlist|station|music-video|song)\//i.test(url.pathname)) return null;
    const embed = new URL(url.href);
    embed.hostname = "embed.music.apple.com";
    return { embed: embed.href, external: url.href };
  }

  function loadPlayer() {
    const input = $("musicUrl");
    if (!input) return;
    const result = embedUrl(input.value);
    if (!result) {
      setStatus(provider === "spotify"
        ? "Bitte einen gültigen Spotify-Link zu Playlist, Album, Titel, Künstler oder Podcast einfügen."
        : "Bitte einen gültigen Apple-Music-Link einfügen.", true);
      return;
    }

    const frame = $("musicEmbed");
    const wrap = $("musicEmbedWrap");
    const empty = $("musicEmpty");
    const external = $("musicOpenExternal");
    frame.src = result.embed;
    wrap.classList.remove("hidden");
    empty.classList.add("hidden");
    external.href = result.external;
    external.classList.remove("hidden");
    const isSingleTrack = /\/(track|song)\//i.test(new URL(result.external).pathname);
    external.textContent = provider === "spotify"
      ? (isSingleTrack ? "Vollständig in Spotify abspielen ↗" : "Playlist vollständig in Spotify öffnen ↗")
      : (isSingleTrack ? "Vollständig in Apple Music abspielen ↗" : "In Apple Music öffnen ↗");
    setStatus(provider === "spotify"
      ? "Hinweis: Der eingebettete Player kann je nach Konto nur eine Vorschau abspielen. Für den ganzen Song oben Spotify öffnen und dort die Wiedergabe starten."
      : "Hinweis: Apple Music spielt eingebettet je nach Abo oft nur eine Vorschau. Für den ganzen Song oben Apple Music öffnen und dort die Wiedergabe starten.");

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, url: input.value.trim() }));
    } catch (_) {}
  }

  function init() {
    if (!$("music")) return;
    document.querySelectorAll("[data-music-provider]").forEach((button) => {
      button.addEventListener("click", () => setProvider(button.dataset.musicProvider));
    });
    $("loadMusicButton")?.addEventListener("click", loadPlayer);
    $("musicUrl")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") loadPlayer();
    });

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.provider === "apple" || saved.provider === "spotify") setProvider(saved.provider);
      if (saved.url && $("musicUrl")) $("musicUrl").value = saved.url;
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
