# MCP Fitbit Server - Remaining Tasks

This document outlines the remaining improvement opportunities for the MCP Fitbit server.

## Remaining Tasks & New Feature Implementation

**Test Coverage Improvement (Priority: High)**
*   **T1: Analyze existing test (`profile.test.ts`) and testing setup:** (✅ Completed)
    *   *Findings:* `profile.test.ts` uses Vitest with effective mocking of `utils.js` (for `registerTool` and `handleFitbitApiCall`). It tests tool registration, handler logic, error handling, and parameter/schema validation. This structure can serve as a template for other test files.
    *   *Framework:* Vitest is already integrated (`package.json` scripts for `test`, `test:coverage`, etc.).
*   **T2: Confirm Vitest configuration for full module coverage:** (✅ Completed) Ensure `vitest.config.ts` is set up to include all `src/*.ts` files (excluding `*.test.ts` and `config.ts` if not directly testable) in coverage reports. Mark as complete once verified/updated.
*   **T3: Write unit tests for `src/weight.ts`:** (✅ Completed) Cover API call construction and data handling.
*   **T4: Write unit tests for `src/sleep.ts`:** (✅ Completed) Cover API call construction and data handling.
*   **T5: Write unit tests for `src/activities.ts`:** (✅ Completed) Cover API call construction and data handling.
*   **T6: Write unit tests for `src/heart-rate.ts`:** (✅ Completed) Cover API call construction and data handling for both endpoint types.
*   **T7: Write unit tests for `src/nutrition.ts`:** (✅ Completed) Cover API call construction and data handling for all nutrition endpoints.
*   **T8: Write unit tests for `src/profile.ts`:** (✅ Completed) Expand existing tests if necessary.
*   **T9: Write unit tests for `src/utils.ts`:** Test `makeFitbitRequest` and any other utility functions.
*   **T10: Write unit tests for `src/auth.ts`:** Focus on token handling, OAuth flow initiation, and request signing.
*   **T11: Write unit tests for `src/index.ts`:** (✅ Completed) Test tool registration and server setup.
*   **T12: Document testing strategy:** Add a section to `README.md` or a new `TESTING.md` file explaining how to run tests and the overall testing approach.
*   **T13: Achieve 80% test coverage:** Aim for a specific coverage target.

**NPM Package Publication (Priority: Medium)**
*   **N1: Research NPM publishing best practices:** Understand requirements for `package.json`, versioning, `.npmignore`, etc.
*   **N2: Update `package.json` for publication:**
    *   Ensure unique and appropriate `name`.
    *   Set initial `version` (e.g., `1.0.1` or `0.1.0` if pre-release).
    *   Add `description`, `keywords`, `author`, `license`.
    *   Specify `repository` (URL to GitHub repo).
    *   Verify `main` points to the correct entry file in `build/` (e.g., `build/index.js`).
    *   Define `files` to include (e.g., `build/`, `README.md`, `LICENSE`).
*   **N3: Create `.npmignore` file:** Exclude source files (`src/`), test files, config files (`tsconfig.json`, `eslint.config.js`, `vitest.config.ts`), `TASKS.md`, `.env`, `coverage/`, etc.
*   **N4: Enhance `README.md` for NPM:** Ensure it has clear installation and usage instructions for package consumers.
*   **N5: Perform a dry run:** Use `npm publish --dry-run` to check for issues.
*   **N6: Authenticate with NPM:** Log in to your NPM account via CLI (`npm login`).
*   **N7: Publish the package:** Run `npm publish`.
*   **N8: Document NPM package usage:** Update `README.md` with instructions on how to install and use the published package.

ToDo: Come up with new features.

## Implementation Recommendation

**Status:** 
✅ **All priority tasks completed!** 

## Design Philosophy Reminder

This MCP server is designed to be:
- **Simple and focused** - 1:1 proxy to Fitbit API
- **Local development tool** - Not a production service
- **Minimal complexity** - Easy to understand and maintain

The major refactoring work has already addressed all critical issues. The remaining tasks are minor quality-of-life improvements that should only be pursued if there's clear value.

## Contributing

When working on remaining tasks:
1. Maintain the project's simplicity
2. Avoid over-engineering solutions
3. Test with the MCP inspector
4. Update this document when completed