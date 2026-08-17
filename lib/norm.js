// Normalisation de titres pour matcher une demande de jeu ↔ un jeu ajouté au catalogue.
// Même logique que la détection du front (db-nds-shop/RequestGame.tsx) : minuscules,
// sans accents/ponctuation, suffixe de région retiré.
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[()[\\],.'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const baseTitle = (s) =>
  norm(s).replace(/\s*(france|europe|usa|japan|asia|australia|en|fr|de|es|it|jp)\s*$/i, "").trim();

module.exports = { norm, baseTitle };