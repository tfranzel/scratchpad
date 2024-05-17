export function bytesToBase64(bytes: Uint8Array): string {
    const binString = Array.from(
        bytes,
        (byte) => String.fromCodePoint(byte)
    ).join("");
    return btoa(binString);
}

export function base64ToBytes(base64: string): Uint8Array {
    const binString = atob(base64);
    return Uint8Array.from(binString, (c: string) => c.codePointAt(0)!);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binString = atob(base64);
    const buf = new ArrayBuffer(binString.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = binString.length; i < strLen; i++) {
        bufView[i] = binString.charCodeAt(i);
    }
    return buf;
}

export async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getBase(protocol: "ws" | "http"): string {
    return import.meta.env.PROD ? `${protocol}s://` + window.location.host : `${protocol}://127.0.0.1:8000`
}

export function persistValue<T>(name: string, value: T): T {
    if (value == null) {
        localStorage.removeItem(name);
    } else {
        localStorage.setItem(name, JSON.stringify(value));
    }
    return value;
}

export function loadValue(name: string): any {
    const value = localStorage.getItem(name);
    if (value == null) {
        return null;
    } else {
        return JSON.parse(value);
    }
}