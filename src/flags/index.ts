/* eslint-disable no-bitwise */

// https://emergent.systems/posts/bit-fields/

type Flagset<FlagNames> = {
  // eslint-disable-next-line no-unused-vars
  [key in FlagNames as string]: number;
};

export default class Flags<FlagNames extends string> {
  public flagset: Flagset<FlagNames>;

  public flags: number;

  constructor(flagset: Flagset<FlagNames>, flags: FlagNames[] = []) {
    this.flagset = flagset;
    this.flags = flags.reduce((a, b) => a | this.flagset[b], 0);
  }

  set(flag: FlagNames): void {
    this.flags |= this.flagset[flag];
  }

  unset(flag: FlagNames): void {
    this.flags ^= this.flagset[flag];
  }

  has(flag: FlagNames): boolean {
    return Boolean(this.flags & this.flagset[flag]);
  }
}
