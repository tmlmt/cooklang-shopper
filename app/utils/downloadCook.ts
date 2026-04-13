// Universally accepted pattern for triggering a file download in the browser
// as browsers don't have a built-in downloadFile(content) API

export function downloadCook(content: string, filename: string) {
  // wraps content into an in-memory file and generate a temp blob: URL pointing to oit
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  // Hidden anchor with download attribute to tell the browser to save and not navigate to it
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".cook") ? filename : `${filename}.cook`;
  a.click();
  // Free in-memory blob
  URL.revokeObjectURL(url);
}
