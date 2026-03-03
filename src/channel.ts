/**
 * Named Channels — Scoped message groups for organized communication
 */
export interface ChannelOptions { name: string; prefix?: string; }

type ChannelHandler<T = unknown, R = unknown> = (data: T, sender: chrome.runtime.MessageSender) => R | Promise<R>;

export class Channel {
    private name: string;
    private handlers = new Map<string, ChannelHandler>();

    constructor(options: ChannelOptions) {
        this.name = `__ch_${options.prefix || ''}${options.name}__`;
        this.listen();
    }

    /** Send a message on this channel */
    async send<T, R = unknown>(action: string, data: T): Promise<R> {
        return chrome.runtime.sendMessage({ channel: this.name, action, data }) as Promise<R>;
    }

    /** Send to a specific tab */
    async sendToTab<T, R = unknown>(tabId: number, action: string, data: T): Promise<R> {
        return chrome.tabs.sendMessage(tabId, { channel: this.name, action, data }) as Promise<R>;
    }

    /** Handle an action on this channel */
    on<T = unknown, R = unknown>(action: string, handler: ChannelHandler<T, R>): () => void {
        this.handlers.set(action, handler as ChannelHandler);
        return () => { this.handlers.delete(action); };
    }

    /** Broadcast to all tabs */
    async broadcast<T>(action: string, data: T): Promise<void> {
        const tabs = await chrome.tabs.query({});
        await Promise.allSettled(tabs.map((tab) =>
            tab.id ? chrome.tabs.sendMessage(tab.id, { channel: this.name, action, data }) : Promise.resolve()
        ));
    }

    private listen(): void {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message?.channel !== this.name) return false;
            const handler = this.handlers.get(message.action);
            
            if (!handler) {
                const availableActions = Array.from(this.handlers.keys()).join(', ');
                const suggestion = availableActions
                    ? `\n\nAvailable actions: ${availableActions}`
                    : '\n\nNo actions have been registered yet.';
                sendResponse({ 
                    __channelError: `Unknown action: '${message.action}' on channel '${this.name}'${suggestion}` 
                });
                return false;
            }

            try {
                const result = handler(message.data, sender);
                if (result instanceof Promise) {
                    result
                        .then(sendResponse)
                        .catch((error) => {
                            const errMsg = error instanceof Error 
                                ? `${error.name}: ${error.message}\nStack: ${error.stack}`
                                : String(error);
                            sendResponse({ __channelError: errMsg });
                        });
                    return true;
                }
                sendResponse(result);
            } catch (error) {
                const errMsg = error instanceof Error 
                    ? `${error.name}: ${error.message}\nStack: ${error.stack}`
                    : String(error);
                sendResponse({ __channelError: errMsg });
            }
            return false;
        });
    }
}
