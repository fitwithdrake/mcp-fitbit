# MCP Fitbit Server - Improvement Tasks

This document outlines identified improvements and refactoring opportunities for the MCP Fitbit server. Tasks are prioritized by impact and difficulty.

## High Priority Issues

### 1. **~~Inconsistent API Request Handling~~** ✅ **COMPLETED**
**Priority: High | Effort: Medium**

**Problem:** `src/activities.ts:64-111` has a custom `makeFitbitActivityRequest` function that duplicates logic from `utils.ts:makeFitbitRequest`. This creates maintenance overhead and inconsistent error handling patterns.

**Solution:** 
- ✅ Refactor `activities.ts` to use the shared `makeFitbitRequest` utility function
- ✅ Remove the custom `makeFitbitActivityRequest` function
- ✅ Ensure activities endpoint works with the standard utility

**Files modified:**
- ✅ `src/activities.ts` - Removed custom request function, now uses shared utility
- ✅ No changes needed to `src/utils.ts` - existing utility worked as-is

**Completion Notes:** Successfully refactored activities.ts to use makeFitbitRequest utility with explicit API base URL parameter. Eliminated 48 lines of duplicate code and standardized error handling. Tested and confirmed functionality remains intact.

### 2. **Incomplete Token Management**
**Priority: High | Effort: Medium**

**Problem:** `auth.ts:206` has a TODO comment about token expiry checking that's never implemented. The `getAccessToken()` function doesn't validate token expiry, only `initializeAuth()` does.

**Solution:**
- Move expiry checking and refresh logic into `getAccessToken()` for automatic token refresh
- Implement proper token validation before each API call
- Handle refresh token flow gracefully

**Files to modify:**
- `src/auth.ts` - Enhance `getAccessToken()` with expiry checking and auto-refresh

### 3. **Type Safety Issues**
**Priority: High | Effort: Low**

**Problem:** `auth.ts:42` uses `any` type for `tokenData`. Missing proper TypeScript interfaces for OAuth token structures.

**Solution:**
- Create proper interfaces for token data structures
- Replace `any` types with proper TypeScript interfaces
- Add type safety to token-related functions

**Files to modify:**
- `src/auth.ts` - Add token interfaces, replace `any` types

## Medium Priority Improvements

### 4. **Code Duplication & Patterns**
**Priority: Medium | Effort: High**

**Problem:** Tool registration follows repetitive patterns that could be abstracted. Similar error handling logic repeated across all tool files.

**Solution:**
- Create a base tool registration helper function
- Abstract common parameter validation patterns
- Standardize tool response formatting

**Files to modify:**
- `src/utils.ts` - Add tool registration helpers
- All tool files (`src/weight.ts`, `src/sleep.ts`, etc.) - Use new helpers

### 5. **Constants Management**
**Priority: Medium | Effort: Low**

**Problem:** API base URLs scattered across files (`utils.ts:29`, `weight.ts:5`, `sleep.ts:6`, etc.).

**Solution:**
- Create a centralized config file for all constants
- Define API base URLs, scopes, and other constants in one place
- Import constants from centralized location

**Files to create:**
- `src/config.ts` - Centralized constants

**Files to modify:**
- All tool files - Import constants from config

### 6. **Error Handling Standardization**
**Priority: Medium | Effort: Medium**

**Problem:** Inconsistent error message formats and detail levels. Some tools provide detailed API errors, others don't.

**Solution:**
- Standardize error response format across all tools
- Create consistent error logging patterns
- Improve error message quality and debugging information

**Files to modify:**
- `src/utils.ts` - Enhance error handling utilities
- All tool files - Use standardized error handling

## Security & Reliability

### 7. **Token Storage Security**
**Priority: Medium | Effort: High**

**Problem:** `auth.ts:47` stores tokens in plain text JSON file.

**Solution:**
- Consider token encryption for local storage
- Investigate secure storage options
- Add file permission restrictions

**Files to modify:**
- `src/auth.ts` - Implement secure token storage

### 8. **Environment Validation**
**Priority: Medium | Effort: Low**

**Problem:** No validation that required environment variables exist before server starts.

**Solution:**
- Add startup validation for required configuration
- Provide clear error messages for missing environment variables
- Validate environment early in the startup process

**Files to modify:**
- `src/index.ts` - Add environment validation
- `src/config.ts` - Environment validation utilities

### 9. **Rate Limiting Protection**
**Priority: Low | Effort: High**

**Problem:** No protection against Fitbit API rate limits.

**Solution:**
- Add request throttling/queuing mechanism
- Implement exponential backoff for failed requests
- Monitor and respect API rate limits

**Files to modify:**
- `src/utils.ts` - Add rate limiting to request utility

## Development & Tooling

### 10. **Missing Development Tools**
**Priority: Medium | Effort: Low**

**Problem:** No linting, formatting, or proper testing setup in `package.json:10`.

**Solution:**
- Add ESLint for code quality
- Add Prettier for code formatting
- Set up Jest or Vitest for testing
- Add pre-commit hooks

**Files to modify:**
- `package.json` - Add dev dependencies and scripts
- Add configuration files (`.eslintrc.js`, `.prettierrc`, `jest.config.js`)

### 11. **Build Configuration**
**Priority: Low | Effort: Low**

**Problem:** TypeScript config could be optimized for better type checking.

**Solution:**
- Add stricter compiler options
- Enable source maps for better debugging
- Add path mapping for cleaner imports

**Files to modify:**
- `tsconfig.json` - Enhance compiler options

## Architectural Improvements

### 12. **Interface Abstraction**
**Priority: Low | Effort: Medium**

**Problem:** Common response structures could be shared between tools. Tool parameter validation patterns could be abstracted.

**Solution:**
- Create shared type definitions for common structures
- Abstract parameter validation helpers
- Reduce code duplication through better abstractions

**Files to create:**
- `src/types.ts` - Shared type definitions
- `src/validation.ts` - Parameter validation helpers

### 13. **Logging Strategy**
**Priority: Low | Effort: Medium**

**Problem:** Current logging uses `console.error` throughout - not ideal for production.

**Solution:**
- Implement proper logging levels (debug, info, warn, error)
- Add structured logging with consistent format
- Consider logging libraries for better control

**Files to modify:**
- `src/utils.ts` - Add logging utilities
- All files - Replace console.error with proper logging

## Implementation Priority

**Phase 1 (High Impact, Low Effort):**
1. Type Safety Issues (#3)
2. Constants Management (#5)  
3. Environment Validation (#8)
4. Missing Development Tools (#10)

**Phase 2 (High Impact, Medium Effort):**
1. Incomplete Token Management (#2)
2. Inconsistent API Request Handling (#1)
3. Error Handling Standardization (#6)

**Phase 3 (Long-term improvements):**
1. Code Duplication & Patterns (#4)
2. Token Storage Security (#7)
3. Interface Abstraction (#12)
4. Logging Strategy (#13)
5. Rate Limiting Protection (#9)
6. Build Configuration (#11)

## Contributing

When working on these tasks:
1. Follow the existing code style and patterns
2. Update relevant documentation 
3. Test changes thoroughly with the MCP inspector
4. Ensure backward compatibility with existing tools
5. Update this document when tasks are completed

## Notes

- Most impactful improvements are token management, API request consolidation, and development tooling
- These address both reliability and maintainability concerns
- Consider the project's design philosophy of being a 1:1 JSON proxy to the Fitbit API when implementing changes