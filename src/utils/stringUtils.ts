export function normalizeToAscii(str: string): string {
  return str
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
