// Every section of the landing page: its anchor id and the label used in the nav and footer.
// Sections set `id={sections.x.id}`, and links use `href(sections.x)`, so renaming an anchor or
// a label happens here and nowhere else.
export const sections = {
  top: { id: "top", label: "Home" },
  paintings: { id: "paintings", label: "Paintings" },
  textiles: { id: "textiles", label: "Textiles" },
  postcards: { id: "postcards", label: "Postcards" },
  whereToBuy: { id: "where-to-buy", label: "Buy postcards at Molo Mansion", short: "Buy at Molo Mansion" },
  about: { id: "about", label: "About" },
  collectors: { id: "collectors", label: "Collectors" },
  commission: { id: "commission", label: "Commission" },
} as const;

export type Section = (typeof sections)[keyof typeof sections];

/** The sections listed in the nav bar and footer, in page order. */
export const navSections: Section[] = [
  sections.paintings,
  sections.textiles,
  sections.postcards,
  sections.about,
  sections.collectors,
];

/**
 * Link to a section: `href(sections.commission)` → "#commission" on the homepage, or
 * `href(sections.commission, true)` → "/#commission" from another page (e.g. a painting's page).
 */
export const href = (section: Section, fromOtherPage = false) => `${fromOtherPage ? "/" : ""}#${section.id}`;

/** Standalone pages, linked from the footer. */
export const pages = {
  iloilo: { path: "/iloilo", label: "Iloilo" },
  painting: (slug: string) => `/paintings/${slug}`,
};
