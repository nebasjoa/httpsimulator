// Tiny argv helpers shared by every command handler. Not a general flag-parsing library -
// just enough to cover the flags this simulator's commands actually accept.

// Matches an exact flag ("-f"/"--force") or, for single-letter short flags, a combined
// form like "-fd" (real git lets you write "git clean -fd" instead of "-f -d").
export function hasFlag(args: string[], ...names: string[]): boolean {
  return args.some((a) => {
    if (names.includes(a)) return true;
    if (!/^-[a-zA-Z]+$/.test(a)) return false;
    return names.some((name) => name.length === 2 && name.startsWith('-') && a.includes(name.charAt(1)));
  });
}

// Returns the value following `-m`/`--message` etc, respecting our tokenizer already
// having stripped surrounding quotes (see commandParser.ts).
export function optionValue(args: string[], ...names: string[]): string | undefined {
  const idx = args.findIndex((a) => names.includes(a));
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

// Non-flag positional arguments (anything not starting with '-', and not consumed as a
// value for a flag that takes one). `valueFlags` lists flag names that eat the next token.
export function positionals(args: string[], valueFlags: string[] = []): string[] {
  const result: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg.startsWith('-')) {
      if (valueFlags.includes(arg)) i++; // skip its value
      continue;
    }
    result.push(arg);
  }
  return result;
}
