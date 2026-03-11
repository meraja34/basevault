declare module 'aes-js' {
  export const ModeOfOperation: {
    ctr: new (key: Uint8Array, counter: any) => {
      encrypt(data: Uint8Array): Uint8Array;
      decrypt(data: Uint8Array): Uint8Array;
    };
  };
  export class Counter {
    constructor(iv: Uint8Array);
  }
}
