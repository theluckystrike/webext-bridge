/**
 * Stream — Persistent connection for continuous data flow
 */
export type StreamHandler<T = unknown> = (data: T) => void;

export class Stream {
    private port: chrome.runtime.Port | null = null;
    private handlers = new Map<string, StreamHandler[]>();
    private name: string;

    constructor(name: string) { this.name = name; }

    /** Connect to a stream (from popup/content to background) */
    connect(): void {
        this.port = chrome.runtime.connect({ name: this.name });
        this.port.onMessage.addListener((msg) => {
            const handlers = this.handlers.get(msg.event) || [];
            handlers.forEach((h) => h(msg.data));
        });
        this.port.onDisconnect.addListener(() => { this.port = null; });
    }

    /** Listen for stream events */
    on<T = unknown>(event: string, handler: StreamHandler<T>): () => void {
        const handlers = this.handlers.get(event) || [];
        handlers.push(handler as StreamHandler);
        this.handlers.set(event, handlers);
        return () => {
            const list = this.handlers.get(event) || [];
            const idx = list.indexOf(handler as StreamHandler);
            if (idx !== -1) list.splice(idx, 1);
        };
    }

    /** Send data through the stream */
    emit<T>(event: string, data: T): void {
        if (this.port) this.port.postMessage({ event, data });
    }

    /** Disconnect */
    disconnect(): void {
        this.port?.disconnect();
        this.port = null;
    }

    /** Listen for incoming stream connections (background side) */
    static listen(name: string, handler: (stream: Stream, sender?: chrome.runtime.MessageSender) => void): void {
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name !== name) return;
            const stream = new Stream(name);
            stream.port = port;
            port.onMessage.addListener((msg) => {
                const handlers = stream.handlers.get(msg.event) || [];
                handlers.forEach((h) => h(msg.data));
            });
            handler(stream, port.sender);
        });
    }
}
