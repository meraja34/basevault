declare module 'aes-js' {
  export class CTR {
    constructor(key: Uint8Array, counter: Uint8Array);
    encrypt(data: Uint8Array): Uint8Array;
    decrypt(data: Uint8Array): Uint8Array;
  }
}
