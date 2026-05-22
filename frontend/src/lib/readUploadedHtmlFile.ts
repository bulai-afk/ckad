/**
 * Word на macOS часто сохраняет «веб-страницу (отфильтрованную)» как UTF-16 LE
 * (BOM FF FE, в meta charset=unicode). file.text() в браузере читает только UTF-8.
 */
export async function readUploadedHtmlFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  return new TextDecoder("utf-8").decode(bytes);
}
