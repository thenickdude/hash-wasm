# hash-wasm

[![npm package](https://img.shields.io/npm/v/hash-wasm.svg)](http://npmjs.org/package/hash-wasm)
[![Bundle size](https://badgen.net/bundlephobia/minzip/hash-wasm)](https://bundlephobia.com/result?p=hash-wasm)
[![codecov](https://codecov.io/gh/Daninet/hash-wasm/branch/master/graph/badge.svg)](https://codecov.io/gh/Daninet/hash-wasm)
[![Build status](https://github.com/Daninet/hash-wasm/workflows/Build%20&%20publish/badge.svg?branch=master)](https://github.com/Daninet/hash-wasm/actions)
[![JSDelivr downloads](https://data.jsdelivr.com/v1/package/npm/hash-wasm/badge)](https://www.jsdelivr.com/package/npm/hash-wasm)

Hash-WASM is a ⚡lightning fast⚡ hash function library for browsers and Node.js.
It is using hand-tuned WebAssembly binaries to calculate the hash faster than other libraries.

Supported algorithms
=======

| Name                                           | Bundle size (gzipped) |
|------------------------------------------------|-----------------------|
| Argon2: Argon2d, Argon2i, Argon2id (v1.3)      | 11 kB                 |
| bcrypt                                         | 11 kB                 |
| BLAKE2b                                        | 6 kB                  |
| BLAKE2s                                        | 5 kB                  |
| BLAKE3                                         | 9 kB                  |
| CRC32                                          | 3 kB                  |
| HMAC                                           | -                     |
| MD4                                            | 4 kB                  |
| MD5                                            | 4 kB                  |
| PBKDF2                                         | -                     |
| RIPEMD-160                                     | 5 kB                  |
| scrypt                                         | 10 kB                 |
| SHA-1                                          | 5 kB                  |
| SHA-2: SHA-224, SHA-256                        | 7 kB                  |
| SHA-2: SHA-384, SHA-512                        | 8 kB                  |
| SHA-3: SHA3-224, SHA3-256, SHA3-384, SHA3-512  | 4 kB                  |
| Keccak-224, Keccak-256, Keccak-384, Keccak-512 | 4 kB                  |
| SM3                                            | 4 kB                  |
| Whirlpool                                      | 6 kB                  |
| xxHash32                                       | 3 kB                  |
| xxHash64                                       | 4 kB                  |

Features
=======

- A lot faster than other JS / WASM implementations (see [benchmarks](#benchmark) below)
- It's lightweight. See the table above
- Compiled from heavily optimized algorithms written in C
- Supports all modern browsers, Node.js and Deno
- Supports large data streams
- Supports UTF-8 strings and typed arrays
- Supports chunked input streams
- Modular architecture (the algorithms are compiled into individual WASM binaries)
- WASM modules are bundled as base64 strings (no problems with linking)
- Supports tree shaking (Webpack only bundles the hash algorithms you use)
- Works without Webpack or other bundlers
- Includes TypeScript type definitions
- Works in Web Workers
- Zero dependencies
- Supports concurrent hash calculations with multiple states
- Supports saving and loading the internal state of the hash (segmented hashing and rewinding)
- [Unit tests](https://github.com/Daninet/hash-wasm/tree/master/test) for all algorithms
- 100% open source & transparent [build process](https://github.com/Daninet/hash-wasm/actions)
- Easy to use, Promise-based API


Installation
=======
```
npm i hash-wasm
```

It can also be used directly from HTML (via [jsDelivr](https://www.jsdelivr.com/package/npm/hash-wasm)):

```html
<!-- load all algortihms into the global `hashwasm` variable -->
<script src="https://cdn.jsdelivr.net/npm/hash-wasm@4"></script>

<!-- load individual algortihms into the global `hashwasm` variable -->
<script src="https://cdn.jsdelivr.net/npm/hash-wasm@4/dist/md5.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hash-wasm@4/dist/hmac.umd.min.js"></script>
```

Examples
=======

### Demo apps

[Hash calculator](https://3w4be.csb.app/) - [source code](https://codesandbox.io/s/hash-wasm-3w4be?file=/src/App.tsx)

[MD5 file hasher using HTML5 File API](https://stackoverflow.com/a/63287199/6251760)

### Usage with the shorthand form

It is the easiest and the fastest way to calculate hashes. Use it when the input buffer is already in the memory.

```javascript
import { md5, sha1, sha512, sha3 } from 'hash-wasm';

async function run() {
  console.log('MD5:', await md5('demo'));

  const int8Buffer = new Uint8Array([0, 1, 2, 3]);
  console.log('SHA1:', await sha1(int8Buffer));
  console.log('SHA512:', await sha512(int8Buffer));

  const int32Buffer = new Uint32Array([1056, 641]);
  console.log('SHA3-256:', await sha3(int32Buffer, 256));
}

run();
```
*\* See [String encoding pitfalls](#string-encoding-pitfalls)*

*\*\* See [API reference](#api)*

### Advanced usage with streaming input

createXXXX() functions create new WASM instances with separate states, which can be used to calculate multiple hashes paralelly. They are slower compared to shorthand functions like md5(), which reuse the same WASM instance and state to do multiple calculations. For this reason, the shorthand form is always preferred when the data is already in the memory.

For the best performance, avoid calling createXXXX() functions in loops. When calculating multiple hashes sequentially, the init() function can be used to reset the internal state between runs. It is faster than creating new instances with createXXXX().

```javascript
import { createSHA1 } from 'hash-wasm';

async function run() {
  const sha1 = await createSHA1();
  sha1.init();

  while (hasMoreData()) {
    const chunk = readChunk();
    sha1.update(chunk);
  }

  const hash = sha1.digest('binary'); // returns Uint8Array
  console.log('SHA1:', hash);
}

run();
```

*\* See [String encoding pitfalls](#string-encoding-pitfalls)*

*\*\* See [API reference](#api)*

### Hashing passwords with Argon2

The recommended process for choosing the parameters can be found here: https://tools.ietf.org/html/draft-irtf-cfrg-argon2-04#section-4

```javascript
import { argon2id, argon2Verify } from 'hash-wasm';

async function run() {
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);

  const key = await argon2id({
    password: 'pass',
    salt, // salt is a buffer containing random bytes
    parallelism: 1,
    iterations: 256,
    memorySize: 512, // use 512KB memory
    hashLength: 32, // output size = 32 bytes
    outputType: 'encoded', // return standard encoded string containing parameters needed to verify the key
  });

  console.log('Derived key:', key);

  const isValid = await argon2Verify({
    password: 'pass',
    hash: key,
  });

  console.log(isValid ? 'Valid password' : 'Invalid password');
}

run();
```

*\* See [String encoding pitfalls](#string-encoding-pitfalls)*

*\*\* See [API reference](#api)*

### Hashing passwords with bcrypt

```javascript
import { bcrypt, bcryptVerify } from 'hash-wasm';

async function run() {
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);

  const key = await bcrypt({
    password: 'pass',
    salt, // salt is a buffer containing 16 random bytes
    costFactor: 11,
    outputType: 'encoded', // return standard encoded string containing parameters needed to verify the key
  });

  console.log('Derived key:', key);

  const isValid = await bcryptVerify({
    password: 'pass',
    hash: key,
  });

  console.log(isValid ? 'Valid password' : 'Invalid password');
}

run();
```

*\* See [String encoding pitfalls](#string-encoding-pitfalls)*

*\*\* See [API reference](#api)*

### Calculating HMAC

All supported hash functions can be used to calculate HMAC. For the best performance, avoid calling createXXXX() in loops (see `Advanced usage with streaming input` section above)

```javascript
import { createHMAC, createSHA3 } from 'hash-wasm';

async function run() {
  const hashFunc = createSHA3(224); // SHA3-224
  const hmac = await createHMAC(hashFunc, 'key');

  const fruits = ['apple', 'raspberry', 'watermelon'];
  console.log('Input:', fruits);

  const codes = fruits.map(data => {
    hmac.init();
    hmac.update(data);
    return hmac.digest();
  });

  console.log('HMAC:', codes);
}

run();
```

*\* See [String encoding pitfalls](#string-encoding-pitfalls)*

*\*\* See [API reference](#api)*

### Calculating PBKDF2

All supported hash functions can be used to calculate PBKDF2. For the best performance, avoid calling createXXXX() in loops (see `Advanced usage with streaming input` section above)

```javascript
import { pbkdf2, createSHA1 } from 'hash-wasm';

async function run() {
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);

  const key = await pbkdf2({
    password: 'password',
    salt,
    iterations: 1000,
    hashLength: 32,
    hashFunction: createSHA1(),
    outputType: 'hex',
  });

  console.log('Derived key:', key);
}

run();
```

*\* See [String encoding pitfalls](#string-encoding-pitfalls)*

*\*\* See [API reference](#api)*

### String encoding pitfalls

You should be aware that there may be multiple UTF-8 representations of a given string:
```js
'\u00fc' // encodes the ü character
'u\u0308' // also encodes the ü character

'\u00fc' === 'u\u0308' // false
'ü' === 'ü' // false
```

All algorithms defined in this library depend on the binary representation of the input string. Thus, it's highly recommended to normalize your strings before passing it to hash-wasm. You can use the `normalize()` built-in String function to archive this:
```js
'\u00fc'.normalize() === 'u\u0308'.normalize() // true

const te = new TextEncoder();
te.encode('u\u0308'); // Uint8Array(3) [117, 204, 136]
te.encode('\u00fc'); // Uint8Array(2) [195, 188]

te.encode('u\u0308'.normalize('NFKC')); // Uint8Array(2) [195, 188]
te.encode('\u00fc'.normalize('NFKC')); // Uint8Array(2) [195, 188]
```

You can read more about this issue here: https://en.wikipedia.org/wiki/Unicode_equivalence

### Resumable hashing

You can save the current internal state of the hash using the `.save()` function. This state may be written to disk or stored elsewhere in memory.
You can then use the `.load(state)` function to reload that state into a new instance of the hash, or back into the same instance.

This allows you to span the work of hashing a file across multiple processes (e.g. in environments with limited execution times like AWS Lambda, where large jobs need to be split across multiple invocations), or rewind the hash  to an earlier point in the stream. For example, the first process could:

```js
// first process starts hashing
const md5 = await createMD5();
md5.init();
md5.update("Hello, ");
const state = md5.save(); // save this state

// second process resumes hashing from the stored state
const md5 = await createMD5();
md5.load(state);
md5.update("world!");
console.log(md5.digest()); // Prints 6cd3556deb0da54bca060b4c39479839 = md5("Hello, world!")
```

*Note that both the saving and loading processes must be running compatible versions of the hash function (i.e. the hash function hasn't changed between the versions of hash-wasm used in the saving and loading processes). If the saved state is incompatible, `load()` will throw an exception.*

*The saved state can contain information about the input, including plaintext input bytes, so from a security perspective it must be treated with the same care as the input data itself.*

<br/>

Browser support
=====

<br/>

| Chrome | Safari | Firefox | Edge | IE            | Node.js | Deno |
|--------|--------|---------|------|---------------|---------|------|
| 57+    | 11+    | 53+     | 16+  | Not supported | 8+      | 1+   |

<br/>

Benchmark
=====

You can make your own measurements here: [link](https://daninet.github.io/hash-wasm-benchmark/)

Two scenarios were measured:
- throughput with the short form (input size = 32 bytes)
- throughput with the short form (input size = 1MB)

Results:

| MD5                         | throughput (32 bytes)    | throughput (1MB)          |
|-----------------------------|--------------------------|---------------------------|
| **hash-wasm 4.4.1**         | **57.43 MB/s**           | **596.64 MB/s**           |
| spark-md5 3.0.1 (from npm)  | 28.08 MB/s (2.0x slower) | 110.12 MB/s (5.4x slower) |
| md5-wasm 2.0.0 (from npm)   | 16.49 MB/s (3.4x slower) | 74.43 MB/s (8.0x slower)  |
| crypto-js 4.0.0 (from npm)  | 3.80 MB/s (15x slower)   | 26.70 MB/s (22x slower)   |
| node-forge 0.10.0 (from npm)| 9.28 MB/s (6.2x slower)  | 12.27 MB/s (49x slower)   |
| md5 2.3.0 (from npm)        | 7.66 MB/s (7.5x slower)  | 11.42 MB/s (52x slower)   |

#

| SHA1                        | throughput (32 bytes)   | throughput (1MB)          |
|-----------------------------|-------------------------|---------------------------|
| **hash-wasm 4.4.1**         | **47.97 MB/s**          | **649.13 MB/s**           |
| jsSHA 3.2.0 (from npm)      | 6.15 MB/s (7.8x slower) | 46.13 MB/s (14x slower)   |
| crypto-js 4.0.0 (from npm)  | 4.10 MB/s (12x slower)  | 40.36 MB/s (16x slower)   |
| sha1 1.1.1 (from npm)       | 6.86 MB/s (7.0x slower)   | 12.46 MB/s (52x slower)   |
| node-forge 0.10.0 (from npm)| 8.71 MB/s (5.5x slower) | 12.86 MB/s (50x slower)   |

#

| SHA256                       | throughput (32 bytes)   | throughput (1MB)          |
|------------------------------|-------------------------|---------------------------|
| **hash-wasm 4.4.1**          | **35.67 MB/s**          | **254.40 MB/s**           |
| sha256-wasm 2.1.2 (from npm) | 17.83 MB/s (2x slower)  | 164.13 MB/s (1.5x slower) |
| jsSHA 3.2.0 (from npm)       | 5.57 MB/s (6.4x slower) | 35.81 MB/s (7.1x slower)  |
| crypto-js 4.0.0 (from npm)   | 3.51 MB/s (10x slower)  | 36.48 MB/s (7x slower)    |
| node-forge 0.10.0 (from npm) | 6.81 MB/s (5.2x slower) | 11.91 MB/s (21x slower)   |

#

| SHA3-512                   | throughput (32 bytes)    | throughput (1MB)         |
|----------------------------|--------------------------|--------------------------|
| **hash-wasm 4.4.1**        | **22.91 MB/s**           | **177.16 MB/s**          |
| sha3-wasm 1.0.0 (from npm) | 7.16 MB/s (3.2x slower)  | 74.75 MB/s (2.4x slower) |
| sha3 2.1.4 (from npm)      | 2.00 MB/s (11x slower)   | 6.48 MB/s (27x slower)   |
| jsSHA 3.2.0 (from npm)     | 0.93 MB/s (24x slower)   | 2.09 MB/s (85x slower)   |

#

| XXHash64                     | throughput (32 bytes)    | throughput (1MB)            |
|------------------------------|--------------------------|-----------------------------|
| **hash-wasm 4.4.1**          | **88.33 MB/s**           | **12 012.74 MB/s**          |
| xxhash-wasm 0.4.1 (from npm) | 28.44 MB/s (3.1x slower) | 11 296.84 MB/s              |
| xxhashjs 0.2.2 (from npm)    | 0.37 MB/s (239x slower)  | 17.95 MB/s (669x slower)    |

#

| PBKDF2-SHA512 - 1000 iterations | operations per second (16 bytes) |
|---------------------------------|----------------------------------|
| **hash-wasm 4.4.1**             | **348 ops**                      |
| pbkdf2 3.1.1 (from npm)         | 55 ops (6.3x slower)             |
| crypto-js 4.0.0 (from npm)      | 13 ops (27x slower)              |

#

| Argon2id (m=512, t=8, p=1)       | operations per second (16 bytes) |
|----------------------------------|----------------------------------|
| **hash-wasm 4.4.1**              | **256 ops**                      |
| argon2-browser 1.15.3 (from npm) | 104 ops (2.5x slower)            |
| argon2-wasm 0.9.0 (from npm)     | 101 ops (2.5x slower)            |
| argon2-wasm-pro 1.1.0 (from npm) | 100 ops (2.5x slower)            |

<br/>

\* These measurements were made with `Chrome v89` on a Kaby Lake desktop CPU.

API
=====

```ts
type IDataType = string | Buffer | Uint8Array | Uint16Array | Uint32Array;

// all functions return hash in hex format
blake2b(data: IDataType, bits?: number, key?: IDataType): Promise<string> // default is 512 bits
blake2s(data: IDataType, bits?: number, key?: IDataType): Promise<string> // default is 256 bits
blake3(data: IDataType, bits?: number, key?: IDataType): Promise<string> // default is 256 bits
crc32(data: IDataType): Promise<string>
keccak(data: IDataType, bits?: 224 | 256 | 384 | 512): Promise<string> // default is 512 bits
md4(data: IDataType): Promise<string>
md5(data: IDataType): Promise<string>
ripemd160(data: IDataType): Promise<string>
sha1(data: IDataType): Promise<string>
sha224(data: IDataType): Promise<string>
sha256(data: IDataType): Promise<string>
sha3(data: IDataType, bits?: 224 | 256 | 384 | 512): Promise<string> // default is 512 bits
sha384(data: IDataType): Promise<string>
sha512(data: IDataType): Promise<string>
sm3(data: IDataType): Promise<string>
whirlpool(data: IDataType): Promise<string>
xxhash32(data: IDataType, seed?: number): Promise<string>
xxhash64(data: IDataType, seedLow?: number, seedHigh?: number): Promise<string>

interface IHasher {
  init: () => IHasher;
  update: (data: IDataType) => IHasher;
  digest: (outputType: 'hex' | 'binary') => string | Uint8Array; // by default returns hex string
  save: () => Uint8Array; // returns the internal state for later resumption
  load: (state: Uint8Array) => IHasher; // loads a previously saved internal state
  blockSize: number; // in bytes
  digestSize: number; // in bytes
}

createBLAKE2b(bits?: number, key?: IDataType): Promise<IHasher> // default is 512 bits
createBLAKE2s(bits?: number, key?: IDataType): Promise<IHasher> // default is 256 bits
createBLAKE3(bits?: number, key?: IDataType): Promise<IHasher> // default is 256 bits
createCRC32(): Promise<IHasher>
createKeccak(bits?: 224 | 256 | 384 | 512): Promise<IHasher> // default is 512 bits
createMD4(): Promise<IHasher>
createMD5(): Promise<IHasher>
createRIPEMD160(): Promise<IHasher>
createSHA1(): Promise<IHasher>
createSHA224(): Promise<IHasher>
createSHA256(): Promise<IHasher>
createSHA3(bits?: 224 | 256 | 384 | 512): Promise<IHasher> // default is 512 bits
createSHA384(): Promise<IHasher>
createSHA512(): Promise<IHasher>
createSM3(): Promise<IHasher>
createWhirlpool(): Promise<IHasher>
createXXHash32(seed: number): Promise<IHasher>
createXXHash64(seedLow: number, seedHigh: number): Promise<IHasher>

createHMAC(hashFunction: Promise<IHasher>, key: IDataType): Promise<IHasher>

pbkdf2({
  password: IDataType, // password (or message) to be hashed
  salt: IDataType, // salt (usually containing random bytes)
  iterations: number, // number of iterations to perform
  hashLength: number, // output size in bytes
  hashFunction: Promise<IHasher>, // the return value of a function like createSHA1()
  outputType?: 'hex' | 'binary', // by default returns hex string
}): Promise<string | Uint8Array>

scrypt({
  password: IDataType, // password (or message) to be hashed
  salt: IDataType, // salt (usually containing random bytes)
  costFactor: number, // CPU/memory cost - must be a power of 2 (e.g. 1024)
  blockSize: number, // block size parameter (8 is commonly used)
  parallelism: number, // degree of parallelism
  hashLength: number, // output size in bytes
  outputType?: 'hex' | 'binary', // by default returns hex string
}): Promise<string | Uint8Array>

interface IArgon2Options {
  password: IDataType; // password (or message) to be hashed
  salt: IDataType; // salt (usually containing random bytes)
  iterations: number; // number of iterations to perform
  parallelism: number; // degree of parallelism
  memorySize: number; // amount of memory to be used in kibibytes (1024 bytes)
  hashLength: number; // output size in bytes
  outputType?: 'hex' | 'binary' | 'encoded'; // by default returns hex string
}

argon2i(options: IArgon2Options): Promise<string | Uint8Array>
argon2d(options: IArgon2Options): Promise<string | Uint8Array>
argon2id(options: IArgon2Options): Promise<string | Uint8Array>

argon2Verify({
  password: IDataType, // password
  hash: string, // encoded hash
}): Promise<boolean>

bcrypt({
  password: IDataType, // password
  salt: IDataType, // salt (16 bytes long - usually containing random bytes)
  costFactor: number, // number of iterations to perform (4 - 31)
  outputType?: 'hex' | 'binary' | 'encoded', // by default returns encoded string
}): Promise<string | Uint8Array>

bcryptVerify({
  password: IDataType, // password
  hash: string, // encoded hash
}): Promise<boolean>

```

Future plans
=====

- Add more well-known algorithms
- Write a polyfill which keeps bundle sizes low and enables running binaries containing newer WASM instructions
- Use WebAssembly Bulk Memory Operations
- Use WebAssembly SIMD instructions (expecting a 10-20% performance increase)
- Enable multithreading where it's possible (like at Argon2)
