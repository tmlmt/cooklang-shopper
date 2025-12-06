export default function (...parts: string[]): string {
  const sanitizedParts = parts.filter(Boolean);
  if (sanitizedParts.length === 0) return "";
  const normalizedParts = parts.map((part) =>
    part.replace(/^[/\\]+|[/\\]+$/g, ""),
  );
  let result = normalizedParts.join("/");

  // Handle ".."
  const segments = result.split("/");
  const finalSegments: string[] = [];
  for (const segment of segments) {
    if (segment === "..") {
      if (finalSegments.length > 0) {
        finalSegments.pop();
      }
    } else if (segment !== "" && segment !== ".") {
      finalSegments.push(segment);
    }
  }
  result = finalSegments.join("/");

  // Ensure leading slash if the first part had one, or if it's an absolute path
  if (
    sanitizedParts[0]!.startsWith("/") ||
    sanitizedParts[0]!.startsWith("\\")
  ) {
    result = "/" + result;
  }

  return result;
}
