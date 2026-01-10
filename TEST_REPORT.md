# Test Coverage Analysis

## Overview
This document analyzes the current test suite for TabSense, focusing on what is covered (functionality, edge cases, error handling) and what is not (gaps, limitations).

## 1. Unit Tests

### `src/services/llmService.js`
**Covered:**
- **Functionality**: Configuration retrieval, merging user settings with defaults.
- **Edge Cases**: Empty storage, missing keys, null/undefined/short API keys.
- **Error Handling**: Gracefully handles `chrome.storage` failures by reverting to default configuration.

### `src/utils/uiUtils.js`
**Covered:**
- **Functionality**: URL truncation, emoji mapping, favicon generation.
- **Edge Cases**: Complex URLs (query params, trailing slashes), invalid URL strings, unknown colors/categories.
- **Error Handling**: `truncateUrl` returns an empty string for invalid inputs instead of crashing.

### `src/ml/classifier.js`
**Covered:**
- **Functionality**: Initialization sequence, rule-based fallback classification, domain extraction.
- **Edge Cases**: Basic URL parsing.
- **Error Handling**: None explicitly tested in the current suite.

### `src/services/chromeApi.js`
**Covered:**
- **Functionality**: Message passing wrappers for `getAllTabs`, `groupTabs`, and chat stream connection.
- **Edge Cases**: None.
- **Error Handling**: Chat stream handles 'error' messages from the backend.

## 2. E2E Tests (Playwright)
**Covered:**
- **Functionality**: Basic browser page loading (sanity check).

## What is Possible vs. Not Possible

### ✅ Possible (Verified by Tests)
- **Configuration Robustness**: The application will reliably load default settings if user settings are corrupted or the storage API fails.
- **Input Sanitization**: UI utilities safely handle malformed URLs and unknown category labels without crashing the UI.
- **Basic ML Initialization**: The classifier can initialize its dependencies (mocked).
- **Fallback Logic**: If the ML model isn't ready, the rule-based classifier works correctly.

### ❌ Not Possible (Gaps / Not Tested)
- **Real ML Inference**: The actual neural network prediction is mocked. We don't know if the real model weights load correctly or if the tensor shapes are correct in the production build.
- **Extension Integration**:
    - **Popup Rendering**: We haven't tested if the React popup actually renders in the extension context.
    - **Background Script Communication**: We haven't verified that `chrome.runtime.sendMessage` actually reaches the background script listeners.
- **Complex Error Scenarios**:
    - **ML Model Crash**: What if `tf.predict` throws an out-of-memory error? This is not tested.
    - **Chrome API Failures**: What if `chrome.runtime.lastError` is set during a message send? The current wrappers might hang or reject, but this behavior isn't fully verified.
- **State Persistence**: We verify `saveModelWeights` logic in code, but don't test if data actually persists across browser restarts.

## Recommendations
1. **Enhance Classifier Tests**: Add a test case where `model.predict` throws an error to verify it falls back to rule-based classification.
2. **Mock Chrome Errors**: Update `chromeApi.test.js` to simulate `chrome.runtime.lastError` and ensure promises are rejected properly.
3. **Expand E2E**: Use a specialized Playwright harness to load the unpacked extension and test the actual popup UI.
