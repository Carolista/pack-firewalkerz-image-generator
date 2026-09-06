# Project Guidance

## Architecture

- Use native ES modules throughout. Keep browser code in `script.js` and `src/`.
- `script.js` owns top-level DOM references, application orchestration, workflow policy, prompt assembly, image generation, modal decisions, sharing, reset behavior, and `generatedBlob`.
- `src/ui/` owns component-specific DOM queries, rendering, and event wiring. UI modules should not own global workflow policy.
- `src/services/` owns catalog/data access, storage, API/network access, and sharing integrations.
- `src/services/catalog.js` is the browser catalog boundary. UI modules consume normalized elements from it and must not import raw catalog data directly.
- The normalized catalog contract is `element: { id, elementType, name, slug, variants }` and `variant: { variantId, variantName, variantDesc, image }`.
- Variant display names come from catalog data; do not add category-specific hardcoded variant-name maps.
- `src/prompt.js` must remain pure: prompt construction and related transformations may not read or mutate DOM, storage, network state, or global application state.
- `server.js` owns backend/server concerns. Keep secrets, server-only behavior, and backend routing out of browser modules.
- Keep state ownership explicit. Application workflow state belongs in `script.js`; component presentation state belongs in its UI module; persisted data belongs in `src/services/storage.js`; API transport belongs in `src/services/api.js`; sharing behavior belongs in `src/services/share.js`.

## Catalog And Data

- Keep catalog imports and normalization in `src/services/catalog.js` and `src/model/gameElements.js`.
- Keep category-specific selection policy in UI modules: characters and NPCs are unique; enemies may be duplicated; locations support variants.
- Use stable element and variant IDs in UI state and persisted selections.
- Keep pack-management metadata outside this image-generation catalog.

## API And Workflow

- The server owns the Gemini API key; browser code must never collect, persist, or transmit it.
- A network request may retry at most once for a network failure.
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

## Persistence, Testing, And Delivery

- Persisted browser payloads must use the storage schema version from `src/constants.js` and be read/written through `src/services/storage.js` helpers.
- Keep pure catalog validation, variant lookup, and prompt construction independently testable for the future unit-test/CI pipeline.
- Future Supabase access should replace the catalog service boundary without changing UI selection modules.
- CI should run `npm run lint`, `npm run format:check`, and `npm test` once the test suite exists.

## Validation

- Run `npm run lint` after JavaScript or configuration changes.
- Run `npm run format:check` after changes.
- Manually verify affected browser flows, including persistence, validation, generation, error states, sharing, concurrency protection, and reset behavior.
- For server changes, verify `/generate-image`, error propagation, network failures, and inline-image handling.
