/**
 * Port Bridge — Long-lived connections between contexts
 */
export class PortBridge {
    private connections = new Map<string, chrome.runtime.Port>();

    /** Connect to a named port */
    connect(name: string): chrome.runtime.Port {
        const port = chrome.runtime.connect({ name });
        this.connections.set(name, port);
        port.onDisconnect.addListener(() => { this.connections.delete(name); });
        return port;
    }

    /** Get existing connection */
    get(name: string): chrome.runtime.Port | undefined { return this.connections.get(name); }

    /** Send on a named port */
    send(name: string, data: unknown): boolean {
        const port = this.connections.get(name);
        if (port) { port.postMessage(data); return true; }
        return false;
    }

    /** Listen for connections (background side) */
    static onConnect(name: string, handler: (port: chrome.runtime.Port) => void): void {
        chrome.runtime.onConnect.addListener((port) => { if (port.name === name) handler(port); });
    }

    /** Disconnect all */
    disconnectAll(): void {
        this.connections.forEach((port) => port.disconnect());
        this.connections.clear();
    }
}
