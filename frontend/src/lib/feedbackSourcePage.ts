/** Путь страницы, с которой отправлена заявка (для API feedback). */
export function feedbackSourcePage(pathname: string | null | undefined): string {
  const path = (pathname || "/").trim() || "/";
  return path.startsWith("/") ? path : `/${path}`;
}
