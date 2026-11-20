/** One query-string value. Next gives an array when a name repeats (?q=a&q=b); the first one counts. The NUL
 *  character is dropped, because the database cannot hold it. */
export function firstParam(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? "").replaceAll("\u0000", "");
}
