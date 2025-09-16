import type { Transform } from "./core";

const toTranslateString = (transform: Transform | null | undefined): string | undefined => {
  if (!transform) return undefined;
  const { x, y } = transform;
  return `translate3d(${x}px, ${y}px, 0)`;
};

export const CSS = {
  Translate: {
    toString: toTranslateString,
  },
};

export default CSS;
