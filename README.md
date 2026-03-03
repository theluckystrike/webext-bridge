# webext-bridge

A type-safe message passing library for Chrome extensions with support for content scripts, background scripts, and popup pages.

## Features

- Type-safe message passing
- Promise-based API
- Connection management
- Automatic retry on failure
- Tab-specific messaging
- Broadcast to all contexts

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

## License

MIT
