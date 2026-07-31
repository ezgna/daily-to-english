export function normalizeContentForHash(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeBulletPoints(value: string[], fallbackText: string) {
  const bulletPoints = value
    .map((point) => point.replace(/^[\s・\-*、。]+/g, '').trim())
    .filter((point) => point.length > 0);

  if (bulletPoints.length > 0) {
    return bulletPoints;
  }

  return [normalizeContentForHash(fallbackText) || '本文はありません。'];
}
