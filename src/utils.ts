// eslint-disable-next-line import/prefer-default-export
export const sleep = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); });
