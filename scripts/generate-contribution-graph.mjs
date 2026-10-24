#!/usr/bin/env node
// Generates assets/contribution-graph.svg from the GitHub GraphQL API.
// No dependencies — runs on plain Node 18+ with GITHUB_TOKEN in the env.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const USERNAME = process.env.GRAPH_USERNAME ?? "ayusharyaneth";
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "contribution-graph-generator",
  },
  body: JSON.stringify({ query, variables: { login: USERNAME } }),
});
if (!res.ok) {
  console.error(`GraphQL request failed: HTTP ${res.status}`);
  process.exit(1);
}
const payload = await res.json();
if (payload.errors) {
  console.error("GraphQL errors:", JSON.stringify(payload.errors));
  process.exit(1);
}
const calendar = payload.data.user.contributionsCollection.contributionCalendar;

// Tokyo Night palette to match the stat and repo cards.
const COLORS = {
  bg: "#1a1b27",
  empty: "#292e42",
  levels: ["#3d59a1", "#7aa2f7", "#7dcfff", "#bb9af7"],
  text: "#c0caf5",
  muted: "#565f89",
  accent: "#70a5fd",
};
const FONT = "Segoe UI, Helvetica, Arial, sans-serif";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const PAD_L = 18;
const PAD_R = 12;
const PAD_T = 48;
const PAD_B = 26;

const weeks = calendar.weeks;
const width = PAD_L + weeks.length * STEP - GAP + PAD_R;
const height = PAD_T + 7 * STEP - GAP + PAD_B;

const maxCount = Math.max(...weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount)), 1);
const levelFor = (count) => {
  if (count === 0) return COLORS.empty;
  const r = count / maxCount;
  if (r <= 0.25) return COLORS.levels[0];
  if (r <= 0.5) return COLORS.levels[1];
  if (r <= 0.75) return COLORS.levels[2];
  return COLORS.levels[3];
};

const parts = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Contribution activity for ${USERNAME}">`);
parts.push(`<rect width="${width}" height="${height}" rx="4.5" fill="${COLORS.bg}"/>`);
parts.push(`<text x="${PAD_L}" y="22" font-family="${FONT}" font-size="13" font-weight="600" fill="${COLORS.accent}">${calendar.totalContributions} contributions in the last year</text>`);

// Month labels above the grid, placed where the month changes.
let prevMonth = -1;
weeks.forEach((week, i) => {
  const month = Number(week.contributionDays[0].date.slice(5, 7)) - 1;
  if (month !== prevMonth) {
    parts.push(`<text x="${PAD_L + i * STEP}" y="${PAD_T - 10}" font-family="${FONT}" font-size="9" fill="${COLORS.muted}">${MONTHS[month]}</text>`);
    prevMonth = month;
  }
});

// Weekday markers (Mon / Wed / Fri) like GitHub's own graph.
for (const [row, label] of [[1, "M"], [3, "W"], [5, "F"]]) {
  parts.push(`<text x="${PAD_L - 11}" y="${PAD_T + row * STEP + 8}" font-family="${FONT}" font-size="9" fill="${COLORS.muted}">${label}</text>`);
}

// Contribution squares. Days whose count exceeds the API's color scale still
// map through levelFor so intensity always reflects the personal maximum.
weeks.forEach((week, wi) => {
  week.contributionDays.forEach((day, di) => {
    const x = PAD_L + wi * STEP;
    const y = PAD_T + di * STEP;
    const title = `${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"} on ${day.date}`;
    parts.push(`<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${levelFor(day.contributionCount)}"><title>${title}</title></rect>`);
  });
});

// Legend, bottom right.
const legend = [COLORS.empty, ...COLORS.levels];
const legendSquare = 10;
const legendGap = 3;
const legendWidth = 24 + legendGap + legend.length * (legendSquare + legendGap) + 24;
const legendY = height - 16;
let lx = width - PAD_R - legendWidth + 24;
parts.push(`<text x="${lx - legendGap}" y="${legendY + 8}" font-family="${FONT}" font-size="9" fill="${COLORS.muted}" text-anchor="end">Less</text>`);
lx += 20 + legendGap;
for (const color of legend) {
  parts.push(`<rect x="${lx}" y="${legendY}" width="${legendSquare}" height="${legendSquare}" rx="2" fill="${color}"/>`);
  lx += legendSquare + legendGap;
}
parts.push(`<text x="${lx + legendGap}" y="${legendY + 8}" font-family="${FONT}" font-size="9" fill="${COLORS.muted}">More</text>`);

parts.push("</svg>");

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outPath = join(root, "assets", "contribution-graph.svg");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, parts.join("\n") + "\n");
console.log(`Wrote ${outPath} (${calendar.totalContributions} contributions, ${weeks.length} weeks)`);
