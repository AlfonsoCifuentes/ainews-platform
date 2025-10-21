export function getLocalizedField<T extends Record<string, unknown>>(
  entity: T,
  baseKey: string,
  locale: 'en' | 'es'
): unknown {
  const localizedKey = `${baseKey}_${locale}`;
  return entity[localizedKey];
}

export function getLocalizedString<T extends Record<string, unknown>>(
  entity: T,
  baseKey: string,
  locale: 'en' | 'es'
): string {
  const value = getLocalizedField(entity, baseKey, locale);
  if (typeof value === 'string') {
    return value;
  }
  return '';
}
