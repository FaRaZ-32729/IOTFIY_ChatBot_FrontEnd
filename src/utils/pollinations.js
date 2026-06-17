const POLLINATIONS_RE =
  /https?:\/\/image\.pollinations\.ai\/prompt\/[^\s)\]"']+/gi;

export function extractPollinationsUrls(text) {
  if (!text) return [];
  const matches = text.match(POLLINATIONS_RE) || [];
  return [...new Set(matches)];
}

export function isAffirmative(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  return /^(yes|yeah|yep|yup|haan|han|ji|correct|that's right|end|finish)\b/.test(t) ||
    /\b(yes|end the chat|end chat)\b/.test(t);
}

export function isNegative(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  return /^(no|nope|nah|not really)\b/.test(t);
}
