export interface RtkOptions {
  useRtk: boolean;
}

export function prependRtk(command: string, opts: RtkOptions): string {
  if (!opts.useRtk) return command;
  return `rtk ${command}`;
}
