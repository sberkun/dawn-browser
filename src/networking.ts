import { encrypt } from "./elgamal";


const DAWN_PORT = 8107;

// 1-byte dawn-level opcodes
const HANDSHAKE = 15; 
    // server sends handshake message with public key,
    // client sends handshake message with encrypted password
const BAD_HANDSHAKE = 16;
    // server sends bad handshake message if password is wrong
const PROTOBUF = 17;
    // forward protobufs both ways
const FILE = 18;
    // server sends file to edit
    // client sends file to upload to robot
const CONFLICT = 19;
    // server sends to indicate that another client is already connected
    // client sends to tell server to please boot off the other client
const GETOFF = 20;
    // server sends to client to tell them to close socket


export interface DawnClientEventHandler {
    on_connection(connected: boolean): void
    on_bad_handshake(): void
    on_incoming_file(contents: string): void
    on_conflict(): void
    on_getoff(): void
}


export class DawnClient {
    private socket: WebSocket | null;
    private addr: string;
    private password: string;
    private connected: boolean;
    private waiting_will_try_again: boolean;
    private event_handler: DawnClientEventHandler;

    constructor(event_handler: DawnClientEventHandler) {
        this.socket = null;
        this.addr = "";
        this.password = "";
        this.connected = false;
        this.waiting_will_try_again = false;
        this.event_handler = event_handler;
    }

    connect(addr: string, password: string) {
        this.disconnect();
        this.addr = addr;
        this.password = password;
        this.try_connect(true)
    }

    disconnect() {
        if (this.socket != null) {
            this.socket.close();
        }
        this.socket = null;
        this.addr = "";
        this.password = "";
        this.connected = false;
        this.waiting_will_try_again = false;
    }

    private try_connect(first: boolean) {
        if (this.connected || (!first && this.socket == null)) {
            return;
        }
        this.waiting_will_try_again = false;
        this.socket = new WebSocket(`ws://${this.addr}:${DAWN_PORT}`);
        this.socket.binaryType = "arraybuffer";
        const disconnect_handler = () => {
            this.connected = false;
            if (!this.waiting_will_try_again) {
                this.waiting_will_try_again = true;
                setTimeout(() => {this.try_connect(false)}, 1000);
            }
        }
        this.socket.onopen = () => {
            this.connected = true;
        }
        this.socket.onerror = disconnect_handler;
        this.socket.onclose = disconnect_handler;
        this.socket.onmessage = this.handle_incoming_message;
    }

    private handle_incoming_message(event: MessageEvent) {
        const data: Uint8Array = new Uint8Array(event.data);
        switch (data[0]) {
            case HANDSHAKE:
                this.send_encrypted_password(data.slice(1));
                break;
            case BAD_HANDSHAKE:
                this.disconnect();
                this.event_handler.on_bad_handshake();
                break;
            case PROTOBUF:
                this.handle_protobuf(data.slice(1));
                break;
            case FILE:
                const decoder = new TextDecoder();
                const contents = decoder.decode(data.slice(1));
                this.event_handler.on_incoming_file(contents);
                break;
            case CONFLICT:
                this.event_handler.on_conflict();
                break;
            case GETOFF:
                this.disconnect();
                this.event_handler.on_getoff();
                break;
            default:
                console.log(`Unknown message from server: ${data}`);
        }
    }

    private send_encrypted_password(key_bytes: Uint8Array) {
        const bb = new TextEncoder().encode(this.password);
        const encrypted = encrypt(bb, key_bytes);
        this.socket?.send(encrypted);
    }

    private handle_protobuf(data: Uint8Array) {

    }





}
