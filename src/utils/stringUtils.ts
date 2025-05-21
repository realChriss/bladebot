import unidecode from "unidecode";

export function normalizeString(str: string): string {
  const chars = [...str.normalize("NFKD").trim()];

  const result = [];

  for (const char of chars) {
    if (/\p{Emoji}/u.test(char)) {
      continue;
    }

    if (/^[\x00-\x7F]$/.test(char) && !/^\d$/.test(char)) {
      result.push(char);
      continue;
    }

    if (
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Arabic}\p{Script=Cyrillic}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Greek}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Malayalam}\p{Script=Gujarati}\p{Script=Kannada}]/u.test(
        char,
      )
    ) {
      result.push(char);
      continue;
    }

    const decoded = unidecode(char);

    if (decoded === "[?]" || decoded === "") {
      result.push(char);
      continue;
    }

    result.push(decoded);
  }

  return result.join("");
}
