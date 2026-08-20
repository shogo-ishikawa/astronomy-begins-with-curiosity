# ABCs repository guidance

## Source of truth

- Before planning or changing code, read `docs/ABCs_v0.1_implementation_spec.md` in full.
- Treat that document as the product and implementation source of truth for v0.1.
- If code, an issue, or a prompt conflicts with the specification, stop and report the conflict instead of silently choosing one.
- Work only on the phase named in the current request. Do not pre-implement later phases.

## Product intent

- Product: **ABCs — Astronomy Begins with Curiosity**.
- Audience: undergraduate students with no assumed astronomy knowledge.
- Goal: let students experience the reasoning cycle of real astronomy research using a known scientific result—not merely follow instructions to a predetermined answer.
- The essential research decisions, interpretation, conclusion, limitations, and next question must remain the student's choices.
- Mira is a supportive research partner. In Japanese, Mira uses `私`, speaks warmly and politely, explains reasons, and does not give away conclusions prematurely.

## v0.1 boundaries

- Japanese UI only; desktop-first, with basic narrow-screen usability.
- GitHub Pages static deployment; no server, database, secret, or API key.
- No account system, teacher dashboard, live CWS connection, live N-body computation, generative-AI chat, English UI, PWA, or service worker.
- Mira has no person illustration. Use the abstract star symbol specified in the design.
- Use only repository-owned, generated, or clearly licensed assets. Do not add remote hotlinked imagery.
- A synthetic data fixture is allowed for development only when it is visibly labelled `DEMO / synthetic fixture`. Never present it as a CWS scientific result.

## Scientific and educational integrity

- Preserve the distinction among observation/result, interpretation, conclusion, and limitation.
- Never imply that a dark-matter-only simulation directly models star or galaxy formation.
- Keep units, redshift, cosmological parameters, code/data version, and provenance visible wherever a result is interpreted or exported.
- The recombination era may be explanatory context, but it must not be presented as a particle snapshot unless the data actually contain one.
- Explain specialist terms through the clickable glossary and connect relevant ideas to undergraduate mathematics, physics, statistics, and computing.
- Choice consequences must be real and consistent: parameter choices affect derived quantities, review feedback, available comparisons, data selection, and outputs.

## Engineering conventions

- User-facing Japanese follows the explicit terminology dictionary: use データ、ユーザ、コンピュータ、ブラウザ、サーバ、パラメータ、シミュレータ、メモリ、スナップショット、乱数シード、放射、関数、電場、磁場、重力場、放射輸送. Do not remove long vowel marks mechanically; natural forms such as 研究パートナー and エネルギー remain unchanged.
- The formal large-scale-structure terms are 宇宙の大規模構造（コズミック・ウェブ）、フィラメント、ノード、ノット、ボイド, and only when needed ウォール（シート）. Do not use 節 or 空洞 as classification names.

- Use Vite, React, TypeScript in strict mode, and npm with a committed lockfile unless the specification is explicitly revised.
- Keep domain logic, educational content, and UI components separate. Do not embed large amounts of Japanese teaching text directly in React components.
- Represent themes, glossary entries, Mira rules, course links, and research choices as validated data.
- Keep core scientific calculations pure and independently testable.
- Keep GUI and Python-assisted calculations aligned with the tolerance defined in the specification.
- Use HashRouter or an equivalent GitHub Pages-safe routing strategy.
- Preserve accessibility: semantic HTML, keyboard operation, visible focus, non-colour state cues, reduced-motion support, and text/table alternatives for canvas figures.
- Add a production dependency only when it has a clear need; document the reason in the change report.
- Never register a service worker in v0.1.

## Verification

Run the applicable checks before declaring a phase complete. Once the scripts exist, the expected full set is:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Run relevant Playwright tests for user-flow changes. If a command is missing or cannot run, report that explicitly; do not claim success.

## Change discipline

- Inspect the existing repository and preserve unrelated user changes.
- Make the smallest coherent change that completes the requested phase or issue.
- Do not weaken tests, scientific checks, accessibility, or provenance to make a build pass.
- Update the specification only when the user explicitly approves a product decision that changes it.
- Do not commit, push, deploy, open a pull request, or alter repository settings unless the user explicitly asks for that action.

## Completion report

At the end of each task, report:

1. what became usable;
2. the main files changed;
3. checks run and their results;
4. scientific or UX assumptions still awaiting validation;
5. the recommended next phase, without implementing it.
