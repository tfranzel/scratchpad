import BitSet from "bitset";
import {mnemonics} from "@/mnemonic";
import {bytesToBase64, base64ToArrayBuffer, base64ToBytes} from "@/util";

export async function getLocalPrivateKey(): Promise<CryptoKey> {
    return (await getLocalKeypair()).privateKey
}

export async function getLocalPublicKey(): Promise<CryptoKey> {
    return (await getLocalKeypair()).publicKey
}

export async function getLocalPublicKeyAsJWK(): Promise<JsonWebKey> {
    return await window.crypto.subtle.exportKey("jwk", await getLocalPublicKey())
}

export async function isLocalPublicKey(other: JsonWebKey | null): Promise<boolean> {
    if (!other) {
        return false;
    }
    const localKey = await getLocalPublicKeyAsJWK();
    return localKey.x === other.x && localKey.y === other.y;
}

async function getLocalKeypair(): Promise<CryptoKeyPair> {
    const localKeypair = localStorage.getItem("localKeypair");

    if (localKeypair) {
        const parsedLocalKeypair = JSON.parse(localKeypair);
        return {
            privateKey: await importKey(parsedLocalKeypair.privateKey),
            publicKey: await importKey(parsedLocalKeypair.publicKey),
        }
    } else {
        return await generateLocalKeypair();
    }
}

async function generateLocalKeypair(): Promise<CryptoKeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-384",
        },
        true,
        ["deriveKey"],
    );
    localStorage.setItem("localKeypair", JSON.stringify({
        privateKey: await window.crypto.subtle.exportKey("jwk", keyPair.privateKey),
        publicKey: await window.crypto.subtle.exportKey("jwk", keyPair.publicKey),
    }));
    return keyPair;
}

async function importKey(jsonWebKey: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
        "jwk",
        jsonWebKey,
        {
            name: "ECDH",
            namedCurve: "P-384",
        },
        true,
        jsonWebKey.key_ops as KeyUsage[],
    )
}

export async function deriveSymmetricKey(otherPublicKey: JsonWebKey): Promise<CryptoKey> {
    return await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: await importKey(otherPublicKey),
        },
        await getLocalPrivateKey(),
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    )
}

export async function loadCommonKey(id: string): Promise<CryptoKey | null> {
    const commonKey = localStorage.getItem(`${id}-commonKey`)
    if (!commonKey) {
        return null;
    }
    return await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(commonKey),
        {
            name: "AES-GCM",
            length: 256,
        },
        true,
        ["encrypt", "decrypt"],
    );
}

export async function storeCommonKey(id: string, key: CryptoKey) {
    localStorage.setItem(`${id}-commonKey`, JSON.stringify(
        await window.crypto.subtle.exportKey("jwk", key)
    ));
}

export async function encrypt(cleartext: string, type: string, key: CryptoKey) {
    const ivArray = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {name: "AES-GCM", iv: ivArray},
        key,
        new TextEncoder().encode(cleartext),
    );
    return {
        type: type,
        encrypted: bytesToBase64(new Uint8Array(encryptedBuffer)),
        iv: bytesToBase64(ivArray),
    }
}

export async function decrypt(ciphertext: string, key: CryptoKey, iv: string) {
    const ivArray = base64ToBytes(iv);
    const cleartextBuf = await window.crypto.subtle.decrypt(
        {name: "AES-GCM", iv: ivArray},
        key,
        base64ToArrayBuffer(ciphertext),
    );
    return new TextDecoder().decode(cleartextBuf)
}

export async function generateKeyMnemonic(key: CryptoKey): Promise<string[]> {
    const jsonWebKey = await window.crypto.subtle.exportKey("jwk", key)
    // JWK does encode to base64 url-encoded, translate for atob()
    const keyBase64 = jsonWebKey.k!.replace(/-/g, '+').replace(/_/g, '/');
    // Build uint8 array from key binary string
    const keyArray = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    const keyBitArray = new BitSet(keyArray)
    const words = [];

    for (let x = 0; x < 26; x++) {
        const slice = keyBitArray.slice(x * 10, (x + 1) * 10);
        const wordIdx = parseInt(slice.toString(2), 2);
        words.push(mnemonics[wordIdx]);
    }
    return words;
}
