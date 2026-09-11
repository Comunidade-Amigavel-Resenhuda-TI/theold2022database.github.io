const input = document.getElementById("searchInput");
const button = document.getElementById("searchButton");
const status = document.getElementById("status");
const results = document.getElementById("results");

let database = [];

function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];

    row[0] = i;

    for (let j = 1; j <= b.length; j++) {
      const current = row[j];

      const cost =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;

      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + cost
      );

      previous = current;
    }
  }

  return row[b.length];
}

function scoreEntry(entry, query) {
  const q = normalize(query);

  if (!q) {
    return 0;
  }

  const fields = [
    entry.name,
    ...(entry.keywords || []),
    ...(entry.aliases || [])
  ].map(normalize);

  let best = Infinity;

  for (const field of fields) {

    if (field === q) {
      best = Math.min(best, 0);
    }

    else if (field.includes(q)) {
      best = Math.min(best, 1);
    }

    else {
      const words = field.split(" ");

      for (const word of words) {
        best = Math.min(
          best,
          levenshtein(q, word)
        );
      }

      best = Math.min(
        best,
        levenshtein(q, field)
      );
    }
  }

  return best;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(entries, query = "") {

  results.innerHTML = "";

  if (!entries.length) {

    results.innerHTML = `
      <div class="empty">
        Nenhum resultado encontrado.
      </div>
    `;

    return;
  }

  for (const entry of entries) {

    const card = document.createElement("article");

    card.className = "card";

    const tags = [
      ...(entry.keywords || []),
      ...(entry.aliases || [])
    ].slice(0, 8);

    card.innerHTML = `
      <h2>${escapeHtml(entry.name)}</h2>

      <div class="meta">
        ${escapeHtml(entry.platform || "desconhecido")}
        ·
        ${escapeHtml(entry.category || "sem categoria")}
      </div>

      <div class="tags">
        ${tags.map(tag => `
          <span class="tag">
            ${escapeHtml(tag)}
          </span>
        `).join("")}
      </div>

      <a
        href="${escapeHtml(entry.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir
      </a>
    `;

    results.appendChild(card);
  }

  status.textContent = query
    ? `${entries.length} resultado(s) para "${query}".`
    : `${entries.length} entrada(s) no database.`;
}

function search() {

  const query = input.value.trim();

  if (!query) {
    render(database);
    return;
  }

  const normalizedQuery = normalize(query);

  const maxDistance = Math.max(
    3,
    Math.ceil(normalizedQuery.length * 0.45)
  );

  const ranked = database

    .map(entry => ({
      entry,
      score: scoreEntry(entry, query)
    }))

    .filter(item => item.score <= maxDistance)

    .sort((a, b) => a.score - b.score)

    .map(item => item.entry);

  render(ranked, query);
}

async function loadDatabase() {

  try {

    const response =
      await fetch("database/channels.json");

    if (!response.ok) {
      throw new Error(
        "Falha ao carregar channels.json"
      );
    }

    database = await response.json();

    render(database);

  }

  catch (error) {

    console.error(error);

    status.textContent =
      "Erro ao carregar o database.";

    results.innerHTML = `
      <div class="empty">
        Verifique se
        <strong>database/channels.json</strong>
        existe.
      </div>
    `;
  }
}

button.addEventListener(
  "click",
  search
);

input.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      search();
    }

  }
);

loadDatabase();