/* eslint-disable import/prefer-default-export */
import { promises as fs } from 'fs';

export const exists = async (path: string) => !!(await fs.stat(path).catch(() => false));
