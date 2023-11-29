/* eslint-disable import/prefer-default-export */
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const exists = async (path: string) => !!(await fs.stat(path).catch(() => false));

export const tmpDir = await fs.mkdtemp(join(tmpdir(), 'discord-media-'));
