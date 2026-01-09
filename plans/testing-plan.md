# TabSynth Testing Plan

A comprehensive phased testing strategy for the TabSynth Chrome extension.

## Overview

This plan outlines a systematic approach to testing TabSynth across multiple layers:
- **Phase 1**: Test Infrastructure Setup
- **Phase 2**: Unit Tests for Utilities
- **Phase 3**: React Component Tests
- **Phase 4**: Service Layer Tests
- **Phase 5**: ML Classifier Tests
- **Phase 6**: Integration Tests
- **Phase 7**: E2E Tests
- **Phase 8**: CI/CD Pipeline

---

## Phase 1: Test Infrastructure Setup

### Objective
Set up the testing framework and tools required for all subsequent phases.

### Tasks

#### 1.1 Install Testing Dependencies
```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  jest-environment-jsdom \
  @babel/preset-react \
  @babel/preset-env
```

#### 1.2 Configure Jest (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/ml/pretrained-model/**',
  ],
};
```

#### 1.3 Configure Babel (`babel.config.json`)
```json
{
  "presets": [
    "@babel/preset-env",
    ["@babel/preset-react", { "runtime": "automatic" }]
  ]
}
```

#### 1.4 Create Test Setup File (`tests/setup.js`)
```javascript
import '@testing-library/jest-dom';

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    getURL: jest.fn(),
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  },
  tabGroups: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};
```

#### 1.5 Configure Playwright (`playwright.config.js`)
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
  },
});
```

### Deliverables
- [ ] `package.json` updated with test dependencies
- [ ] `jest.config.js` created and configured
- [ ] `babel.config.json` created and configured
- [ ] `tests/setup.js` created with Chrome API mocks
- [ ] `playwright.config.js` created and configured
- [ ] `tests/` directory structure created

---

## Phase 2: Unit Tests for Utilities

### Objective
Test pure utility functions in isolation.

### Test Files

#### 2.1 `tests/unit/groupingAlgorithms.test.js`

**Functions to test:**
- `groupTabsByDomain(tabs)`
- `groupTabsByContent(tabs)`
- `mergeGroupingStrategies(domainGroups, contentGroups)`
- `getGroupColor(type)`
- `getFriendlyDomainName(domain)`

**Test cases:**
```javascript
describe('groupTabsByDomain', () => {
  test('groups tabs with same domain', () => {
    const tabs = [
      { id: 1, url: 'https://example.com/page1', title: 'Page 1' },
      { id: 2, url: 'https://example.com/page2', title: 'Page 2' },
      { id: 3, url: 'https://other.com/page', title: 'Other' },
    ];
    const groups = groupTabsByDomain(tabs);
    expect(groups).toHaveLength(1);
    expect(groups[0].tabIds).toEqual([1, 2]);
  });

  test('handles invalid URLs gracefully', () => {
    const tabs = [
      { id: 1, url: 'invalid://url', title: 'Invalid' },
      { id: 2, url: 'https://example.com/page', title: 'Valid' },
    ];
    const groups = groupTabsByDomain(tabs);
    expect(groups).toHaveLength(1);
  });

  test('filters out groups with single tab', () => {
    const tabs = [
      { id: 1, url: 'https://example.com/page1', title: 'Page 1' },
      { id: 2, url: 'https://other.com/page', title: 'Other' },
    ];
    const groups = groupTabsByDomain(tabs);
    expect(groups).toHaveLength(0);
  });
});

describe('groupTabsByContent', () => {
  test('categorizes GitHub tabs correctly', () => {
    const tabs = [
      { id: 1, url: 'https://github.com/user/repo', title: 'GitHub Repo' },
      { id: 2, url: 'https://github.com/user/repo2', title: 'GitHub Repo 2' },
    ];
    const groups = groupTabsByContent(tabs);
    expect(groups).toHaveLength(1);
    expect(groups[0].suggestedName).toContain('💻');
  });

  test('handles uncategorized tabs', () => {
    const tabs = [
      { id: 1, url: 'https://unknown.com/page1', title: 'Random Page' },
      { id: 2, url: 'https://unknown2.com/page2', title: 'Random Page 2' },
    ];
    const groups = groupTabsByContent(tabs);
    expect(groups.some(g => g.type === 'general')).toBe(true);
  });
});
```

#### 2.2 `tests/unit/uiUtils.test.js`

**Functions to test:**
- `getColorEmoji(color)`
- `getCategoryEmoji(category)`
- `truncateUrl(url, maxLength)`
- `generateFallbackFavicon()`

**Test cases:**
```javascript
describe('getColorEmoji', () => {
  test('returns correct emoji for each color', () => {
    expect(getColorEmoji('grey')).toBe('⚫');
    expect(getColorEmoji('blue')).toBe('🔵');
    expect(getColorEmoji('red')).toBe('🔴');
    expect(getColorEmoji('green')).toBe('🟢');
    expect(getColorEmoji('pink')).toBe('🟣');
  });

  test('returns default for unknown color', () => {
    expect(getColorEmoji('unknown')).toBe('⚫');
  });
});

describe('truncateUrl', () => {
  test('truncates long URLs', () => {
    const longUrl = 'https://example.com/very/long/path/that/exceeds/maximum/length';
    const truncated = truncateUrl(longUrl, 30);
    expect(truncated.endsWith('...')).toBe(true);
    expect(truncated.length).toBe(33);
  });

  test('returns domain for simple URLs', () => {
    const url = 'https://example.com';
    expect(truncateUrl(url)).toBe('example.com');
  });

  test('handles invalid URLs gracefully', () => {
    expect(truncateUrl('not-a-url')).toBe('not-a-url');
  });
});
```

### Deliverables
- [ ] `tests/unit/groupingAlgorithms.test.js` with comprehensive test coverage
- [ ] `tests/unit/uiUtils.test.js` with comprehensive test coverage

---

## Phase 3: React Component Tests

### Objective
Test React components using React Testing Library.

### Test Files

#### 3.1 `tests/components/GroupCard.test.js`

**Test cases:**
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import GroupCard from '../../src/components/GroupCard';

const mockGroup = {
  id: 'group-1',
  title: 'Test Group',
  color: 'blue',
  tabs: [
    { id: 1, title: 'Tab 1', url: 'https://example.com/1', windowId: 1 },
    { id: 2, title: 'Tab 2', url: 'https://example.com/2', windowId: 1 },
  ],
};

describe('GroupCard', () => {
  test('renders group title and tab count', () => {
    render(<GroupCard group={mockGroup} expanded={false} />);
    expect(screen.getByText('Test Group')).toBeInTheDocument();
    expect(screen.getByText('2 tabs')).toBeInTheDocument();
  });

  test('expands when clicked', () => {
    render(<GroupCard group={mockGroup} expanded={false} />);
    fireEvent.click(screen.getByTestId('group-header'));
    // Expect expanded content to be visible
  });

  test('calls onToggle when header is clicked', () => {
    const onToggle = jest.fn();
    render(<GroupCard group={mockGroup} expanded={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Test Group'));
    expect(onToggle).toHaveBeenCalledWith('group-1');
  });

  test('displays all tabs when expanded', () => {
    render(<GroupCard group={mockGroup} expanded={true} />);
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
  });

  test('handles renaming workflow', () => {
    render(<GroupCard group={mockGroup} expanded={true} />);
    const renameBtn = screen.getByRole('button', { name: /rename/i });
    fireEvent.click(renameBtn);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });
});
```

#### 3.2 `tests/components/ApiKeyInput.test.js`

**Test cases:**
```javascript
describe('ApiKeyInput', () => {
  test('renders input field', () => {
    render(<ApiKeyInput value="test-key" onChange={() => {}} />);
    expect(screen.getByPlaceholderText(/api key/i)).toBeInTheDocument();
  });

  test('calls onChange when value changes', () => {
    const onChange = jest.fn();
    render(<ApiKeyInput value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/api key/i);
    fireEvent.change(input, { target: { value: 'new-key' } });
    expect(onChange).toHaveBeenCalledWith('new-key');
  });
});
```

### Deliverables
- [ ] `tests/components/GroupCard.test.js`
- [ ] `tests/components/ApiKeyInput.test.js`
- [ ] Additional component tests as needed

---

## Phase 4: Service Layer Tests

### Objective
Test the Chrome API service with mocked Chrome API.

### Test Files

#### 4.1 `tests/services/chromeApi.test.js`

**Test cases:**
```javascript
import { chromeApi } from '../../src/services/chromeApi';

describe('ChromeApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTabs', () => {
    test('sends GET_ALL_TABS message', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        cb({ tabs: [{ id: 1, title: 'Test' }] });
      });
      
      const result = await chromeApi.getAllTabs();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'GET_ALL_TABS' },
        expect.any(Function)
      );
      expect(result.tabs).toHaveLength(1);
    });
  });

  describe('groupTabs', () => {
    test('sends GROUP_TABS message with tabIds and groupName', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        cb({ success: true });
      });
      
      const result = await chromeApi.groupTabs([1, 2, 3], 'My Group');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'GROUP_TABS', tabIds: [1, 2, 3], groupName: 'My Group' },
        expect.any(Function)
      );
      expect(result.success).toBe(true);
    });
  });

  describe('searchAllTabs', () => {
    test('sends SEARCH_ALL_TABS message with searchTerm', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        cb({ results: [{ id: 1, title: 'Match' }] });
      });
      
      const result = await chromeApi.searchAllTabs('test query');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'SEARCH_ALL_TABS', searchTerm: 'test query' },
        expect.any(Function)
      );
      expect(result.results).toHaveLength(1);
    });
  });
});
```

### Deliverables
- [ ] `tests/services/chromeApi.test.js`

---

## Phase 5: ML Classifier Tests

### Objective
Test the ML classifier with TensorFlow.js mocking.

### Test Files

#### 5.1 `tests/ml/classifier.test.js`

**Test cases:**
```javascript
import { tabClassifier } from '../../src/ml/classifier';

// Mock TensorFlow.js
jest.mock('@tensorflow/tfjs', () => ({
  setBackend: jest.fn().mockResolvedValue('cpu'),
  ready: jest.fn().mockResolvedValue(undefined),
  getBackend: jest.fn().mockReturnValue('cpu'),
  sequential: jest.fn().mockReturnValue({
    add: jest.fn().mockReturnThis(),
    compile: jest.fn(),
  }),
  layers: {
    dense: jest.fn().mockReturnValue({
      add: jest.fn().mockReturnThis(),
      compile: jest.fn(),
    }),
    dropout: jest.fn().mockReturnValue({
      add: jest.fn().mockReturnThis(),
    }),
  },
  tensor: jest.fn(),
  oneHot: jest.fn().mockReturnValue({
    dispose: jest.fn(),
  }),
}));

describe('TabClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDomain', () => {
    test('extracts domain from valid URL', () => {
      const domain = tabClassifier.extractDomain('https://github.com/user/repo');
      expect(domain).toBe('github');
    });

    test('handles URLs with www prefix', () => {
      const domain = tabClassifier.extractDomain('https://www.example.com/page');
      expect(domain).toBe('example');
    });

    test('returns empty string for invalid URL', () => {
      const domain = tabClassifier.extractDomain('not-a-url');
      expect(domain).toBe('');
    });
  });

  describe('fallbackClassification', () => {
    test('classifies GitHub URLs correctly', () => {
      const result = tabClassifier.fallbackClassification(
        'GitHub Repo',
        'https://github.com/user/repo'
      );
      expect(result.category).toBe('Code & Development');
      expect(result.confidence).toBe(0.85);
    });

    test('classifies YouTube URLs as Video & Entertainment', () => {
      const result = tabClassifier.fallbackClassification(
        'Cool Video',
        'https://youtube.com/watch?v=123'
      );
      expect(result.category).toBe('Video & Entertainment');
    });

    test('returns General Browsing for uncategorized URLs', () => {
      const result = tabClassifier.fallbackClassification(
        'Random Page',
        'https://unknown-domain.com/page'
      );
      expect(result.category).toBe('General Browsing');
    });
  });

  describe('getCategoryEmoji', () => {
    test('returns correct emoji for each category', () => {
      expect(tabClassifier.getCategoryEmoji('Code & Development')).toBe('💻');
      expect(tabClassifier.getCategoryEmoji('Shopping')).toBe('🛒');
      expect(tabClassifier.getCategoryEmoji('General Browsing')).toBe('🌐');
    });

    test('returns default emoji for unknown category', () => {
      expect(tabClassifier.getCategoryEmoji('Unknown')).toBe('📁');
    });
  });
});
```

### Deliverables
- [ ] `tests/ml/classifier.test.js`

---

## Phase 6: Integration Tests

### Objective
Test message handlers and integration between components.

### Test Files

#### 6.1 `tests/integration/messageHandlers.test.js`

**Test cases:**
```javascript
describe('Tab Message Handlers', () => {
  test('HANDLE_CREATE_TAB_GROUP creates groups correctly', () => {
    // Test the message handler logic
    const groups = [{ tabIds: [1, 2], suggestedName: 'Test Group' }];
    // Mock chrome APIs
    chrome.tabs.group.mockImplementation((options, callback) => {
      callback(100); // mock group ID
    });
    chrome.tabGroups.update.mockImplementation((groupId, options, callback) => {
      callback();
    });
    
    // Execute and verify
    // ...
  });
});
```

### Deliverables
- [ ] `tests/integration/messageHandlers.test.js`

---

## Phase 7: End-to-End Tests

### Objective
Test the complete extension workflow using Playwright.

### Test Files

#### 7.1 `tests/e2e/popup.spec.js`

**Test cases:**
```javascript
import { test, expect } from '@playwright/test';
import path from 'path';

test('popup loads and displays groups', async ({ context }) => {
  // Load extension
  const extensionPath = path.join(__dirname, '../../dist');
  const extensionContext = await context.addExtension(extensionPath);
  
  const page = await extensionContext.newPage();
  await page.goto('chrome-extension://*/popup.html');
  
  // Verify popup loaded
  await expect(page.locator('.popup-container')).toBeVisible();
  
  // Check for group list
  await expect(page.locator('.group-list')).toBeVisible();
});

test('can create a new group', async ({ context }) => {
  const extensionContext = await context.addExtension(path.join(__dirname, '../../dist'));
  const page = await extensionContext.newPage();
  await page.goto('chrome-extension://*/popup.html');
  
  // Click create group button
  await page.click('.create-group-btn');
  
  // Verify modal appears
  await expect(page.locator('.create-group-modal')).toBeVisible();
});
```

#### 7.2 `tests/e2e/search.spec.js`

**Test cases:**
```javascript
test('search filters tabs correctly', async ({ context }) => {
  const extensionContext = await context.addExtension(path.join(__dirname, '../../dist'));
  const page = await extensionContext.newPage();
  await page.goto('chrome-extension://*/popup.html');
  
  // Type in search box
  await page.fill('.search-input', 'github');
  
  // Verify filtered results
  await expect(page.locator('.search-results .tab-item')).toHaveCount(2);
});
```

### Deliverables
- [ ] `tests/e2e/popup.spec.js`
- [ ] `tests/e2e/search.spec.js`
- [ ] `tests/e2e/groupManagement.spec.js`

---

## Phase 8: CI/CD Pipeline Setup

### Objective
Set up automated testing on every push and PR.

### Files

#### 8.1 GitHub Actions Workflow (`.github/workflows/test.yml`)

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run E2E tests
        run: npx playwright test --reporter=line
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
```

#### 8.2 Update package.json scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test tests/e2e/",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

### Deliverables
- [ ] `.github/workflows/test.yml` created
- [ ] `package.json` scripts updated

---

## Testing Strategy Summary

### Test Pyramid

```
        /\
       /E2E\         <- Fewer, focused on critical user flows
      /------\
     /Integration\   <- Test component interactions
    /------------\
   /   Unit Tests  \ <- Many, fast, test individual functions
  /----------------\
```

### Coverage Targets

| Type | Target Coverage |
|------|----------------|
| Unit Tests | 80% |
| Component Tests | 70% |
| Integration Tests | 60% |
| Overall | 75% |

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run in watch mode
npm run test:watch
```

---

## Implementation Order

1. **Phase 1**: Infrastructure Setup
2. **Phase 2**: Unit Tests (fast, foundational)
3. **Phase 3**: Component Tests
4. **Phase 4**: Service Tests
5. **Phase 5**: ML Tests
6. **Phase 6**: Integration Tests
7. **Phase 7**: E2E Tests (slower, more complex)
8. **Phase 8**: CI/CD Setup

---

## Estimated Effort

- Phase 1: Setup and configuration
- Phase 2-5: Core test implementation
- Phase 6-7: Advanced test scenarios
- Phase 8: Automation

Each phase builds on the previous, ensuring a solid testing foundation for TabSynth.
