/**
 * Stream — Persistent connection for continuous data flow
 */
export type StreamHandler<T = unknown> = (data: T) => void;

/**
 * Stream error event handler type
 */
export type StreamErrorHandler = (error: Error, eventName: string) => void;

export class Stream {
    private port: chrome.runtime.Port | null = null;
    private handlers = new Map<string, StreamHandler[]>();
    private errorHandlers: StreamErrorHandler[] = [];
    private name: string;

    constructor(name: string) { this.name = name; }

    /** Connect to a stream (from popup/content to background) */
    connect(): void {
        this.port = chrome.runtime.connect({ name: this.name });
        
        // Handle disconnection with error information
        this.port.onDisconnect.addListener(() => {
            const error = chrome.runtime.lastError 
                ? new Error(chrome.runtime.lastError.message || 'Port disconnected')
                : new Error(`Stream '${this.name}' disconnected unexpectedly`);
            this.notifyErrorHandlers(error, '*');
            this.port = null;
        });

        this.port.onMessage.addListener((msg) => {
            const handlers = this.handlers.get(msg.event) || [];
            handlers.forEach((h) => {
                try {
                    h(msg.data);
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error(`[webext-bridge] Stream handler error for '${msg.event}':`, err);
                    this.notifyErrorHandlers(err, msg.event);
                }
            });
        });
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

    /** Listen for errors in stream handlers */
    onError(handler: StreamErrorHandler): () => void {
        this.errorHandlers.push(handler);
        return () => {
            const idx = this.errorHandlers.indexOf(handler);
            if (idx !== -1) this.errorHandlers.splice(idx, 1);
        };
    }

    /** Notify error handlers of an error */
    private notifyErrorHandlers(error: Error, eventName: string): void {
        this.errorHandlers.forEach((h) => {
            try {
                h(error, eventName);
            } catch (handlerError) {
                console.error('[webext-bridge] Error in error handler:', handlerError);
            }
        });
    }

    /** Send data through the stream */
    emit<T>(event: string, data: T): void {
        if (!this.port) {
            throw new Error(`Stream '${this.name}' is not connected. Call .connect() first or check if the extension context is valid.`);
        }
        try {
            this.port.postMessage({ event, data });
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`[webext-bridge] Failed to emit '${event}':`, err);
            this.notifyErrorHandlers(err, event);
            throw err;
        }
    }

    /** Check if stream is connected */
    get isConnected(): boolean {
        return this.port !== null;
    }

    /** Disconnect */
    disconnect(): void {
        if (this.port) {
            this.port.disconnect();
            this.port = null;
        }
    }

    /** Listen for incoming stream connections (background side) */
    static listen(name: string, handler: (stream: Stream, sender?: chrome.runtime.MessageSender) => void): void {
        chrome.runtime.onConnect.addListener((port) => {
            if (port.name !== name) return;
            const stream = new Stream(name);
            stream.port = port;

            // Handle disconnection
            port.onDisconnect.addListener(() => {
                stream.port = null;
            });

            port.onMessage.addListener((msg) => {
                const handlers = stream.handlers.get(msg.event) || [];
                handlers.forEach((h) => {
                    try {
                        h(msg.data);
                    } catch (error) {
                        const err = error instanceof Error ? error : new Error(String(error));
                        console.error(`[webext-bridge] Stream handler error for '${msg.event}':`, err);
                    }
                });
            });
            handler(stream, port.sender);
        });
    }
}
