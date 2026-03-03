# webext-bridge

[![npm version](https://img.shields.io/npm/v/webext-bridge)](https://npmjs.com/package/webext-bridge)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![CI Status](https://img.shields.io/github/actions/workflow/status/theluckystrike/webext-bridge/ci.yml?branch=main)](https://github.com/theluckystrike/webext-bridge/actions)
[![Discord](https://img.shields.io/badge/Discord-Zovo-blueviolet.svg?logo=discord)](https://discord.gg/zovo)
[![Website](https://img.shields.io/badge/Website-zovo.one-blue)](https://zovo.one)
[![GitHub Stars](https://img.shields.io/github/stars/theluckystrike/webext-bridge?style=social)](https://github.com/theluckystrike/webext-bridge)

> A type-safe message passing library for Chrome extensions with support for content scripts, background scripts, and popup pages.

## Overview

**webext-bridge** is a type-safe message passing library designed for Chrome extensions. It provides a clean Promise-based API for communication between content scripts, background scripts, and popup pages, with automatic retry, tab-specific messaging, and broadcast support.

Part of the [Zovo](https://zovo.one) developer tools family.

## Features

- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Promise-Based** - Clean async/await API
- ✅ **Connection Management** - Built-in lifecycle handling
- ✅ **Automatic Retry** - Failed message retries
- ✅ **Tab Messaging** - Send to specific tabs
- ✅ **Broadcast** - Send to all contexts

## Installation

```bash
npm install webext-bridge
```

## Quick Start

### Setup

```javascript
// background.js or content-script.js
import { createBridge } from 'webext-bridge';

const bridge = createBridge();

// Define handlers
bridge.on('get-tab-id', (data, sender) => {
  return { tabId: sender.tab?.id };
});
```

### Send Messages

```javascript
// From popup to background
const response = await bridge.send('get-settings');

// From content script to background
const response = await bridge.send('fetch-data', { url: '...' });
```

### Tab-Specific Messaging

```javascript
// Send to specific tab
await bridge.sendToTab(tabId, 'inject-script', { code: '...' });

// Listen for messages from specific tab
bridge.on('content-event', (data, sender) => {
  console.log('From tab:', sender.tab?.id);
});
```

### Broadcast

```javascript
// Send to all contexts
bridge.broadcast('settings-changed', { theme: 'dark' });

// Listen for broadcasts
bridge.on('settings-changed', (data) => {
  updateUI(data);
});
```

## API

### createBridge(options)

```javascript
const bridge = createBridge({
  name: 'my-extension',
  timeout: 5000,
  retry: 3
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| name | string | - | Extension name for logging |
| timeout | number | 30000 | Message timeout (ms) |
| retry | number | 0 | Number of retries |

### bridge.send(message, data?)

```javascript
const response = await bridge.send('message-name', { key: 'value' });
```

### bridge.sendToTab(tabId, message, data?)

```javascript
const response = await bridge.sendToTab(tabId, 'message', data);
```

### bridge.on(message, handler)

```javascript
bridge.on('message-name', (data, sender) => {
  console.log('Message:', data);
  console.log('Sender:', sender);
  return { status: 'ok' };
});
```

### bridge.off(message, handler)

```javascript
const handler = (data) => console.log(data);
bridge.on('message', handler);
// Later
bridge.off('message', handler);
```

### bridge.broadcast(message, data?)

```javascript
bridge.broadcast('update', { count: 42 });
```

## TypeScript

```typescript
import { createBridge, MessageHandler } from 'webext-bridge';

interface DataPayload {
  id: number;
  name: string;
}

interface ResponsePayload {
  success: boolean;
}

const bridge = createBridge<{
  'get-user': { handler: (data: DataPayload) => Promise<ResponsePayload> }
}>();

// Fully typed send
const response = await bridge.send('get-user', { id: 1, name: 'John' });
```

## Use Cases

### Content Script → Background

```javascript
// content-script.js
const bridge = createBridge();

document.addEventListener('click', async () => {
  const result = await bridge.send('track-event', {
    action: 'button_click'
  });
});
```

```javascript
// background.js
bridge.on('track-event', async (data) => {
  await analytics.track(data.action);
  return { tracked: true };
});
```

### Popup → Content Script

```javascript
// popup.js
import { createBridge } from 'webext-bridge';

const bridge = createBridge();

// Get current tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

// Send to content script
const result = await bridge.sendToTab(tab.id, 'get-page-data');
```

## Browser Support

- Chrome 80+
- Edge 80+

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/bridge-feature`
3. **Make** your changes
4. **Test** your changes: `npm test`
5. **Commit** your changes: `git commit -m 'Add new feature'`
6. **Push** to the branch: `git push origin feature/bridge-feature`
7. **Submit** a Pull Request

## Built by Zovo

Part of the [Zovo](https://zovo.one) developer tools family — privacy-first Chrome extensions built by developers, for developers.

## See Also

### Related Zovo Repositories

- [webext-reactive-store](https://github.com/theluckystrike/webext-reactive-store) - State management
- [chrome-storage-plus](https://github.com/theluckystrike/chrome-storage-plus) - Type-safe storage
- [chrome-extension-starter-mv3](https://github.com/theluckystrike/chrome-extension-starter-mv3) - Extension template
- [zovo-extension-template](https://github.com/theluckystrike/zovo-extension-template) - Privacy-first template

### Zovo Chrome Extensions

- [Zovo Tab Manager](https://chrome.google.com/webstore/detail/zovo-tab-manager) - Manage tabs efficiently
- [Zovo Focus](https://chrome.google.com/webstore/detail/zovo-focus) - Block distractions
- [Zovo Permissions Scanner](https://chrome.google.com/webstore/detail/zovo-permissions-scanner) - Check extension privacy grades

Visit [zovo.one](https://zovo.one) for more information.

## License

MIT — [Zovo](https://zovo.one)

---

*Built by developers, for developers. No compromises on privacy.*
