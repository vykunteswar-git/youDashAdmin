/**
 * Fast client-side navigation search (no network).
 * Scoring: prefix / substring / multi-token AND across label, path, group, keywords.
 */

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildHaystack(item) {
  const parts = [
    item.label,
    item.path,
    item.group,
    ...((item.keywords && item.keywords) || []),
  ];
  return normalize(parts.join(" "));
}

/**
 * @param {object} item — { label, path, group, keywords? }
 * @param {string} query
 * @returns {number} score 0 = no match
 */
export function scoreNavMatch(item, query) {
  const q = normalize(query);
  if (!q) return 1;

  const text = buildHaystack(item);
  if (!text) return 0;

  if (text === q) return 1000;

  const label = normalize(item.label);
  const path = normalize(item.path);

  if (label.startsWith(q)) return 950;
  if (path.includes(q.replace(/^\//, ""))) return 900;
  if (text.startsWith(q)) return 880;

  if (text.includes(q)) {
    const idx = text.indexOf(q);
    return 800 - Math.min(idx, 200);
  }

  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length <= 1) {
    return fuzzySubsequence(text.replace(/\s/g, ""), q.replace(/\s/g, "")) ? 400 : 0;
  }

  let sum = 0;
  for (const t of tokens) {
    if (!t) continue;
    if (text.includes(t)) sum += 300;
    else return 0;
  }
  return sum;
}

/** All chars of needle appear in order in haystack (compact). */
function fuzzySubsequence(haystack, needle) {
  if (!needle) return true;
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/**
 * @param {Array<{label:string,path:string,group:string,keywords?:string[],icon?:unknown}>} flatItems
 * @param {string} query
 * @param {number} limit
 */
export function filterAndRankNav(flatItems, query, limit = 12) {
  const q = normalize(query);
  if (!q) {
    return flatItems.slice(0, limit);
  }

  const ranked = flatItems
    .map((item) => ({ item, score: scoreNavMatch(item, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.label.localeCompare(b.item.label);
    })
    .map((x) => x.item);

  return ranked.slice(0, limit);
}

export function flattenNav(menuGroups, extraRoutes = []) {
  const fromMenu = [];
  for (const g of menuGroups) {
    for (const it of g.items) {
      fromMenu.push({
        path: it.path,
        label: it.label,
        group: g.title,
        keywords: it.keywords,
        icon: it.icon,
      });
    }
  }
  const extras = extraRoutes.map((it) => ({
    path: it.path,
    label: it.label,
    group: it.group || "More",
    keywords: it.keywords,
    icon: it.icon,
  }));
  return [...fromMenu, ...extras];
}
