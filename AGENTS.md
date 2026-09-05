# Project Guidance

## Architecture

- Use native ES modules throughout. Keep browser code in `script.js` and `src/`.
- `script.js` owns top-level DOM references, application orchestration, workflow policy, prompt assembly, image generation, modal decisions, sharing, reset behavior, and `generatedBlob`.
- `src/ui/` owns component-specific DOM queries, rendering, and event wiring. UI modules should not own global workflow policy.
- `src/services/` owns storage, API/network access, and sharing integrations.
- `src/prompt.js` must remain pure: prompt construction and related transformations may not read or mutate DOM, storage, network state, or global application state.
- `server.js` owns backend/server concerns. Keep secrets, server-only behavior, and backend routing out of browser modules.
- Keep state ownership explicit. Application workflow state belongs in `script.js`; component presentation state belongs in its UI module; persisted data belongs in `src/services/storage.js`; API transport belongs in `src/services/api.js`; sharing behavior belongs in `src/services/share.js`.

## Data Imports

- `src/ui/characterRows.js` and `src/ui/settingField.js` must import `src/data.json` directly.
- Use import attributes for JSON imports, for example `import data from "../data.json" with { type: "json" };`.
- Do not duplicate pack data in UI modules or route it through unrelated global state.

## API And Workflow

- A network request may retry at most once for each API-key attempt.
- If the API reports an invalid key, `script.js` may prompt for a replacement key at most once during a generation workflow. Do not create replacement-key loops.
- Generation must guard against concurrent runs. Disable or otherwise block conflicting controls while a generation is active.
- Restore controls, loading state, and other temporary workflow state in `finally`, including failure and cancellation paths.
- Keep modal decisions in `script.js`; UI modal modules should expose component behavior without deciding application workflow.
- Assign the generated image to `generatedBlob` only after successful extraction and validation.
- Extraction must run only when the API response indicates a successful generation and contains a supported image payload. Do not extract from ordinary error responses, incomplete responses, or unrelated text.
- Treat extraction failures as generation failures and leave the previous valid `generatedBlob` unchanged unless the workflow explicitly resets it.

## Assets

- Keep static UI assets under `assets/ui/`.
- Reference assets through stable project-relative paths; do not embed generated or large binary data as source literals.
- Validate asset existence and supported formats before using an asset in the UI.
- Generated image data is runtime state and must not be written into source-controlled assets.
- Preserve existing asset dimensions, filenames, and formats unless a task explicitly requires changing them.

## Extraction Rules

- Extract code when it owns a coherent DOM/state boundary, transport or persistence concern, reusable policy, or pure transformation.
- Move mutations with their behavior and expose the smallest useful public API.
- Keep one-off orchestration and application policy in `script.js`.
- Avoid arbitrary line-count limits; extract based on responsibility and ownership.
- Avoid circular dependencies and DOM access from services.

## Validation

- Run `npm run lint` after JavaScript or configuration changes.
- Run `npm run format:check` after changes.
- Manually verify affected browser flows, including persistence, validation, generation, error states, sharing, concurrency protection, and reset behavior.
- `npm test` is currently a placeholder and is expected to fail until a test suite is added.
- For server changes, verify `/generate-image`, error propagation, network failures, and inline-image handling.
