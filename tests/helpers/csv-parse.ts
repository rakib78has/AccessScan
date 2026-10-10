/**
 * A strict RFC 4180 reader for tests: every field must be quoted, as the
 * exporter writes them, and anything else is an error. Parsing the output
 * back proves the file is well-formed, not just that it contains some text.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;

  while (i < text.length) {
    if (text.startsWith('\r\n', i)) {
      rows.push(row);
      row = [];
      i += 2;
      continue;
    }
    if (text[i] !== '"') throw new Error(`unquoted field at offset ${String(i)}`);
    i += 1;
    let field = '';
    for (;;) {
      if (i >= text.length) throw new Error('unterminated quoted field');
      if (text[i] === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        i += 1;
        break;
      }
      field += text.charAt(i);
      i += 1;
    }
    row.push(field);
    if (text[i] === ',') i += 1;
    else if (!text.startsWith('\r\n', i)) throw new Error(`unexpected character at ${String(i)}`);
  }
  if (row.length > 0) rows.push(row);
  return rows;
}
