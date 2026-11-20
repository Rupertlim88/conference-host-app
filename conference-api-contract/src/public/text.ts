import { z } from "zod";

/** Control characters and the byte-order mark, which plain text never holds; tab, line feed and carriage return
 *  are allowed. Without them, JavaScript and Python agree on which characters are white space, so both sides of
 *  the contract agree on what is blank. */
const isControl = (c: number) => (c <= 0x1f && c !== 0x09 && c !== 0x0a && c !== 0x0d) || (c >= 0x7f && c <= 0x9f) || c === 0xfeff;

/** The same rule as a JSON Schema pattern: something other than white space, and no control character. */
const PATTERN = "^(?=[\\s\\S]*\\S)[^\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\uFEFF]*$";

/**
 * Plain text that is never blank, with its length counted in Unicode characters (code points),
 * the way JSON Schema's minLength and maxLength count it, so both sides agree.
 */
export function text(min: number, max: number) {
  return z
    .string()
    .refine((s) => ![...s].some((ch) => isControl(ch.codePointAt(0)!)), { message: "holds a control character" })
    .refine((s) => s.trim().length > 0, { message: "must not be blank" })
    .refine((s) => [...s].length >= min, { message: `shorter than ${min.toLocaleString("en-US")} characters` })
    .refine((s) => [...s].length <= max, { message: `longer than ${max.toLocaleString("en-US")} characters` })
    .meta({ minLength: min, maxLength: max, pattern: PATTERN });
}
