export function parseAnnotationEnabledAttr(val: string | boolean | null | undefined) {
  if (val === true) return true;
  if (val === false || val == null) return false;
  return val === 'true' || val === '';
}
