// Text is plain, and blank text is never taken for a real value.
import { z } from "zod";

/** Plain text never holds control characters or the byte-order mark; tab, line feed and carriage return are fine.
 *  Ruling them out also makes JavaScript and Python agree on what counts as white space, and so on what is blank. */
function isControlCharacter(code: number): boolean {
  const asciiControl = code <= 0x1f && code !== 0x09 && code !== 0x0a && code !== 0x0d;
  const c1Control = code >= 0x7f && code <= 0x9f;
  return asciiControl || c1Control || code === 0xfeff;
}

/** The same rule written as a JSON Schema pattern: at least one non-space character, and no control character. */
const PLAIN_TEXT_PATTERN = "^(?=[\\s\\S]*\\S)[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\uFEFF]*$";

/** Length in Unicode code points, as JSON Schema's minLength and maxLength count it. */
const lengthOf = (s: string) => [...s].length;

/** Text that is never blank and holds between `min` and `max` characters, counted the way JSON Schema counts them. */
export function text(min: number, max: number) {
  return z
    .string()
    .refine((s) => ![...s].some((ch) => isControlCharacter(ch.codePointAt(0)!)), { message: "holds a control character" })
    .refine((s) => s.trim().length > 0, { message: "must not be blank" })
    .refine((s) => lengthOf(s) >= min, { message: `shorter than ${min.toLocaleString("en-US")} characters` })
    .refine((s) => lengthOf(s) <= max, { message: `longer than ${max.toLocaleString("en-US")} characters` })
    .meta({ minLength: min, maxLength: max, pattern: PLAIN_TEXT_PATTERN });
}
