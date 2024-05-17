import {defineStore} from "pinia";
import {getBase, loadValue, persistValue,} from "@/util";
import {type FileContainer, useScratchStore} from "@/stores/scratchpad";
import {
    decrypt,
    deriveSymmetricKey,
    encrypt,
    getLocalPublicKeyAsJWK,
    isLocalPublicKey,
    loadCommonKey,
    storeCommonKey
} from "@/crypto";

interface WSStatusMessage {
    type: "denied";
}

interface WSKeyExchangeMessage {
    type: "key-exchange";
    key: JsonWebKey;
}

interface WSTextMessage {
    type: "text";
    iv: string;
    encrypted: string;
}

interface WSFilesMessage {
    type: "files";
    iv: string;
    encrypted: string;
}

type WSMessage = WSStatusMessage | WSKeyExchangeMessage | WSFilesMessage | WSTextMessage;

interface TextContainer {
    ts: number;
    text: string;
}

export interface Connection {
    a: JsonWebKey | null;
    b: JsonWebKey | null;
    last_text: WSTextMessage | null;
    last_files: WSFilesMessage | null;
}

export const useConnectionStore = defineStore('socket', {
    state: () => ({
        socket: null as WebSocket | null,
        connected: false,
        wanted: false,
        backoff: 1,
        key: null as CryptoKey | null,
        currentConnection: null as string | null,
        connections: [] as string[],
    }),
    actions: {
        async init() {
            this.connections = loadValue("connections") || [];
            this.currentConnection = loadValue("currentConnection");

            if (!this.currentConnection) {
                return;
            }

            this.key = await loadCommonKey(this.currentConnection);

            // open up websocket connection to receive updates
            this._connectWebsocket();

            const response = await fetch(getBase("http") + `/api/connections/${this.currentConnection}`);
            const conn: Connection = await response.json()

            // If not already done, try to derive a common key from server response.
            // If the other party is still missing, websocket will later trigger the derivation
            if (!this.key) {
                let other: JsonWebKey | null = null;

                if (await isLocalPublicKey(conn.a)) {
                    // server knows us as party A
                    other = conn.b
                } else if (await isLocalPublicKey(conn.b)) {
                    // server knows us as party B
                    other = conn.a
                } else {
                    // If we received a key at all, it has to be the other one.
                    other = conn.a || conn.b;
                    // server has not yet seen our public key so send it.
                    const payload = JSON.stringify(<WSKeyExchangeMessage>{
                        type: "key-exchange",
                        key: await getLocalPublicKeyAsJWK(),
                    });
                    if(this.socket?.readyState === WebSocket.CONNECTING) {
                        console.log("waiting for socket to open ...")
                        this.socket?.addEventListener("open", () => this.socket!.send(payload))
                    } else {
                        this.socket?.send(payload);
                    }
                }
                if (other) {
                    this.key = await deriveSymmetricKey(other);
                    await storeCommonKey(this.currentConnection, this.key);
                }
            }
            // load last server states if we have a common key
            if (this.key && conn.last_text) {
                const decrypted = await decrypt(conn.last_text.encrypted, this.key, conn.last_text.iv);
                const textContainer = <TextContainer> JSON.parse(decrypted);
                useScratchStore().remoteTextChange(textContainer.text, textContainer.ts);
            } else {
                // display a welcome message for new scratches
                useScratchStore().remoteTextChange("\nHello there!\n\nThis is your newly minted scratchpad. Have fun with it!\n", 0);
            }
            if (this.key && conn.last_files) {
                const decrypted = await decrypt(conn.last_files.encrypted, this.key, conn.last_files.iv)
                useScratchStore().files = <FileContainer[]> JSON.parse(decrypted);
            }
        },
        async changeConnection(id: string | null) {
            this._disconnectWebsocket();
            this.key = null;
            this.currentConnection = persistValue("currentConnection", id);
            useScratchStore().reset()

            if (id === null) {
                return;
            }
            if(!this.connections.includes(id)) {
                this.connections = persistValue("connections", [...this.connections, id]);
            }
            // reconnect
            await this.init();
        },
        _connectWebsocket() {
            this.wanted = true;

            // looks like we don't need to do anything
            if (this.socket && this.socket.readyState == WebSocket.OPEN && this.connected) {
                return;
            }

            this.socket = new WebSocket(getBase("ws") + `/api/ws/${this.currentConnection}`);

            this.socket.addEventListener('open', async (e) => {
                console.log("websocket open");
                this.connected = true;
                this.backoff = 1;
            });

            this.socket.addEventListener('error', (e) => {
                console.error("websocket error");
                this.connected = false;
            });

            this.socket.addEventListener('close', (e) => {
                console.info("websocket closed");
                this.connected = false;

                if (this.wanted) {
                    console.info("waiting " + this.backoff + "s for retry");
                    setTimeout(() => this._connectWebsocket(), this.backoff * 1000);
                    this.backoff *= 2;
                }
            });

            this.socket.addEventListener('message', async (msg) => {
                const scratchStore = useScratchStore();
                const data: WSMessage = JSON.parse(msg.data);

                if (data.type === "key-exchange") {
                    console.log("received public key");
                    // only derive common key if we do not already have it.
                    // guards against silently changing the key in the background.
                    if (!this.key) {
                        this.key = await deriveSymmetricKey(data.key);
                        await storeCommonKey(this.currentConnection!, this.key);
                    }
                } else if (data.type === "text") {
                    console.log("received remote text changes");
                    if (this.key) {
                        const decrypted = await decrypt(data.encrypted, this.key, data.iv);
                        const textContainer = <TextContainer> JSON.parse(decrypted);
                        scratchStore.notified = false;
                        scratchStore.remoteTextChange(textContainer.text, textContainer.ts);
                    }
                } else if (data.type === "files") {
                    console.log("received remote file changes");
                    if (this.key) {
                        const decrypted = await decrypt(data.encrypted, this.key, data.iv);
                        scratchStore.notified = false;
                        scratchStore.files = <FileContainer[]> JSON.parse(decrypted);
                    }
                } else if (data.type === "denied") {
                    this.wanted = false;
                } else {
                    console.error("unknown websocket message received")
                }
            });
        },
        _disconnectWebsocket() {
            this.wanted = false;
            if (this.socket) {
                this.socket.close();
                this.socket = null;
            }
        },
        async pushText(textContainer: TextContainer): Promise<boolean> {
            if (this.key && this.socket && this.connected) {
                console.log("sending local text changes ...")
                const textJson = JSON.stringify(textContainer);
                this.socket.send(JSON.stringify(await encrypt(textJson, "text", this.key)));
                return true;
            } else {
                console.error("could not send text");
                return false;
            }
        },
        async pushFiles(files: FileContainer[]): Promise<boolean> {
            if (this.key && this.socket && this.connected) {
                console.log("sending local file changes ...")
                const filesJson = JSON.stringify(files)
                this.socket.send(JSON.stringify(await encrypt(filesJson, "files", this.key)));
                return true;
            } else {
                console.error("could not send files");
                return false;
            }
        },
        remove() {
            this._disconnectWebsocket();

            const index = this.connections.indexOf(this.currentConnection || "");
            if (index > -1) {
                this.connections.splice(index, 1);
                persistValue("connections", this.connections);
            }
            this.key = persistValue(`${this.currentConnection}-commonKey`, null);
            this.currentConnection = persistValue("currentConnection", null);
        }
    }
});
