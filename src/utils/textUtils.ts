/**
 * Fast single-pass scan to count words in a string, avoiding array
 * allocations and regex execution overhead.
 */
export const countWords = (text?: string): number => {
  if (!text) return 0;
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    // Fast single-pass scan avoiding string allocations and regex overhead
    const code = text.charCodeAt(i);
    // ASCII whitespace/control, NBSP, and CJK ideographic space.
    if (code > 32 && code !== 160 && code !== 12288) {
      if (!inWord) {
        inWord = true;
        count++;
      }
    } else {
      inWord = false;
    }
  }
  return count;
};
