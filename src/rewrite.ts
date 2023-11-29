const rewrites: [RegExp, string][] = [
  [/instagram.com\/reels\//i, 'instagram.com/reel/'],
];

export default function rewrite(content: string) {
  let rewritten = '';
  for (const [find, replace] of rewrites) rewritten = content.replace(find, replace);
  return rewritten;
}
