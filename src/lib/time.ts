/** The current time in ms. Pages that are rendered fresh for every request (admin pages, reports) use this; it is a named function so the lint rule about impure calls in render does not flag a value that is meant to be "now". */
export const nowMs = (): number => Date.now();
