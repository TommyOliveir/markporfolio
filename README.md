# Mark — Paintings & Postcards

A one-page fantasy portfolio built with Next.js, Tailwind CSS, React Three Fiber and Motion.
It is a showcase only: there is no online shop. Postcards are sold in person, and commissions are by phone.

## Run it

```bash
nvm use 22        # Next.js 16 needs Node 20.9+
npm install
npm run dev       # http://localhost:3000
```

## Edit the content

Everything lives in [`src/data/site.ts`](src/data/site.ts):

- **Artist name, tagline, bio**: `site`
- **Cell number for commissions**: `site.phoneDisplay` (shown on the page) and `site.phoneRaw` (digits for the call, text and WhatsApp links)
- **Where to buy postcards**: `postcardShops`
- **Paintings and postcards**: `paintings` and `postcards`

The artwork in `public/art/` is generated placeholder art. To use real work, add photos (for example
`public/art/paintings/my-painting.jpg`) and update `src`, `width` and `height` for each entry.
The About section image is in `src/components/About.tsx`.

## What's on the page

- **3D hero**: floating candy stars, wobbly blobs, a ring, a crystal and clouds that follow the mouse (`HeroScene.tsx`)
- **Gallery**: category filters, cards that tilt in 3D under the cursor, and a lightbox with keyboard navigation
- **Postcards**: cards that flip in 3D to show a hand-written back with a stamp, plus the places to buy them
- **Commission**: call, text, WhatsApp and copy-number buttons
- Extras: a sparkle cursor trail, a rainbow scroll-progress bar, a marquee ribbon and scroll reveals.
  All of them respect "reduce motion".
