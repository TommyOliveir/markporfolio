// Content for the Collectors section.

// Photos of Mark with people who own his work, shown in the Collectors section.
// To add a real one: put the photo in /public/art/collectors and set `photo` (with its real pixel size).
// Entries without a `photo` show a drawn placeholder.
export type Collector = {
  name: string;
  role?: string;
  painting?: string; // title of the piece they took home
  note?: string; // short handwritten caption
  photo?: { src: string; width: number; height: number };
  tint: string; // wash colour behind the placeholder drawing
};

// TODO: replace these samples with real photos, and get each person's OK before posting.
export const collectors: Collector[] = [
  {
    name: "Martin Nievera",
    role: "Singer & TV host",
    note: "At the postcard table",
    photo: { src: "/art/collectors/martin.jpg", width: 1152, height: 2048 },
    tint: "#2c56b8",
  },
  {
    name: "Our guest from Japan",
    role: "Visiting Iloilo",
    note: "Took home a city print",
    photo: { src: "/art/collectors/collector-2.jpg", width: 1536, height: 2048 },
    tint: "#d63c62",
  },
  {
    name: "Evening visitors", // TODO: names
    note: "Golden hour under the arches",
    photo: { src: "/art/collectors/collector-4.jpg", width: 1536, height: 2048 },
    tint: "#f2a516",
  },
  {
    name: "A fellow art lover", // TODO: name
    note: "In very good company",
    photo: { src: "/art/collectors/collector-5.jpg", width: 1271, height: 1908 },
    tint: "#6b4aa6",
  },
  {
    name: "The weekend crew", // TODO: names / how they'd like to be credited
    note: "Everyone found a favourite",
    photo: { src: "/art/collectors/collector-3.jpg", width: 2048, height: 1536 },
    tint: "#1b8e8e",
  },
];
