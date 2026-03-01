# webext-bridge — Cross-Context Messaging for Chrome Extensions

[![npm](https://img.shields.io/npm/v/webext-bridge.svg)](https://www.npmjs.com/package/webext-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-green.svg)]()

> **Built by [Zovo](https://zovo.one)** — powering messaging in 18+ Chrome extensions

**Type-safe messaging between popup ↔ background ↔ content scripts.** Named channels, request/response RPC, persistent streams, and port management. Zero dependencies.

## 📦 Install
```bash
npm install webext-bridge
```

## 🚀 Quick Start
```typescript
import { Bridge } from 'webext-bridge';
// Background
const bg = new Bridge('background');
bg.on('getUser', () => ({ name: 'Mike', plan: 'pro' }));
// Popup
const popup = new Bridge('popup');
const user = await popup.send('getUser', null);
```

## ✨ Features
- **Bridge** — Context-aware messaging with automatic routing
- **Channels** — Named message groups with broadcast
- **Request/Response** — Promise-based RPC with error handling
- **Streams** — Persistent port connections for continuous data
- **Port Manager** — Long-lived connection management

## 📄 License
MIT — [Zovo](https://zovo.one)
