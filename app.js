/* ==========================================================================
   VORTEX ESPORTS — Application script
   --------------------------------------------------------------------------
   Vanilla JS, zero dependencies. A single app.js is shared by every page.
   A section only renders when its target element exists on the current page,
   so one file safely powers all pages.

   DATA FILE MAP (each page loads exactly ONE data file + app.js):
     index.html ............ data.js
     players.html .......... data.js
     combo-loadout.html .... data.js
     social.html ........... data.js
     about.html ............ data.js
     lobby.html ............ lobby-data.js
     practice.html ......... practice-data.js
     player-01..07.html .... players-data.js
   ========================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     Utilities
     ---------------------------------------------------------------------- */

  /** Set the text content of an element by id (no-op when missing). */
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /** Escape a string for safe insertion into innerHTML. */
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /** Sum a numeric player field across the roster. */
  function sumPlayerStats(field) {
    return (teamData.players || []).reduce(
      (sum, p) => sum + (Number(p[field]) || 0), 0
    );
  }

  /** Zero-padded player id, e.g. 1 -> "01". */
  function playerId(id) {
    return String(id).padStart(2, "0");
  }

  /** Relative link to a player profile page (flat structure, same folder). */
  function playerProfileHref(id) {
    return "player-" + playerId(id) + ".html";
  }

  /* ----------------------------------------------------------------------
     Web-side kill editing (persisted in localStorage)
     An edit made on the page overrides the value from the data file.
     ---------------------------------------------------------------------- */

  const KILLS_STORE_KEY = "vortex_player_kills_v2";

  let killStore = null;

  function getKillStore() {
    if (killStore === null) {
      try {
        killStore = JSON.parse(localStorage.getItem(KILLS_STORE_KEY)) || {};
      } catch (error) {
        killStore = {};
      }
    }
    return killStore;
  }

  function setStoredKills(id, value) {
    getKillStore()[String(id)] = value;
    try {
      localStorage.setItem(KILLS_STORE_KEY, JSON.stringify(getKillStore()));
    } catch (error) {
      /* Storage unavailable — edits still work for the current session. */
    }
  }

  /** Effective kill count for a player (stored edit wins over the data file). */
  function killsOf(player) {
    const stored = getKillStore()[String(player.id)];
    return stored !== undefined ? Number(stored) : (Number(player.kills) || 0);
  }

  /* ----------------------------------------------------------------------
     Social icons (inline SVG, stroke-based)
     ---------------------------------------------------------------------- */

  const SOCIAL_ICONS = {
    instagram:
      '<rect x="2" y="2" width="20" height="20" rx="5"></rect>' +
      '<circle cx="12" cy="12" r="4"></circle>' +
      '<line x1="17.6" y1="6.4" x2="17.6" y2="6.4"></line>',
    youtube:
      '<path d="M22 12s0-3.5-.5-5a3 3 0 0 0-2-2C17.5 4.5 12 4.5 12 4.5s-5.5 0-7.5.5a3 3 0 0 0-2 2C2 8.5 2 12 2 12s0 3.5.5 5a3 3 0 0 0 2 2c2 .5 7.5.5 7.5.5s5.5 0 7.5-.5a3 3 0 0 0 2-2c.5-1.5.5-5 .5-5z"></path>' +
      '<polygon points="10 9 16 12 10 15"></polygon>',
    facebook:
      '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>',
    discord:
      '<path d="M20.3 4.4A19.8 19.8 0 0 0 15.5 3l-.5 1a18 18 0 0 0-6 0L8.5 3A19.8 19.8 0 0 0 3.7 4.4 20 20 0 0 0 1 18.4a19.9 19.9 0 0 0 6 3l.9-1.6a13 13 0 0 1-2-1l.5-.4a14 14 0 0 0 13.2 0l.5.4a13 13 0 0 1-2 1l.9 1.6a19.9 19.9 0 0 0 6-3 20 20 0 0 0-2.7-14zM9 15.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"></path>'
  };

  /** Render a single social link with an inline icon. */
  function socialLink(label, href, key) {
    return (
      '<a href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" aria-label="' +
      esc(label) + ' on ' + esc(key) + '">' +
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      SOCIAL_ICONS[key] +
      "</svg>" + esc(key) +
      "</a>"
    );
  }

  /** Render the full social block for a player. */
  function socialLinks(player) {
    return (
      '<div class="social-links">' +
      socialLink(player.name, player.socials.instagram, "instagram") +
      socialLink(player.name, player.socials.youtube, "youtube") +
      socialLink(player.name, player.socials.facebook, "facebook") +
      socialLink(player.name, player.socials.discord, "discord") +
      "</div>"
    );
  }

  /* ----------------------------------------------------------------------
     Image fallback
     If a referenced image is missing, swap it for a styled text tile so the
     layout never shows a broken-image icon.
     ---------------------------------------------------------------------- */

  /** Replace a failed <img> with a styled placeholder containing a label. */
  function brokenImage(img) {
    const label = img.getAttribute("data-fallback") || "VTX";
    const text = document.createElement("div");
    text.className = "img-fallback";
    text.setAttribute("aria-hidden", "true");
    text.textContent = label;
    img.parentNode.replaceChild(text, img);
  }

  window.brokenImage = brokenImage;

  /** Build an <img> that falls back to a text tile when the asset is missing. */
  function imageTag(src, alt, fallback) {
    return (
      '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" ' +
      'data-fallback="' + esc(fallback) + '" onerror="brokenImage(this)">'
    );
  }

  /* ----------------------------------------------------------------------
     Shared card builders
     ---------------------------------------------------------------------- */

  /** Player card used on the Home and Players pages. */
  function playerCard(player) {
    return (
      '<article class="player-card">' +
        '<div class="player-media">' +
          '<img src="' + esc(player.image) + '" alt="' + esc(player.name) +
            '" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<span class="player-number">#' + playerId(player.id) + "</span>" +
        "</div>" +
        '<div class="player-info">' +
          '<p class="eyebrow">' + esc(player.role) + "</p>" +
          "<h3>" + esc(player.name) + "</h3>" +
          '<p class="player-ign">IGN: ' + esc(player.ign) + "</p>" +
          '<div class="mini-stats">' +
            "<span><b>" + killsOf(player) + "</b> Kills</span>" +
            "<span><b>" + (Number(player.wins) || 0) + "</b> Wins</span>" +
          "</div>" +
          '<a class="btn btn-ghost btn-sm" href="' + esc(playerProfileHref(player.id)) +
            '">View Profile</a>' +
        "</div>" +
      "</article>"
    );
  }

  /** Single character/pet tile used inside combo cards and profiles. */
  function loadoutItem(label, image, caption) {
    return (
      '<div class="loadout-item">' +
        '<div class="loadout-image">' +
          '<img src="' + esc(image) + '" alt="' + esc(label) +
            '" loading="lazy" onerror="this.style.display=\'none\'">' +
        "</div>" +
        "<span>" + esc(caption) + "</span>" +
        "<strong>" + esc(label) + "</strong>" +
      "</div>"
    );
  }

  /* ----------------------------------------------------------------------
     Navigation & footer
     ---------------------------------------------------------------------- */

  function initNavbar() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("menuBtn");
    const menu = document.getElementById("navMenu");

    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label",
          isOpen ? "Close navigation menu" : "Toggle navigation menu");
      });

      // Close on Escape.
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menu.classList.contains("is-open")) {
          menu.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });

      // Close when clicking outside the header.
      document.addEventListener("click", (event) => {
        if (menu.classList.contains("is-open") &&
            !header.contains(event.target)) {
          menu.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    // Add a shadow to the header when the page is scrolled.
    if (header) {
      const onScroll = () => {
        header.classList.toggle("is-scrolled", window.scrollY > 10);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function initFooter() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  /* ----------------------------------------------------------------------
     Home — global stats & roster
     ---------------------------------------------------------------------- */

  function renderHomeStats() {
    const stats = teamData.stats || {};

    setText("totalPlayers", stats.players || 0);
    setText("totalGames", stats.games || 0);
    setText("totalWins", stats.wins || 0);
    setText("totalKills", stats.kills || 0);
  }

  /** Pull the hero tagline from the team data (index.html). */
  function renderHomeHero() {
    const tagline = teamData.team && teamData.team.tagline;
    if (tagline) setText("heroTag", tagline);
  }

  function renderHomePlayers() {
    const box = document.getElementById("homePlayers");
    if (!box) return;
    box.innerHTML = (teamData.players || []).map(playerCard).join("");
  }

  function renderPlayersPage() {
    const box = document.getElementById("playersPage");
    if (!box) return;
    box.innerHTML = (teamData.players || []).map(playerCard).join("");
  }

  /* ----------------------------------------------------------------------
     Lobby — player kills, match results and leaderboard
     ---------------------------------------------------------------------- */

  function renderLobby() {
    const playerBox = document.getElementById("lobbyPlayers");
    const resultBox = document.getElementById("lobbyResults");
    const rankingBox = document.getElementById("rankings");
    const players = teamData.players || [];
    const lobby = teamData.lobby || [];
    const rankings = teamData.rankings || [];

    if (playerBox) {
      playerBox.innerHTML = players.map((p, index) =>
        "<tr>" +
          "<td>" + (index + 1) + "</td>" +
          "<td>" + esc(p.name) + "</td>" +
          "<td>" + esc(p.role) + "</td>" +
          '<td><input class="kill-input" type="number" min="0" inputmode="numeric" data-id="' +
            p.id + '" value="' + killsOf(p) + '" aria-label="Kills for ' + esc(p.name) + '"></td>' +
        "</tr>"
      ).join("");
    }

    if (resultBox) {
      resultBox.innerHTML = lobby.map(item =>
        "<tr>" +
          "<td>" + esc(item.lobby) + "</td>" +
          '<td><span class="rank-badge">TOP ' + item.rank + "</span></td>" +
          "<td>" + item.players + "</td>" +
          "<td>" + esc(item.prize) + "</td>" +
        "</tr>"
      ).join("");
    }

    if (rankingBox) {
      rankingBox.innerHTML = rankings.map(item =>
        '<div class="rank-card' + (item.rank === 1 ? " winner" : "") + '">' +
          '<span class="rank-number" aria-hidden="true">' + item.rank + "</span>" +
          "<div>" +
            "<strong>" + esc(item.player) + "</strong>" +
            "<small>" + (Number(item.kills) || 0) + " Kills</small>" +
          "</div>" +
        "</div>"
      ).join("");
    }

    setText("lobbyGames", (teamData.stats && teamData.stats.games) || 0);
    setText("lobbyWins", sumPlayerStats("wins"));
    setText("lobbyKills", players.reduce((sum, p) => sum + killsOf(p), 0));
  }

  /* ----------------------------------------------------------------------
     Practice — player kills and practice totals
     ---------------------------------------------------------------------- */

  function renderPractice() {
    const playerBox = document.getElementById("practicePlayers");

    if (playerBox) {
      playerBox.innerHTML = (teamData.players || []).map((p, index) =>
        "<tr>" +
          "<td>" + (index + 1) + "</td>" +
          "<td>" + esc(p.name) + "</td>" +
          "<td>" + esc(p.role) + "</td>" +
          '<td><input class="kill-input" type="number" min="0" inputmode="numeric" data-id="' +
            p.id + '" value="' + killsOf(p) + '" aria-label="Kills for ' + esc(p.name) + '"></td>' +
        "</tr>"
      ).join("");
    }

    renderPracticeStats();
  }

  /** Render the practice totals row into the #practiceStats tbody (practice.html). */
  function renderPracticeStats() {
    const box = document.getElementById("practiceStats");
    if (!box) return;

    const totals = teamData.practice || {};
    box.innerHTML =
      "<tr>" +
        "<td>" + (Number(totals.totalMatch) || 0) + "</td>" +
        "<td>" + (Number(totals.totalKill) || 0) + "</td>" +
        "<td>" + (Number(totals.totalWin) || 0) + "</td>" +
        "<td>" + (Number(totals.placementPoint) || 0) + "</td>" +
        "<td>" + (Number(totals.totalPoint) || 0) + "</td>" +
      "</tr>";
  }

  /* ----------------------------------------------------------------------
     Combo & loadout
     ---------------------------------------------------------------------- */

  function renderCombos() {
    const box = document.getElementById("comboGrid");
    if (!box) return;

    box.innerHTML = (teamData.players || []).map(p =>
      '<article class="combo-card">' +
        '<div class="combo-header">' +
          "<div>" +
            '<p class="eyebrow">' + esc(p.role) + "</p>" +
            "<h3>" + esc(p.name) + "</h3>" +
            '<p class="player-ign">IGN: ' + esc(p.ign) + "</p>" +
          "</div>" +
          '<span class="uid">UID: ' + esc(p.uid) + "</span>" +
        "</div>" +

        '<div class="loadout-grid">' +
          loadoutItem(p.combo.character, p.combo.characterImage, "CHARACTER") +
          loadoutItem(p.combo.pet, p.combo.petImage, "PET") +
        "</div>" +

        '<div class="skill-box">' +
          "<span>SKILL / COMBO</span>" +
          "<strong>" + esc(p.combo.skill) + "</strong>" +
        "</div>" +

        '<div class="weapons">' +
          "<span>WEAPON LOADOUT</span>" +
          '<div class="weapon-list">' +
            p.weapons.map(w => "<b>" + esc(w) + "</b>").join("") +
          "</div>" +
        "</div>" +
      "</article>"
    ).join("");
  }

  /* ----------------------------------------------------------------------
     Socials
     ---------------------------------------------------------------------- */

  function renderSocials() {
    const box = document.getElementById("socialGrid");
    if (!box) return;

    box.innerHTML = (teamData.players || []).map(p =>
      '<article class="social-card">' +
        '<p class="eyebrow">' + esc(p.role) + "</p>" +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="player-ign">IGN: ' + esc(p.ign) + "</p>" +
        socialLinks(p) +
      "</article>"
    ).join("");
  }

  /* ----------------------------------------------------------------------
     About
     ---------------------------------------------------------------------- */

  function renderAbout() {
    const joiningDate = teamData.team && teamData.team.joiningDate;
    if (joiningDate) setText("joiningDate", joiningDate);
  }

  /* ----------------------------------------------------------------------
     Player profile
     ---------------------------------------------------------------------- */

  function renderPlayerProfile() {
    const box = document.getElementById("playerProfile");
    if (!box || !window.PLAYER_ID) return;

    const player = (teamData.players || []).find(p => p.id === window.PLAYER_ID);

    if (!player) {
      box.innerHTML = "<h1>Player not found</h1>";
      return;
    }

    document.title = player.name + " | Vortex Esports";

    const meta =
      "<span>UID: <strong>" + esc(player.uid) + "</strong></span>" +
      "<span>Role: <strong>" + esc(player.role) + "</strong></span>" +
      "<span><strong>" + killsOf(player) + "</strong> Kills</span>" +
      "<span><strong>" + (Number(player.wins) || 0) + "</strong> Wins</span>";

    box.innerHTML =
      '<div class="profile-top">' +
        '<div class="profile-media">' +
          '<img src="' + esc(player.image) + '" alt="' + esc(player.name) +
            '" onerror="this.style.display=\'none\'">' +
        "</div>" +
        '<div class="profile-head">' +
          '<p class="eyebrow">' + esc(player.role) + "</p>" +
          "<h1>" + esc(player.name) + "</h1>" +
          '<p class="player-ign">IGN: ' + esc(player.ign) + "</p>" +
          '<div class="meta">' + meta + "</div>" +
        "</div>" +
      "</div>" +

      '<section class="profile-section" aria-labelledby="profileLoadoutTitle">' +
        '<p class="eyebrow">Combo &amp; Pet</p>' +
        '<h2 id="profileLoadoutTitle">Player Loadout</h2>' +
        '<div class="loadout-grid">' +
          loadoutItem(player.combo.character, player.combo.characterImage, "CHARACTER") +
          loadoutItem(player.combo.pet, player.combo.petImage, "PET") +
        "</div>" +
        '<div class="skill-box">' +
          "<span>SKILL / COMBO</span>" +
          "<strong>" + esc(player.combo.skill) + "</strong>" +
        "</div>" +
      "</section>" +

      '<section class="profile-section" aria-labelledby="profileWeaponsTitle">' +
        '<p class="eyebrow">Weapons</p>' +
        '<h2 id="profileWeaponsTitle">Weapon Loadout</h2>' +
        '<div class="weapon-grid">' +
          player.weapons.map(w => "<div>" + esc(w) + "</div>").join("") +
        "</div>" +
      "</section>" +

      '<section class="profile-section" aria-labelledby="profileSocialsTitle">' +
        '<p class="eyebrow">Social Media</p>' +
        '<h2 id="profileSocialsTitle">Follow ' + esc(player.name) + "</h2>" +
        socialLinks(player) +
      "</section>";
  }

  /* ----------------------------------------------------------------------
     Web-side kill editing — live re-sort of player tables
     ---------------------------------------------------------------------- */

  /** Kill value from the editable input inside a table row. */
  function killOfRow(row) {
    const input = row.querySelector(".kill-input");
    return input ? (parseInt(input.value, 10) || 0) : 0;
  }

  /** Sort table rows by kills (highest first) and renumber the # column. */
  function sortTableRows(tbody) {
    const rows = Array.prototype.slice.call(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => killOfRow(b) - killOfRow(a));
    rows.forEach((row, index) => {
      tbody.appendChild(row);
      row.cells[0].textContent = index + 1;
    });
  }

  /** Refresh the kill totals that are visible on the current page. */
  function refreshKillTotals() {
    const players = teamData.players || [];
    const total = players.reduce((sum, p) => sum + killsOf(p), 0);
    setText("totalKills", total);
    setText("lobbyKills", total);
  }

  /** Make the Kill column editable and re-sort live on table pages. */
  function initKillEditors() {
    ["lobbyPlayers", "practicePlayers"].forEach((id) => {
      const tbody = document.getElementById(id);
      if (!tbody) return;

      sortTableRows(tbody);

      tbody.addEventListener("input", (event) => {
        const input = event.target;
        if (!input.classList || !input.classList.contains("kill-input")) return;

        const value = Math.max(0, parseInt(input.value, 10) || 0);
        setStoredKills(input.getAttribute("data-id"), value);
        sortTableRows(tbody);
        refreshKillTotals();
      });
    });

    refreshKillTotals();
  }

  /* ----------------------------------------------------------------------
     Init
     ---------------------------------------------------------------------- */

  function init() {
    initNavbar();
    initFooter();

    renderHomeStats();
    renderHomeHero();
    renderHomePlayers();
    renderPlayersPage();
    renderLobby();
    renderPractice();
    renderCombos();
    renderSocials();
    renderAbout();
    renderPlayerProfile();

    initKillEditors();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
