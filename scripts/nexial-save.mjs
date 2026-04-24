import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const paths = {
  inbox: path.join(ROOT, "Doc", "00_inbox"),
  state: path.join(ROOT, "Doc", "01_state"),
  core: path.join(ROOT, "Doc", "02_core"),
  changelog: path.join(ROOT, "Doc", "03_changelog"),
  archive: path.join(ROOT, "Doc", "04_archive", "snapshots"),
};

const files = {
  update: path.join(paths.inbox, "session_update.md"),
  state: path.join(paths.state, "NEXIAL_STATE.md"),
  core: path.join(paths.core, "NEXIAL_CORE.md"),
  changelog: path.join(paths.changelog, "NEXIAL_CHANGELOG.md"),
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function timestamp() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-");
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

for (const dir of Object.values(paths)) {
  ensureDir(dir);
}

const update = read(files.update).trim();

if (!update) {
  fail("Aucun contenu trouvé dans Doc/00_inbox/session_update.md");
}

const previousState = read(files.state).trim();
const previousCore = read(files.core).trim();
const previousChangelog = read(files.changelog).trim();

const ts = timestamp();

if (previousState) {
  write(
    path.join(paths.archive, `NEXIAL_STATE_${ts}.md`),
    previousState + "\n"
  );
}

const newState = `# NEXIAL_STATE

Last update: ${new Date().toISOString()}

---

${update}

---

## Restart instruction

User says:
on reprend Nexial

Assistant must:
1. read this state
2. confirm phase
3. confirm current step
4. say: No drift detected, proceeding with locked step
5. execute only the locked next action

END
`;

const changelogEntry = `

---

## ${new Date().toISOString()}

${update}
`;

write(files.state, newState);

write(
  files.changelog,
  previousChangelog
    ? previousChangelog + changelogEntry
    : `# NEXIAL_CHANGELOG\n${changelogEntry}`
);

if (!previousCore) {
  write(
    files.core,
    `# NEXIAL_CORE

Stable core rules and architecture.

Do not modify this file at every session.
Use NEXIAL_STATE.md for current execution state.

END
`
  );
}

write(files.update, "");

console.log("✅ Nexial save completed");
console.log(`📌 State updated: ${files.state}`);
console.log(`📌 Changelog updated: ${files.changelog}`);
console.log(`📌 Archive created in: ${paths.archive}`);