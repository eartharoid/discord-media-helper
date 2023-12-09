import Flags from './index.js';

/* eslint-disable no-bitwise */
const flatset = {
  // 1 << n = 2^n (^ as in power of, not XOR)
  RETURNS_RAW_URL: 1 << 0, // 0b1
  RUN_ON_MESSAGE: 1 << 1, // 0b10
  RUN_ON_INTERACTION: 1 << 2, // 0b100
};

// new Flags<keyof typeof flatset>(flatset, [])
export default class HandlerFlags extends Flags<keyof typeof flatset> {
  constructor(flags: (keyof typeof flatset)[] = []) {
    super(flatset, flags);
  }
}
