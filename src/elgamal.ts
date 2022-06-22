export {make_keypair, encrypt, decrypt}

const OUTPUT_CHUNK_SIZE = 32; // 32 bytes, or 256 bits
const INPUT_CHUNK_SIZE = 16; 
    // text is upper 16 bytes,
    // lower 15 bytes are random, 1 bytes is blank

const P = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639747"); // prime, 2**256 - 189
const G = BigInt( "95502723607822415470996255105773198448692078412280229250990790894096242318042"); // random, smaller than P - 1



function arToBigInt(ar: Uint8Array) {
    let res = BigInt(0);
    for (let a = ar.length - 1; a >= 0; a--) {
        res = res * BigInt(256);
        res = res + BigInt(ar[a]);
    }
    return res;
}

function bigIntToAr(n: bigint, num_bytes: number) {
    let res = new Uint8Array(num_bytes);
    for (let a = 0; a < res.length; a++) {
        res[a] = Number(BigInt.asUintN(8, n));
        n = n / BigInt(256);
    }
    return res;
}

function pow(base: bigint, exponent: bigint) {
    if (exponent === BigInt(0)) {
        return BigInt(1);
    }
    let res = base % P;
    let d = -1;
    while ((BigInt(1) << BigInt(d + 2)) <= exponent) {
        d += 1;
    }
    while (d >= 0) {
        res = res * res;
        if ((exponent >> BigInt(d)) & BigInt(1)) {
            res = res * base;
        }
        res = res % P;
        d -= 1;
    }
    return res;
}

function euclid_gcd(a: bigint, b: bigint) {
    let ns: bigint[] = [];
    while (a > 0 && b > 0) {
        if (a > b) {
            ns.push(a / b);
            a = a % b;
        } else {
            ns.push(b / a);
            b = b % a;
        }
    }
    let rx = a > 0 ? BigInt(1) : BigInt(0);
    let ry = b > 0 ? BigInt(1) : BigInt(0);
    let g = a > b ? a : b;
    let banana = a > b;
    for (let i = ns.length - 1; i >= 0; i--) {
        if (banana) {rx -= ns[i] * ry;}
        else        {ry -= ns[i] * rx;}
        banana = !banana;
    }
    return [rx, ry, g] as const;
}

function randomBytes(n: number) {
    return crypto.getRandomValues(new Uint8Array(n));
}

function encrypt_chunk(num: bigint, key: bigint) {
    let r = BigInt(0);
    while (r <= 5 || r >= P - BigInt(2)) {
        r = arToBigInt(randomBytes(OUTPUT_CHUNK_SIZE));
    }
    let ciphertext1 = pow(G, r);
    let ciphertext2 = (num * pow(key, r)) % P;
    return [bigIntToAr(ciphertext1, OUTPUT_CHUNK_SIZE), 
            bigIntToAr(ciphertext2, OUTPUT_CHUNK_SIZE)] as const;
}

function decrypt_chunk(c1: bigint, c2: bigint, key: bigint) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let [inverse, _unused, _one] = euclid_gcd(c1, P);
    // inverse + P because inverse could be negative
    let decrypted = (c2 * pow(inverse % P + P, key)) % P;
    let full = bigIntToAr(decrypted, OUTPUT_CHUNK_SIZE - 1);
    return full.slice(OUTPUT_CHUNK_SIZE - INPUT_CHUNK_SIZE - 1);
}

function make_keypair() {
    let b = BigInt(0);
    while (b <= 5 || b >= P - BigInt(2)) {
        b = arToBigInt(randomBytes(OUTPUT_CHUNK_SIZE));
    }
    return [bigIntToAr(pow(G, b), OUTPUT_CHUNK_SIZE), b] as const;
}

function encrypt(raw_msg: Uint8Array, public_key: Uint8Array) {
    let key = arToBigInt(public_key);

    let new_msg = new Uint8Array(raw_msg.length + INPUT_CHUNK_SIZE - (raw_msg.length % INPUT_CHUNK_SIZE));
    // new msg length is (raw_msg.length + 1) rounded up to input chunk size
    new_msg[0] = new_msg.length - (raw_msg.length + 1); // how much end padding there is
    new_msg.set(raw_msg, 1);

    let num_chunks = Math.floor(new_msg.length / INPUT_CHUNK_SIZE);
    let ciphertext = new Uint8Array(OUTPUT_CHUNK_SIZE * 2 * num_chunks);
    for (let a = 0; a < num_chunks; a++) {
        let temp = new Uint8Array(OUTPUT_CHUNK_SIZE - 1);
        let pad = randomBytes(OUTPUT_CHUNK_SIZE - INPUT_CHUNK_SIZE - 1);
        temp.set(pad, 0);
        temp.set(new_msg.slice(a * INPUT_CHUNK_SIZE, (a + 1) * INPUT_CHUNK_SIZE), pad.length);
        let [c1, c2] = encrypt_chunk(arToBigInt(temp), key);
        ciphertext.set(c1, (a * 2) * OUTPUT_CHUNK_SIZE);
        ciphertext.set(c2, (a * 2 + 1) * OUTPUT_CHUNK_SIZE);
    }
    
    return ciphertext;
}

function decrypt(encrypted_msg: Uint8Array, private_key: bigint) {
    let num_chunks = (encrypted_msg.length / (OUTPUT_CHUNK_SIZE * 2));
    let plaintext = new Uint8Array(INPUT_CHUNK_SIZE * num_chunks);
    for (let a = 0; a < num_chunks; a++) {
        let c1 = arToBigInt(encrypted_msg.slice((a*2  ) * OUTPUT_CHUNK_SIZE, (a*2+1) * OUTPUT_CHUNK_SIZE));
        let c2 = arToBigInt(encrypted_msg.slice((a*2+1) * OUTPUT_CHUNK_SIZE, (a*2+2) * OUTPUT_CHUNK_SIZE));
        plaintext.set(decrypt_chunk(c1, c2, private_key), a * INPUT_CHUNK_SIZE);
    }
    let endpoint = plaintext.length - plaintext[0];
    return plaintext.slice(1, endpoint)
}

