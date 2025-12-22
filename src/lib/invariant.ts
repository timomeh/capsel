export function invariant(
  condition: unknown,
  message = "Invariant violated",
): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}
