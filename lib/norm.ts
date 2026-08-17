export const norm = (s: string | null | undefined): string =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()[\\],.'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const baseTitle = (s: string | null | undefined): string =>
  norm(s).replace(/\s*(france|europe|usa|japan|asia|australia|en|fr|de|es|it|jp)\s*$/i, "").trim();
