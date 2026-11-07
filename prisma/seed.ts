import { PrismaClient } from "@prisma/client";
import { addUtcDays, startOfUtcDay } from "../src/lib/dates";

// Sample launches dated relative to the day you run the seed, so the homepage
// always has a "today", a week of history and an upcoming "tomorrow".
// Re-running the seed replaces all products, topics, votes and comments.
// Real accounts, subscribers and submissions are left alone.

const db = new PrismaClient();

const topics = {
  ai: "AI",
  "developer-tools": "Developer tools",
  design: "Design",
  productivity: "Productivity",
  finance: "Finance",
  writing: "Writing",
  lifestyle: "Lifestyle",
  travel: "Travel",
  health: "Health",
} as const;

type TopicSlug = keyof typeof topics;

type SeedProduct = {
  name: string;
  tagline: string;
  description: string;
  maker: string;
  accent: string;
  topics: TopicSlug[];
  votes: number;
};

// Sample flags so the feed shows verified and featured states.
const verified = new Set([
  "Quarry", "Ferrylight", "Runbook", "Inkwell", "Orbitdesk", "Stackpad", "Brine",
  "Driftwood", "Patchbay", "Murmur", "Sonar", "Tallyho", "Lumen Grid", "Harbor Logs", "Tessellate",
]);
const featured = new Set(["Murmur", "Kiln", "Orbitdesk", "Runbook"]);

// Where each product runs. Anything not listed is web only.
const platformsFor: Record<string, ("web" | "ios" | "android")[]> = {
  driftwood: ["web", "ios", "android"],
  murmur: ["ios", "android"],
  kiln: ["web"],
  tallyho: ["ios", "android"],
  cadence: ["ios"],
  fernhouse: ["ios", "android"],
  brine: ["web", "ios"],
  canopy: ["ios", "android"],
  ferrylight: ["ios", "android"],
  hemline: ["web", "ios"],
  "pantry-pal": ["android", "ios"],
  moneta: ["web", "ios"],
  quietly: ["web", "ios", "android"],
  "pebble-books": ["android"],
  orbitdesk: ["web", "ios"],
};

// A few sample store and website links (example.com placeholders) so product pages show their buttons.
const sampleLinks: Record<string, { websiteUrl?: string; appStoreUrl?: string; playStoreUrl?: string }> = {
  driftwood: {
    websiteUrl: "https://example.com/driftwood",
    appStoreUrl: "https://apps.example.com/app/driftwood/id1000000001",
    playStoreUrl: "https://play.example.com/store/apps/details?id=com.example.driftwood",
  },
  murmur: {
    appStoreUrl: "https://apps.example.com/app/murmur/id1000000002",
    playStoreUrl: "https://play.example.com/store/apps/details?id=com.example.murmur",
  },
  patchbay: { websiteUrl: "https://example.com/patchbay" },
};

// Products with sample screenshots in public/samples.
const withScreenshots = new Set(["driftwood", "patchbay", "murmur"]);

// Sample members who leave comments. They can't sign in ("!" is never a valid hash).
const members = [
  { name: "Ava Thompson", email: "ava@example.com" },
  { name: "Rahul Verma", email: "rahul@example.com" },
  { name: "Sofia Rossi", email: "sofia@example.com" },
  { name: "Jonas Berg", email: "jonas@example.com" },
  { name: "Mei Lin", email: "mei@example.com" },
];

// [product slug, member index, comment, hours ago]
const comments: [string, number, string, number][] = [
  ["driftwood", 0, "Planned a whole Lisbon trip with five friends in one evening. The voting on pins stopped every argument.", 6],
  ["driftwood", 2, "Can you export the itinerary to Google Calendar?", 4],
  ["driftwood", 4, "Offline maps would make this perfect for the road.", 2],
  ["patchbay", 1, "The replayable delivery log is the feature I didn't know I needed.", 7],
  ["patchbay", 3, "Does it handle signature verification for Stripe webhooks?", 5],
  ["patchbay", 0, "Swapped out two little glue services for this today. Congrats on the launch!", 1],
  ["murmur", 4, "I ramble a lot in voice memos and the summaries are genuinely tidy.", 8],
  ["murmur", 1, "Which languages does transcription support?", 3],
  ["sonar", 3, "Found a missing index on our biggest table within five minutes.", 5],
  ["sonar", 2, "Does it need superuser access to read query stats?", 2],
  ["kiln", 0, "The bulk export sizes for app store listings save me an afternoon every release.", 4],
  ["tallyho", 4, "Splitting by item instead of evenly is how it should always have worked.", 3],
  ["ferrylight", 2, "Used this in the Cyclades last summer. Worked perfectly with no signal.", 50],
  ["orbitdesk", 1, "Finally a support inbox that doesn't charge per seat for a tiny team.", 30],
  ["stackpad", 3, "Diffing responses across days caught a breaking API change for us.", 28],
];

// Keyed by day offset from today. Days -4 and -6 intentionally have no launches.
const launches: Record<number, SeedProduct[]> = {
  [-5]: [
    { name: "Gullwing", tagline: "Book desks and meeting rooms from a floor plan", description: "Upload your office floor plan once, then let people tap the desk or room they want. Gullwing shows who sits where each day, so the team can plan office days around each other.", maker: "Priya Natarajan", accent: "#35506B", topics: ["productivity"], votes: 188 },
    { name: "Quarry", tagline: "Search every doc your team wrote, wherever it lives", description: "Quarry connects to your wikis, drives and chat, then answers questions with links to the exact paragraph it used. Nothing is answered without a source you can check.", maker: "Owen Gallagher", accent: "#5C4B2E", topics: ["ai", "productivity"], votes: 341 },
  ],
  [-3]: [
    { name: "Ferrylight", tagline: "Offline maps and timetables for island hopping", description: "Ferrylight bundles ferry timetables, port maps and walking routes for whole island groups into one download, so your plans still work when the signal drops at sea.", maker: "Eleni Markou", accent: "#1F5E7A", topics: ["travel"], votes: 518 },
    { name: "Hemline", tagline: "Turn body measurements into sewing patterns that fit", description: "Enter a handful of measurements and Hemline redraws classic sewing patterns to fit you, ready to print at home on ordinary paper and tape together.", maker: "Bea Kowalski", accent: "#8A3A5B", topics: ["design", "lifestyle"], votes: 207 },
    { name: "Runbook", tagline: "Checklists for on-call that update from your alerts", description: "Runbook attaches the right checklist to each alert as it fires and records who did which step, so the post-incident review mostly writes itself.", maker: "Sam Achebe", accent: "#3A4A8C", topics: ["developer-tools"], votes: 264 },
  ],
  [-2]: [
    { name: "Inkwell", tagline: "A distraction-free editor that exports to any blog", description: "Inkwell is a quiet writing space with a single export button. It publishes the same draft to most popular blogging platforms with your formatting intact.", maker: "Clara Ibsen", accent: "#2D3A5E", topics: ["writing"], votes: 233 },
    { name: "Pantry Pal", tagline: "Scan receipts to keep a running list of what's in your kitchen", description: "Photograph your grocery receipt and Pantry Pal adds everything to your kitchen list, then nudges you before things go off.", maker: "Diego Ramos", accent: "#6B4A1E", topics: ["lifestyle", "ai"], votes: 156 },
    { name: "Ledger Lane", tagline: "Invoices and expense tracking built for solo consultants", description: "Ledger Lane keeps invoices, receipts and tax estimates in one place, with a quarterly summary you can hand straight to your accountant.", maker: "Mira Holm", accent: "#2F5D3A", topics: ["finance"], votes: 97 },
  ],
  [-1]: [
    { name: "Orbitdesk", tagline: "A calm shared inbox for support teams of two or three", description: "Orbitdesk gives small support teams one inbox with clear owners, saved replies and no seat-based pricing surprises as you grow.", maker: "Ines Duarte", accent: "#1F6F5C", topics: ["productivity"], votes: 412 },
    { name: "Stackpad", tagline: "A scratchpad for API requests that remembers every response", description: "Stackpad keeps a searchable history of every request you send and every response you get back, so you can diff today's API behaviour against last week's.", maker: "Tomas Brandt", accent: "#3B3F99", topics: ["developer-tools"], votes: 377 },
    { name: "Brine", tagline: "Meal-prep plans built from what's already in your fridge", description: "Tell Brine what you have and how many lunches you need. It builds a prep plan that uses up the oldest ingredients first.", maker: "Amara Okafor", accent: "#8A3B12", topics: ["lifestyle", "ai"], votes: 298 },
    { name: "Moneta", tagline: "Runway forecasts for freelancers with lumpy income", description: "Moneta looks at your past invoices and regular costs and tells you how many months you can cover, updating every time you get paid.", maker: "Joel Park", accent: "#4A5D23", topics: ["finance"], votes: 231 },
    { name: "Waypoint Tours", tagline: "Interactive product walkthroughs you build by clicking, not coding", description: "Record a walkthrough by clicking through your own app. Waypoint turns it into a guided tour your users can follow step by step.", maker: "Sana Mir", accent: "#7A2E6E", topics: ["design", "productivity"], votes: 184 },
    { name: "Canopy", tagline: "A family calendar that pulls dates out of school emails", description: "Forward school and club emails to Canopy and it adds trips, deadlines and dress-up days to a calendar the whole family shares.", maker: "Lukas Weber", accent: "#2C5F8A", topics: ["ai", "lifestyle"], votes: 142 },
  ],
  [0]: [
    { name: "Driftwood", tagline: "Plan trips with friends on one shared, editable map", description: "Drop pins, add notes and vote on plans together on one map. Driftwood turns the pins everyone agreed on into a day-by-day itinerary.", maker: "Maya Lindqvist", accent: "#1D5C7A", topics: ["travel", "productivity"], votes: 286 },
    { name: "Patchbay", tagline: "Wire webhooks between apps without writing glue code", description: "Patchbay receives webhooks, lets you reshape the payload with a visual mapper, and forwards it on, with retries and a replayable log of every delivery.", maker: "Dev Raman", accent: "#3346F0", topics: ["developer-tools"], votes: 251 },
    { name: "Murmur", tagline: "Turn rambling voice memos into tidy, searchable notes", description: "Record a thought on the go and Murmur gives you a clean summary, a list of to-dos and the full transcript, all searchable later.", maker: "Chloe Martin", accent: "#6B3FA0", topics: ["ai", "productivity"], votes: 233 },
    { name: "Sonar", tagline: "Find the slow queries in your Postgres before your users do", description: "Sonar reads your Postgres query statistics, ranks the queries costing you the most time, and suggests the index or rewrite most likely to help.", maker: "Kenji Watanabe", accent: "#0F6E6E", topics: ["developer-tools"], votes: 198 },
    { name: "Kiln", tagline: "Drop in screenshots, get them back in device frames, in bulk", description: "Drag a folder of screenshots into Kiln and get them back framed in phones, tablets and laptops, sized for every app store listing.", maker: "Rosa Ferreira", accent: "#A1401F", topics: ["design"], votes: 164 },
    { name: "Tallyho", tagline: "Split shared bills item by item instead of by guesswork", description: "Snap the receipt, tap who had what, and Tallyho works out who owes whom, including tax and tip, then reminds people politely.", maker: "Femi Adeyemi", accent: "#2F6B3A", topics: ["finance"], votes: 139 },
    { name: "Scribe Diff", tagline: "See exactly what changed between two contract drafts", description: "Upload two versions of a contract and Scribe Diff highlights every change, with a plain-language note on what each one means for you.", maker: "Hannah Cole", accent: "#5A4632", topics: ["ai", "writing"], votes: 117 },
    { name: "Lumen Grid", tagline: "Pick color palettes that pass WCAG contrast as you go", description: "Lumen Grid checks every text and background pairing in your palette as you edit it, and suggests the nearest shade that passes.", maker: "Arjun Mehta", accent: "#8C2F55", topics: ["design"], votes: 96 },
    { name: "Paperplane", tagline: "Send your newsletter straight from a Markdown file", description: "Write your issue in Markdown, push it to a folder, and Paperplane sends it to your list with a clean, readable template.", maker: "Elif Kaya", accent: "#2E4A8C", topics: ["writing"], votes: 71 },
    { name: "Cadence", tagline: "A habit tracker that adjusts your goals to the week you actually had", description: "Missed a few days? Cadence scales next week's goals to what you can realistically do, instead of showing you a broken streak.", maker: "Noah Feldman", accent: "#9A3D3D", topics: ["health", "productivity"], votes: 48 },
    { name: "Fernhouse", tagline: "Watering reminders and light checks for your houseplants", description: "Add your plants and where they sit, and Fernhouse tells you when to water each one and whether it's getting enough light.", maker: "Lea Moreau", accent: "#3F6A2A", topics: ["lifestyle"], votes: 23 },
  ],
  [1]: [
    { name: "Tessellate", tagline: "Turn a single sketch into a seamless repeating pattern", description: "Sketch one tile and Tessellate repeats it into a seamless pattern you can export for fabric, wallpaper or print.", maker: "Iris Novak", accent: "#5B3E96", topics: ["design", "ai"], votes: 0 },
    { name: "Harbor Logs", tagline: "Ship structured logs to one searchable place in minutes", description: "Point your services at Harbor Logs and search every structured log line from one place, with saved queries for the ones you run daily.", maker: "Marcus Hill", accent: "#1E5A6E", topics: ["developer-tools"], votes: 0 },
    { name: "Quietly", tagline: "A focus timer that silences notifications on every device", description: "Start a session on any device and Quietly mutes notifications on all of them until the timer ends.", maker: "Yuki Tanaka", accent: "#4B4F6B", topics: ["productivity", "health"], votes: 0 },
    { name: "Pebble Books", tagline: "Simple bookkeeping for market-stall and pop-up sellers", description: "Log sales from your phone at the stall and Pebble Books tallies stock, cash and card takings at the end of each day.", maker: "Grace Owusu", accent: "#7A5418", topics: ["finance"], votes: 0 },
  ],
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  await db.vote.deleteMany();
  await db.comment.deleteMany();
  await db.product.deleteMany();
  await db.topic.deleteMany();

  const memberIds: string[] = [];
  for (const member of members) {
    const user = await db.user.upsert({
      where: { email: member.email },
      create: { ...member, passwordHash: "!" },
      update: { name: member.name },
      select: { id: true },
    });
    memberIds.push(user.id);
  }

  for (const [slug, name] of Object.entries(topics)) {
    await db.topic.create({ data: { slug, name } });
  }

  const today = startOfUtcDay(new Date());

  for (const [offset, products] of Object.entries(launches)) {
    const launchDate = addUtcDays(today, Number(offset));

    for (const product of products) {
      const slug = slugify(product.name);
      const created = await db.product.create({
        data: {
          slug,
          name: product.name,
          tagline: product.tagline,
          description: product.description,
          maker: product.maker,
          accent: product.accent,
          logoUrl: `/logos/${slug}.svg`,
          platforms: platformsFor[slug] ?? ["web"],
          ...sampleLinks[slug],
          galleryUrls: withScreenshots.has(slug)
            ? [`/samples/${slug}-1.svg`, `/samples/${slug}-2.svg`]
            : [],
          verified: verified.has(product.name),
          featured: featured.has(product.name),
          // Featured samples behave like Launch Pass launches: 7 days in the Featured panel.
          featuredUntil: featured.has(product.name) ? addUtcDays(launchDate, 6) : null,
          launchDate,
          topics: { connect: product.topics.map((t) => ({ slug: t })) },
        },
      });

      if (product.votes > 0) {
        await db.vote.createMany({
          data: Array.from({ length: product.votes }, (_, i) => ({
            productId: created.id,
            visitorId: `seed-${slug}-${i}`,
          })),
        });
      }
    }
  }

  for (const [slug, member, body, hoursAgo] of comments) {
    const product = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!product) continue;
    await db.comment.create({
      data: {
        productId: product.id,
        userId: memberIds[member],
        body,
        createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      },
    });
  }

  const count = await db.product.count();
  console.log(`Seeded ${count} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
