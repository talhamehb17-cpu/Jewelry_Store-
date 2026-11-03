import { IMG, UNSPLASH_CREDITS } from '@/lib/images';

export const CARE_DEFAULT =
  'Store in the Evermoon pouch provided, away from humidity. Remove before swimming, bathing or exercising. Apply perfume and lotions before wearing, and polish gently with the cloth included.';

export const SEED_CATEGORIES = [
  { slug: 'rings', name: 'Rings', description: 'Solitaires, stacking bands and statement rings in solid gold and gold vermeil.', image: IMG.elara2 },
  { slug: 'necklaces', name: 'Necklaces', description: 'Fine chains, pendants and pearl strands designed for layering.', image: IMG.amara2 },
  { slug: 'earrings', name: 'Earrings', description: 'Hoops, pearl drops and sculptural pieces for every occasion.', image: IMG.celeste2 },
  { slug: 'bracelets', name: 'Bracelets', description: 'Tennis bracelets, delicate chains and charm stacks.', image: IMG.tennis1 },
  { slug: 'jewelry-sets', name: 'Jewelry Sets', description: 'Coordinated sets for gifting, weddings and celebrations.', image: IMG.serenePearl },
];

export const SEED_COLLECTIONS = [
  { slug: 'new-arrivals', name: 'New Arrivals', rule: 'new', description: 'The latest pieces from our Lahore studio.', image: IMG.soleil1, featured: true },
  { slug: 'best-sellers', name: 'Best Sellers', rule: 'bestsellers', description: 'The pieces our clients return to, again and again.', image: IMG.aurelia2, featured: true },
  { slug: 'rings', name: 'Rings', rule: 'category', ruleValue: 'rings', description: 'Solitaires, stacking bands and statement rings.', image: IMG.elara2 },
  { slug: 'necklaces', name: 'Necklaces', rule: 'category', ruleValue: 'necklaces', description: 'Chains, pendants and pearl strands.', image: IMG.amara2 },
  { slug: 'earrings', name: 'Earrings', rule: 'category', ruleValue: 'earrings', description: 'Hoops, drops and studs.', image: IMG.celeste2 },
  { slug: 'bracelets', name: 'Bracelets', rule: 'category', ruleValue: 'bracelets', description: 'Tennis bracelets, chains and charms.', image: IMG.tennis1 },
  { slug: 'jewelry-sets', name: 'Jewelry Sets', rule: 'category', ruleValue: 'jewelry-sets', description: 'Coordinated sets for gifting and celebrations.', image: IMG.serenePearl },
  { slug: 'gifts', name: 'Gifts', rule: 'manual', description: 'Thoughtful pieces for Eid, birthdays and anniversaries — beautifully boxed.', image: IMG.celestine1, featured: true },
  { slug: 'sale', name: 'Sale', rule: 'sale', description: 'Limited-time pricing on selected pieces.', image: IMG.rosalie },
  { slug: 'pearl-edit', name: 'The Pearl Edit', rule: 'manual', description: 'Luminous freshwater pearls, finished in 18k gold vermeil.', image: IMG.celestine2, featured: true },
  { slug: 'bridal', name: 'Bridal', rule: 'manual', description: 'Lab-grown diamonds and heirloom sets for your nikkah, mehndi and walima.', image: IMG.elara1, featured: true },
  { slug: 'everyday-gold', name: 'Everyday Gold', rule: 'manual', description: 'Quiet, layerable essentials you will never take off.', image: IMG.crescent2, featured: true },
];

export type SeedProduct = {
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  sku: string;
  price: number; // rupees
  compareAt?: number;
  cost?: number;
  materials: string[];
  badges: string[];
  tags: string[];
  sizes?: string[];
  colors?: string[];
  stock: number | Record<string, number>;
  images: string[];
  description: string;
  details: string[];
  daysAgo: number;
  featured?: boolean;
  collections?: string[];
  videoUrl?: string;
};

const RING_SIZES = ['5', '6', '7', '8', '9'];
const LENGTHS = ['16 in', '18 in'];

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: 'aurelia-gold-necklace',
    name: 'Aurelia Gold Necklace',
    subtitle: 'Liquid herringbone chain',
    category: 'necklaces',
    sku: 'AUR-NK-001',
    price: 16500,
    cost: 6200,
    materials: ['18k Gold Vermeil', 'Sterling Silver'],
    badges: ['bestseller'],
    tags: ['chain', 'layering', 'everyday', 'gold'],
    sizes: ['16 in', '18 in', '20 in'],
    colors: ['Gold'],
    stock: { '16 in': 14, '18 in': 22, '20 in': 6 },
    images: [IMG.aurelia1, IMG.aurelia2],
    description:
      'Our signature herringbone chain, crafted to lie flat and catch the light like liquid gold. The Aurelia is the piece you reach for every morning — elegant alone, effortless when layered with pendants.',
    details: ['3 mm flat herringbone chain', 'Thick 18k gold vermeil over 925 sterling silver', 'Lobster clasp with 2 in extender', 'Hypoallergenic and nickel-free'],
    daysAgo: 160,
    featured: true,
    collections: ['everyday-gold', 'gifts'],
    videoUrl: '/videos/aurelia.mp4',
  },
  {
    slug: 'amara-pendant',
    name: 'Amara Pendant',
    subtitle: 'Pear-cut white sapphire drop',
    category: 'necklaces',
    sku: 'AUR-NK-002',
    price: 11800,
    compareAt: 13900,
    cost: 4300,
    materials: ['18k Gold Vermeil', 'White Sapphire'],
    badges: ['sale'],
    tags: ['pendant', 'gift', 'sparkle'],
    sizes: LENGTHS,
    colors: ['Gold'],
    stock: { '16 in': 9, '18 in': 12 },
    images: [IMG.amara1, IMG.amara2],
    description:
      'A single pear-cut white sapphire suspended from a whisper-fine cable chain. Amara sits gently at the collarbone — a quiet sparkle for your everyday and your most cherished occasions.',
    details: ['7 × 5 mm pear-cut lab-created white sapphire', 'Claw setting in 18k gold vermeil', 'Fine cable chain, adjustable 16–18 in', 'Arrives in our signature gift box'],
    daysAgo: 120,
    featured: true,
    collections: ['gifts'],
  },
  {
    slug: 'celestine-pearl-necklace',
    name: 'Celestine Pearl Necklace',
    subtitle: 'Hand-knotted freshwater pearl strand',
    category: 'necklaces',
    sku: 'AUR-NK-003',
    price: 24500,
    cost: 9800,
    materials: ['Freshwater Pearl', '18k Gold Vermeil'],
    badges: ['new'],
    tags: ['pearl', 'classic', 'bridal'],
    sizes: LENGTHS,
    colors: ['Gold'],
    stock: { '16 in': 7, '18 in': 5 },
    images: [IMG.celestine1, IMG.celestine2],
    description:
      'A timeless strand of lustrous freshwater pearls, individually hand-knotted on silk for drape and security. Finished with a polished gold vermeil clasp — an heirloom in the making.',
    details: ['6–6.5 mm AAA freshwater pearls', 'Hand-knotted on silk thread', '18k gold vermeil box clasp', 'Each pearl is unique in shape and lustre'],
    daysAgo: 12,
    featured: true,
    collections: ['pearl-edit', 'bridal'],
  },
  {
    slug: 'luna-crescent-necklace',
    name: 'Luna Crescent Necklace',
    subtitle: 'Pavé crescent moon pendant',
    category: 'necklaces',
    sku: 'AUR-NK-004',
    price: 8500,
    cost: 2900,
    materials: ['18k Gold Vermeil', 'Cubic Zirconia'],
    badges: ['bestseller'],
    tags: ['pendant', 'celestial', 'layering', 'gift'],
    sizes: LENGTHS,
    colors: ['Gold'],
    stock: { '16 in': 18, '18 in': 24 },
    images: [IMG.crescent1, IMG.crescent2],
    description:
      'A delicate crescent moon set with hand-placed pavé stones, for those who find magic in the night sky. Layer it with the Aurelia chain or wear it alone as your everyday talisman.',
    details: ['12 mm crescent pendant with pavé cubic zirconia', '18k gold vermeil over sterling silver', 'Fine trace chain with extender', 'Nickel-free'],
    daysAgo: 140,
    collections: ['everyday-gold', 'gifts'],
  },
  {
    slug: 'soleil-medallion-necklace',
    name: 'Soleil Medallion Necklace',
    subtitle: 'Sun-embossed coin on rope chain',
    category: 'necklaces',
    sku: 'AUR-NK-005',
    price: 13900,
    cost: 5100,
    materials: ['18k Gold Vermeil'],
    badges: ['new'],
    tags: ['medallion', 'coin', 'statement'],
    sizes: ['18 in', '20 in'],
    colors: ['Gold'],
    stock: { '18 in': 10, '20 in': 8 },
    images: [IMG.soleil1],
    description:
      'Inspired by antique coins, the Soleil medallion is embossed with a radiant sun and suspended on a sculptural rope chain. A modern heirloom with warmth and presence.',
    details: ['18 mm hand-finished medallion', 'Rope chain in 18k gold vermeil', 'Spring-ring clasp', 'Designed to be layered or worn solo'],
    daysAgo: 6,
    collections: ['new-arrivals'],
  },
  {
    slug: 'zoya-link-chain',
    name: 'Zoya Link Chain',
    subtitle: 'Polished oval link necklace',
    category: 'necklaces',
    sku: 'AUR-NK-006',
    price: 14800,
    cost: 5600,
    materials: ['18k Gold Vermeil'],
    badges: [],
    tags: ['chain', 'link', 'everyday'],
    sizes: LENGTHS,
    colors: ['Gold'],
    stock: { '16 in': 11, '18 in': 2 },
    images: [IMG.zoyaChain],
    description:
      'Bold yet refined, Zoya’s polished oval links bring architectural confidence to any neckline. Wear it with a crisp shirt or over a silk kameez.',
    details: ['5 mm polished oval links', '18k gold vermeil over sterling silver', 'Toggle-style clasp', 'Weighs approx. 9 g'],
    daysAgo: 95,
    collections: ['everyday-gold'],
  },
  {
    slug: 'celeste-pearl-earrings',
    name: 'Celeste Pearl Earrings',
    subtitle: 'Freshwater pearl drops',
    category: 'earrings',
    sku: 'AUR-ER-001',
    price: 9500,
    cost: 3400,
    materials: ['Freshwater Pearl', '18k Gold Vermeil'],
    badges: ['bestseller'],
    tags: ['pearl', 'drop', 'bridal', 'gift'],
    colors: ['Gold'],
    stock: 26,
    images: [IMG.celeste1, IMG.celeste2],
    description:
      'Lustrous freshwater pearls suspended from polished gold hoops — Celeste moves with you, catching light with every turn. Our most-gifted earrings, from Eid to engagements.',
    details: ['8 mm freshwater pearls', '18k gold vermeil hoops, 12 mm', 'Hinged closure', 'Sold as a pair'],
    daysAgo: 150,
    featured: true,
    collections: ['pearl-edit', 'gifts', 'bridal'],
  },
  {
    slug: 'isabella-gold-hoops',
    name: 'Isabella Gold Hoops',
    subtitle: 'Sculpted twisted hoops',
    category: 'earrings',
    sku: 'AUR-ER-002',
    price: 10900,
    cost: 3900,
    materials: ['18k Gold Vermeil'],
    badges: ['bestseller'],
    tags: ['hoops', 'everyday', 'gold'],
    sizes: ['Small', 'Medium', 'Large'],
    colors: ['Gold'],
    stock: { Small: 15, Medium: 19, Large: 3 },
    images: [IMG.isabella1, IMG.isabella2],
    description:
      'Softly twisted hoops with a lightweight hollow core, so you can wear them from morning meetings to late dinners. Isabella brings sculptural movement to the classic hoop.',
    details: ['Small 15 mm · Medium 22 mm · Large 30 mm', 'Lightweight hollow construction', '18k gold vermeil over sterling silver', 'Click-top closure'],
    daysAgo: 130,
    featured: true,
    collections: ['everyday-gold'],
  },
  {
    slug: 'margaux-pearl-drops',
    name: 'Margaux Pearl Drops',
    subtitle: 'Sterling silver pearl earrings',
    category: 'earrings',
    sku: 'AUR-ER-003',
    price: 8900,
    compareAt: 10500,
    cost: 3000,
    materials: ['Sterling Silver', 'Freshwater Pearl'],
    badges: ['sale'],
    tags: ['pearl', 'silver', 'classic'],
    colors: ['Silver'],
    stock: 12,
    images: [IMG.margaux],
    description:
      'Cool sterling silver meets the soft glow of freshwater pearl in this graceful drop earring. Margaux is understated elegance for those who prefer silver tones.',
    details: ['9 mm freshwater pearl', 'Rhodium-plated 925 sterling silver', 'Butterfly backs', 'Drop length 28 mm'],
    daysAgo: 110,
    collections: ['pearl-edit'],
  },
  {
    slug: 'opaline-sculpted-earrings',
    name: 'Opaline Sculpted Earrings',
    subtitle: 'Organic gold statement studs',
    category: 'earrings',
    sku: 'AUR-ER-004',
    price: 12500,
    cost: 4500,
    materials: ['18k Gold Vermeil'],
    badges: ['new'],
    tags: ['statement', 'sculptural', 'gold'],
    colors: ['Gold'],
    stock: 9,
    images: [IMG.opaline1, IMG.opaline2],
    description:
      'Organic, molten forms cast in gold vermeil and hand-polished to a mirror finish. Opaline is our love letter to sculpture — bold, yet incredibly light to wear.',
    details: ['Hand-polished organic silhouette', '18k gold vermeil over sterling silver', 'Post back with secure butterflies', 'Approx. 20 mm'],
    daysAgo: 9,
    collections: ['new-arrivals'],
  },
  {
    slug: 'elara-solitaire-ring',
    name: 'Elara Solitaire Ring',
    subtitle: '1 ct lab-grown diamond solitaire',
    category: 'rings',
    sku: 'AUR-RG-001',
    price: 185000,
    cost: 92000,
    materials: ['14k Solid Gold', 'Lab-Grown Diamond'],
    badges: ['limited'],
    tags: ['diamond', 'engagement', 'bridal', 'solitaire'],
    sizes: RING_SIZES,
    colors: ['White Gold', 'Yellow Gold'],
    stock: { '5/White Gold': 2, '6/White Gold': 3, '7/White Gold': 2, '8/White Gold': 1, '9/White Gold': 0, '5/Yellow Gold': 1, '6/Yellow Gold': 2, '7/Yellow Gold': 2, '8/Yellow Gold': 1, '9/Yellow Gold': 1 },
    images: [IMG.elara1, IMG.elara2],
    description:
      'A brilliant 1 carat lab-grown diamond held aloft in a refined four-prong setting on a slender solid gold band. Elara is designed for forever — certified, conflict-free and breathtaking.',
    details: ['1.0 ct round brilliant lab-grown diamond, VS1 / F', 'IGI certificate included', '14k solid gold, 1.8 mm band', 'Complimentary resizing within 30 days'],
    daysAgo: 100,
    featured: true,
    collections: ['bridal'],
  },
  {
    slug: 'aurora-diamond-ring',
    name: 'Aurora Diamond Ring',
    subtitle: 'Pavé lab-grown diamond band',
    category: 'rings',
    sku: 'AUR-RG-002',
    price: 145000,
    cost: 70000,
    materials: ['14k Solid Gold', 'Lab-Grown Diamond'],
    badges: ['bestseller'],
    tags: ['diamond', 'pave', 'bridal', 'anniversary'],
    sizes: RING_SIZES,
    colors: ['White Gold'],
    stock: { '5': 2, '6': 4, '7': 3, '8': 2, '9': 1 },
    images: [IMG.aurora],
    description:
      'Rows of pavé lab-grown diamonds trace the Aurora band like first light on the horizon. Perfect as a wedding band, an anniversary gift or a dazzling stack companion to Elara.',
    details: ['0.85 ct total lab-grown diamonds', 'Micro-pavé setting', '14k solid white gold', 'IGI certified'],
    daysAgo: 115,
    collections: ['bridal'],
  },
  {
    slug: 'celine-emerald-cut-ring',
    name: 'Céline Emerald-Cut Ring',
    subtitle: 'Emerald-cut lab-grown diamond',
    category: 'rings',
    sku: 'AUR-RG-003',
    price: 168000,
    cost: 84000,
    materials: ['14k Solid Gold', 'Lab-Grown Diamond'],
    badges: ['new'],
    tags: ['diamond', 'emerald cut', 'bridal', 'statement'],
    sizes: RING_SIZES,
    colors: ['White Gold'],
    stock: { '5': 0, '6': 2, '7': 2, '8': 1, '9': 1 },
    images: [IMG.celine],
    description:
      'The architectural elegance of an emerald-cut diamond, with long step facets that reflect light like a hall of mirrors. Céline is for the bride who loves modern glamour.',
    details: ['1.2 ct emerald-cut lab-grown diamond', 'Four double-claw prongs', '14k solid gold band', 'IGI certificate included'],
    daysAgo: 15,
    collections: ['bridal'],
  },
  {
    slug: 'rosalie-pink-sapphire-ring',
    name: 'Rosalie Pink Sapphire Ring',
    subtitle: 'Pink sapphire with diamond halo',
    category: 'rings',
    sku: 'AUR-RG-004',
    price: 42500,
    compareAt: 48000,
    cost: 17000,
    materials: ['14k Solid Gold', 'Pink Sapphire', 'Lab-Grown Diamond'],
    badges: ['sale'],
    tags: ['sapphire', 'pink', 'halo', 'gift'],
    sizes: RING_SIZES,
    colors: ['Rose Gold'],
    stock: { '5': 3, '6': 4, '7': 4, '8': 2, '9': 1 },
    images: [IMG.rosalie],
    description:
      'A rectangular pink sapphire framed by a halo of sparkling lab-grown diamonds in warm rose gold. Romantic, rare and utterly feminine.',
    details: ['8 × 6 mm lab-created pink sapphire', '0.25 ct diamond halo', '14k solid rose gold', 'Comes with certificate of authenticity'],
    daysAgo: 85,
    collections: ['gifts'],
  },
  {
    slug: 'lyra-stacking-rings',
    name: 'Lyra Stacking Rings',
    subtitle: 'Set of three studded bands',
    category: 'rings',
    sku: 'AUR-RG-005',
    price: 8900,
    cost: 3100,
    materials: ['18k Gold Vermeil', 'Cubic Zirconia'],
    badges: ['bestseller'],
    tags: ['stacking', 'set', 'everyday', 'gift'],
    sizes: RING_SIZES,
    colors: ['Gold'],
    stock: { '5': 8, '6': 14, '7': 16, '8': 9, '9': 4 },
    images: [IMG.lyra],
    description:
      'Three slender bands — one studded, one beaded, one polished — designed to be stacked together or worn apart. Lyra makes building your ring story effortless.',
    details: ['Set of 3 bands, 1.5–2 mm', '18k gold vermeil over sterling silver', 'Hand-set cubic zirconia', 'Wear together or separately'],
    daysAgo: 125,
    collections: ['everyday-gold', 'gifts'],
  },
  {
    slug: 'noor-gold-band',
    name: 'Noor Gold Band',
    subtitle: 'Polished dome ring',
    category: 'rings',
    sku: 'AUR-RG-006',
    price: 6800,
    cost: 2200,
    materials: ['18k Gold Vermeil'],
    badges: [],
    tags: ['band', 'minimal', 'everyday'],
    sizes: RING_SIZES,
    colors: ['Gold'],
    stock: { '5': 10, '6': 12, '7': 12, '8': 8, '9': 5 },
    images: [IMG.noor1, IMG.noor2],
    description:
      'Noor — meaning light — is a softly domed band polished to a luminous finish. The perfect everyday ring, and a beautiful canvas for stacking.',
    details: ['3 mm softly domed profile', '18k gold vermeil over sterling silver', 'Comfort-fit interior', 'Engraving available on request'],
    daysAgo: 70,
    collections: ['everyday-gold'],
  },
  {
    slug: 'luna-tennis-bracelet',
    name: 'Luna Tennis Bracelet',
    subtitle: 'Classic line of brilliant stones',
    category: 'bracelets',
    sku: 'AUR-BR-001',
    price: 22500,
    cost: 8400,
    materials: ['Sterling Silver', 'Cubic Zirconia'],
    badges: ['bestseller'],
    tags: ['tennis', 'sparkle', 'bridal', 'gift'],
    sizes: ['6 in', '6.5 in', '7 in'],
    colors: ['Silver'],
    stock: { '6 in': 6, '6.5 in': 11, '7 in': 7 },
    images: [IMG.tennis1, IMG.tennis2],
    description:
      'An unbroken line of brilliant-cut stones, each individually set to move fluidly around the wrist. Luna is the timeless tennis bracelet — red-carpet sparkle, everyday ease.',
    details: ['3 mm brilliant-cut AAAAA cubic zirconia', 'Rhodium-plated 925 sterling silver', 'Box clasp with safety latch', 'Available in three lengths'],
    daysAgo: 135,
    featured: true,
    collections: ['bridal', 'gifts'],
  },
  {
    slug: 'aria-chain-bracelet',
    name: 'Aria Chain Bracelet',
    subtitle: 'Fine curb chain bracelet',
    category: 'bracelets',
    sku: 'AUR-BR-002',
    price: 8200,
    cost: 2700,
    materials: ['18k Gold Vermeil'],
    badges: [],
    tags: ['chain', 'everyday', 'layering'],
    sizes: ['6.5 in', '7 in'],
    colors: ['Gold'],
    stock: { '6.5 in': 16, '7 in': 13 },
    images: [IMG.ariaChain],
    description:
      'A fine, fluid curb chain that drapes softly at the wrist. Aria is the foundation of every bracelet stack — and beautiful on its own.',
    details: ['2.5 mm curb chain', '18k gold vermeil over sterling silver', 'Lobster clasp with extender', 'Water-resistant finish'],
    daysAgo: 90,
    collections: ['everyday-gold'],
  },
  {
    slug: 'mehr-id-bracelet',
    name: 'Mehr ID Bracelet',
    subtitle: 'Engravable tag bracelet',
    category: 'bracelets',
    sku: 'AUR-BR-003',
    price: 9900,
    cost: 3300,
    materials: ['18k Gold Vermeil'],
    badges: ['new'],
    tags: ['personalised', 'engravable', 'gift'],
    sizes: ['6.5 in', '7 in'],
    colors: ['Gold'],
    stock: { '6.5 in': 12, '7 in': 10 },
    images: [IMG.mehrId],
    description:
      'A delicate chain with a polished ID tag, ready to carry initials, a date or a name that matters. Mehr is personal jewelry made beautifully simple.',
    details: ['Polished 18 × 6 mm tag', 'Complimentary engraving — add a note at checkout', '18k gold vermeil over sterling silver', 'Adjustable fit'],
    daysAgo: 18,
    collections: ['gifts'],
  },
  {
    slug: 'amulet-charm-bracelets',
    name: 'Amulet Charm Bracelet Trio',
    subtitle: 'Three fine charm bracelets',
    category: 'bracelets',
    sku: 'AUR-BR-004',
    price: 15500,
    compareAt: 17500,
    cost: 5600,
    materials: ['18k Gold Vermeil', 'Freshwater Pearl'],
    badges: ['sale'],
    tags: ['charm', 'set', 'stacking', 'gift'],
    colors: ['Gold'],
    stock: 8,
    images: [IMG.amulet],
    description:
      'A curated trio of fine chains, each with its own tiny charm — a pearl, a disc and a star. Wear all three for a story-telling stack, or share one with your best friend.',
    details: ['Set of 3 adjustable bracelets', 'Charms: freshwater pearl, polished disc, star', '18k gold vermeil over sterling silver', 'Adjustable 6–7.5 in'],
    daysAgo: 60,
    collections: ['gifts'],
  },
  {
    slug: 'nilam-sapphire-bracelet',
    name: 'Nilam Sapphire Bracelet',
    subtitle: 'Midnight-blue sapphire stations',
    category: 'bracelets',
    sku: 'AUR-BR-005',
    price: 34500,
    cost: 14000,
    materials: ['18k Gold Vermeil', 'Blue Sapphire'],
    badges: ['limited'],
    tags: ['sapphire', 'blue', 'statement'],
    colors: ['Gold'],
    stock: 0,
    images: [IMG.nilam],
    description:
      'Nilam — sapphire in Urdu — pairs midnight-blue stones with a whisper-fine gold chain. A rare, limited piece that brings depth and colour to your collection.',
    details: ['Five 4 mm lab-created blue sapphires', 'Bezel-set stations', '18k gold vermeil over sterling silver', 'Limited edition of 50 pieces'],
    daysAgo: 40,
  },
  {
    slug: 'serene-pearl-set',
    name: 'Serene Pearl Set',
    subtitle: 'Blush pearl necklace & earrings',
    category: 'jewelry-sets',
    sku: 'AUR-ST-001',
    price: 29500,
    cost: 11500,
    materials: ['Freshwater Pearl', '18k Gold Vermeil'],
    badges: ['bestseller'],
    tags: ['pearl', 'set', 'gift', 'bridal'],
    colors: ['Gold'],
    stock: 10,
    images: [IMG.serenePearl],
    description:
      'A soft-blush freshwater pearl strand with matching drop earrings, presented in our keepsake box. Serene is the gift that marks a milestone — weddings, Eid, or a mother’s day to remember.',
    details: ['Necklace: 18 in strand of 7 mm blush pearls', 'Earrings: 8 mm pearl drops', '18k gold vermeil findings', 'Presented in a velvet-lined keepsake box'],
    daysAgo: 145,
    featured: true,
    collections: ['pearl-edit', 'gifts', 'bridal'],
  },
  {
    slug: 'rania-bridal-set',
    name: 'Rania Bridal Set',
    subtitle: 'Kundan-inspired necklace & jhumkas',
    category: 'jewelry-sets',
    sku: 'AUR-ST-002',
    price: 64000,
    cost: 26000,
    materials: ['22k Gold Plated Brass', 'Kundan Stones', 'Freshwater Pearl'],
    badges: ['limited'],
    tags: ['bridal', 'kundan', 'traditional', 'wedding'],
    colors: ['Gold'],
    stock: 4,
    images: [IMG.raniaBridal],
    description:
      'A heritage-inspired bridal set with hand-set kundan stones and pearl drops, reimagined with a lighter, contemporary silhouette. Made for your mehndi, baraat and every celebration after.',
    details: ['Statement necklace with adjustable dori', 'Matching earrings with pearl drops', 'Hand-set kundan-style stones', 'Made to order in 10–12 working days'],
    daysAgo: 75,
    collections: ['bridal'],
  },
  {
    slug: 'heirloom-pearl-gift-set',
    name: 'Heirloom Pearl Gift Set',
    subtitle: 'Pearl studs & pendant in a keepsake box',
    category: 'jewelry-sets',
    sku: 'AUR-ST-003',
    price: 18900,
    compareAt: 21000,
    cost: 6900,
    materials: ['Freshwater Pearl', 'Sterling Silver'],
    badges: ['sale', 'new'],
    tags: ['pearl', 'gift', 'set'],
    colors: ['Silver'],
    stock: 14,
    images: [IMG.heirloomPearl],
    description:
      'Classic pearl studs and a matching pendant, curated together for effortless gifting. The Heirloom set is a first piece of fine jewelry she will treasure for decades.',
    details: ['7 mm freshwater pearl studs', 'Pearl pendant on 18 in sterling chain', 'Rhodium-plated 925 sterling silver', 'Gift box and handwritten note included'],
    daysAgo: 20,
    collections: ['gifts', 'pearl-edit'],
  },
];

export const SEED_DISCOUNTS = [
  { code: 'WELCOME10', description: '10% off your first order (newsletter)', type: 'percentage', value: 10, minOrderAmount: 0, oncePerCustomer: true },
  { code: 'AURELLE15', description: '15% off orders over Rs 25,000', type: 'percentage', value: 15, minOrderAmount: 2500000, usageLimit: 100, usageCount: 37 },
  { code: 'FREESHIP', description: 'Free shipping on orders over Rs 5,000', type: 'free_shipping', value: 0, minOrderAmount: 500000 },
  { code: 'EID2000', description: 'Rs 2,000 off orders over Rs 15,000', type: 'fixed', value: 200000, minOrderAmount: 1500000, endsInDays: 30 },
  { code: 'PEARL20', description: '20% off The Pearl Edit', type: 'percentage', value: 20, minOrderAmount: 0, appliesTo: 'collections', collectionSlugs: ['pearl-edit'] },
  { code: 'BRIDAL5K', description: 'Rs 5,000 off Bridal over Rs 50,000', type: 'fixed', value: 500000, minOrderAmount: 5000000, appliesTo: 'collections', collectionSlugs: ['bridal'], usageLimit: 20, usageCount: 6 },
  { code: 'SUMMER25', description: 'Summer sale (expired)', type: 'percentage', value: 25, minOrderAmount: 0, endsInDays: -30, active: true },
] as const;

export const CUSTOMER_NAMES = [
  ['Ayesha', 'Khan'], ['Hira', 'Ahmed'], ['Mahnoor', 'Siddiqui'], ['Zainab', 'Raza'], ['Fatima', 'Malik'], ['Sana', 'Javed'],
  ['Mehwish', 'Butt'], ['Amna', 'Qureshi'], ['Iqra', 'Sheikh'], ['Maryam', 'Chaudhry'], ['Noor', 'Abbasi'], ['Areeba', 'Hussain'],
  ['Laiba', 'Farooq'], ['Anam', 'Rizvi'], ['Kinza', 'Mirza'], ['Rabia', 'Aslam'], ['Hania', 'Shah'], ['Eman', 'Nawaz'],
  ['Saba', 'Iqbal'], ['Mariam', 'Zafar'], ['Alizeh', 'Tariq'], ['Sadia', 'Akhtar'], ['Mahira', 'Saleem'], ['Bushra', 'Anwar'],
  ['Zoya', 'Hashmi'], ['Komal', 'Rafiq'], ['Sidra', 'Yousaf'], ['Nimra', 'Bhatti'], ['Hafsa', 'Usman'], ['Aiman', 'Gillani'],
  ['Sara', 'Haider'], ['Rida', 'Kamal'], ['Javeria', 'Saeed'], ['Minahil', 'Awan'], ['Urooj', 'Baig'], ['Arooj', 'Naqvi'],
  ['Shiza', 'Ali'], ['Fiza', 'Hamid'], ['Dua', 'Waheed'], ['Ramsha', 'Lodhi'], ['Usman', 'Tahir'], ['Bilal', 'Hassan'],
  ['Hamza', 'Shafiq'], ['Ali', 'Raza'], ['Omar', 'Farooqi'],
];

export const CITIES: { city: string; province: string; weight: number }[] = [
  { city: 'Lahore', province: 'Punjab', weight: 30 },
  { city: 'Karachi', province: 'Sindh', weight: 26 },
  { city: 'Islamabad', province: 'Islamabad Capital Territory', weight: 14 },
  { city: 'Rawalpindi', province: 'Punjab', weight: 7 },
  { city: 'Faisalabad', province: 'Punjab', weight: 6 },
  { city: 'Multan', province: 'Punjab', weight: 4 },
  { city: 'Peshawar', province: 'Khyber Pakhtunkhwa', weight: 4 },
  { city: 'Sialkot', province: 'Punjab', weight: 3 },
  { city: 'Hyderabad', province: 'Sindh', weight: 3 },
  { city: 'Quetta', province: 'Balochistan', weight: 2 },
  { city: 'Gujranwala', province: 'Punjab', weight: 1 },
];

export const STREETS = [
  'House 24, Street 7, DHA Phase 5',
  'Flat 3B, Clifton Block 8',
  'House 112, F-7/2',
  '45-A, Model Town',
  'House 9, Bahria Town Phase 4',
  '17-C, Gulberg II',
  'House 58, PECHS Block 2',
  '221, Johar Town Block J',
  'House 6, University Town',
  '12-B, Cantt',
  'House 31, Satellite Town',
  'Apartment 5, Emaar Canyon Views',
];

export const REVIEW_SNIPPETS: Record<string, { title: string; body: string; rating: number }[]> = {
  necklaces: [
    { title: 'My everyday necklace', body: 'I have not taken it off since it arrived. Still shining after weeks of daily wear, and it layers so beautifully.', rating: 5 },
    { title: 'Even prettier in person', body: 'The photos do not do it justice. The finish is so refined and the packaging felt like a real luxury unboxing.', rating: 5 },
    { title: 'Perfect gift', body: 'Bought this for my sister’s birthday and she loved it. Delivery to Karachi took just three days.', rating: 5 },
    { title: 'Delicate and elegant', body: 'Lovely quality. I wish the chain came in a slightly longer length, but the extender helps.', rating: 4 },
  ],
  earrings: [
    { title: 'So lightweight', body: 'I can wear them all day without feeling them. They go with everything from jeans to formal shalwar kameez.', rating: 5 },
    { title: 'Compliments everywhere', body: 'Wore them to a mehndi and got asked about them all night. Absolutely in love.', rating: 5 },
    { title: 'Beautiful finish', body: 'Gorgeous earrings, very well made. The clasp is secure which I really appreciate.', rating: 4 },
  ],
  rings: [
    { title: 'Breathtaking sparkle', body: 'The stone catches light from every angle. The certificate and box made it feel truly special.', rating: 5 },
    { title: 'Sizing help was great', body: 'The team helped me find my size on WhatsApp before ordering. Fits perfectly.', rating: 5 },
    { title: 'Stunning quality', body: 'Exactly as described. Comfortable to wear every day and looks far more expensive than it is.', rating: 5 },
    { title: 'Lovely ring', body: 'Beautiful design. Took a few extra days to arrive in Peshawar but worth the wait.', rating: 4 },
  ],
  bracelets: [
    { title: 'Elegant on the wrist', body: 'It sits so beautifully and the clasp feels very secure. I wear it with my watch every day.', rating: 5 },
    { title: 'Great for stacking', body: 'Pairs perfectly with my other bracelets. The gold tone is warm and rich, not brassy at all.', rating: 5 },
    { title: 'Very pretty', body: 'Lovely bracelet, though I sized down for a snugger fit. Customer care was quick to exchange.', rating: 4 },
  ],
  'jewelry-sets': [
    { title: 'Made my mother cry (happy tears)', body: 'Gifted this for Eid and the presentation was stunning. The pearls have such a lovely glow.', rating: 5 },
    { title: 'Wore it on my wedding day', body: 'Received so many compliments. Elegant, lightweight and photographed beautifully.', rating: 5 },
    { title: 'Worth every rupee', body: 'High quality pieces and gorgeous box. Delivery was on time and well packed.', rating: 5 },
  ],
};

const md = String.raw;

export const SEED_PAGES = [
  {
    slug: 'about',
    title: 'Our Story',
    template: 'about',
    seoDescription: 'Evermoon Jewels is a Lahore studio for pretty jewellery — gold vermeil, pearls and lab-grown diamonds, made to be worn.',
    content: md`## Born in Lahore, made to be worn

Evermoon Jewels began at a small studio table in Gulberg, with a simple belief: jewellery should feel personal, effortless and made to be worn — not locked away for special occasions.

Today, every Evermoon piece is still designed in Lahore and finished by hand. We work with thick 18k gold vermeil over solid 925 sterling silver, 14k solid gold, freshwater pearls and certified lab-grown diamonds, so that each design is as responsible as it is beautiful.

## Our promise

- **Considered materials** — hypoallergenic, nickel-free metals made for sensitive skin.
- **Hand finishing** — every chain is inspected, every stone set and polished by our artisans.
- **Thoughtful service** — sizing help on WhatsApp, EasyPaisa, JazzCash or bank transfer, and easy 7-day returns.
- **Gift-ready, always** — each order arrives in our signature ivory box with a handwritten note.

## Visit the atelier

Our Gulberg atelier welcomes private appointments for bridal consultations, custom engraving and ring sizing. [Book an appointment](/contact) — we would love to meet you.`,
  },
  {
    slug: 'contact',
    title: 'Contact Us',
    template: 'contact',
    seoDescription: 'Contact Evermoon Jewels client care by phone, WhatsApp or email, or visit our Gulberg atelier in Lahore.',
    content: md`We are here to help with sizing, styling, orders and bridal appointments. Our client care team replies within one working day — usually much sooner on WhatsApp.`,
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    template: 'faq',
    seoDescription: 'Answers about orders, delivery, EasyPaisa, JazzCash, bank transfer, returns, sizing and jewelry care at Evermoon Jewels.',
    content: md`## Orders & Payment

### Which payment methods do you accept?
Cash on Delivery, EasyPaisa, JazzCash and bank transfer. Card payments are not offered. EasyPaisa, JazzCash and bank transfer need a receipt at checkout, and the order is confirmed only after we verify that payment. Cash on Delivery is paid to the courier when the order arrives.

### How do I pay by EasyPaisa, JazzCash or bank transfer?
Choose the method at checkout, send the exact total to the account shown, and upload a JPG, PNG, WEBP or PDF receipt. The order stays under review until the payment is verified. Uploading a receipt does not confirm the payment by itself.

## Shipping & Delivery

### How long will delivery take?
Standard delivery takes 3–5 working days nationwide. Express delivery (1–2 working days) is available in Lahore, Karachi and Islamabad.

### How much does shipping cost?
Standard shipping is Rs 250 and Express is Rs 500. Standard shipping is complimentary on orders over Rs 10,000.

### How can I track my order?
You will receive your tracking number once your order ships. Signed-in customers can follow every status update under **Account → Orders**.

## Returns & Exchanges

### What is your return policy?
Unworn pieces in original packaging can be returned or exchanged within 7 days of delivery. Earrings are final sale for hygiene reasons unless faulty. See our [Return Policy](/policies/return-policy).

### Do you resize rings?
Solid gold rings include one complimentary resize within 30 days. Gold vermeil rings can be exchanged for a different size.

## Product & Care

### What is gold vermeil?
Vermeil is a thick layer (2.5 microns) of 18k gold over solid 925 sterling silver — far more durable than ordinary plating.

### Are your diamonds real?
Yes. Our diamonds are lab-grown: chemically, physically and optically identical to mined diamonds, and certified by IGI.

### How should I care for my jewelry?
Store pieces separately in the pouch provided, avoid perfume and water, and polish gently with a soft cloth. Read our full [care guide](/pages/jewelry-care).`,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    template: 'policy',
    seoDescription: 'Delivery times, shipping costs and coverage across Pakistan for Evermoon Jewels orders.',
    content: md`## Delivery across Pakistan

We deliver to every city in Pakistan through our trusted courier partners (TCS, Leopards and M&P).

| Method | Time | Cost |
| --- | --- | --- |
| Standard Delivery | 3–5 working days | Rs 250 · free over Rs 10,000 |
| Express Delivery | 1–2 working days (Lahore, Karachi, Islamabad) | Rs 500 |

## Processing time

Orders placed before 2 pm PKT (Monday–Saturday) are dispatched the same day. Made-to-order bridal pieces dispatch within 10–12 working days.

## Order confirmation

EasyPaisa, JazzCash and bank-transfer orders ship once the receipt and the funds are verified.

## Tracking

Once your order ships, you will receive a tracking number by email and SMS. You can also view status updates in your account.

## International shipping

We currently ship within Pakistan only. For international enquiries, please [contact us](/contact).`,
  },
  {
    slug: 'return-policy',
    title: 'Returns & Exchanges',
    template: 'policy',
    seoDescription: 'Evermoon Jewels 7-day returns and exchanges policy.',
    content: md`## 7-day returns & exchanges

If you are not completely in love with your piece, you may return or exchange it within **7 days of delivery**.

## Conditions

- Items must be unworn, undamaged and returned in their original packaging with all certificates.
- Earrings are final sale for hygiene reasons, unless they arrive faulty.
- Personalised, engraved and made-to-order pieces cannot be returned.

## How to return

1. Email care@maisonaurelle.pk or WhatsApp us with your order number.
2. We will arrange a courier pickup from your address (Rs 200 return fee, waived for exchanges).
3. Refunds are issued within 5–7 working days of receiving your return — to your bank account, wallet or original card.

## Faulty items

If your piece arrives damaged or develops a manufacturing fault within 6 months, we will repair or replace it free of charge.`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    template: 'policy',
    seoDescription: 'How Evermoon Jewels collects, uses and protects your personal information.',
    content: md`## Your privacy matters

This policy explains what information Evermoon Jewels collects when you visit our website or place an order, and how we use it.

## Information we collect

- **Account and order details** — name, email, phone number and delivery address.
- **Payment information** — EasyPaisa, JazzCash and bank-transfer receipts are stored privately for verification. We do not accept card payments and never store card numbers.
- **Usage data** — basic, anonymised analytics to improve our website.

## How we use your information

We use your details to process and deliver orders, provide client care, prevent fraud and — only if you opt in — send you news about collections and offers.

## Sharing

We share delivery details with our courier partners and payment details with our payment processor, solely to fulfil your order. We never sell your data.

## Your rights

You can access, correct or delete your personal data at any time from your account, or by emailing care@maisonaurelle.pk.

## Security

Passwords are hashed, connections are encrypted with TLS, and access to customer data is restricted to authorised staff.`,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    template: 'policy',
    seoDescription: 'Terms and conditions for shopping with Evermoon Jewels.',
    content: md`## Overview

By using this website and placing an order, you agree to the following terms.

## Products & pricing

All prices are listed in Pakistani Rupees (PKR). We make every effort to display colours and details accurately; natural materials such as pearls vary slightly piece to piece.

## Orders

An order is confirmed once we send an order confirmation. We reserve the right to cancel orders in cases of suspected fraud or pricing errors, with a full refund of any payment made.

## Payment

EasyPaisa, JazzCash and bank-transfer orders are processed only after the receipt and the funds are verified. Uploading a receipt does not by itself confirm payment.

## Intellectual property

All designs, photography and content on this website belong to Evermoon Jewels or are used under licence.

## Governing law

These terms are governed by the laws of Pakistan, with exclusive jurisdiction of the courts of Lahore.`,
  },
  {
    slug: 'jewelry-care',
    title: 'Jewelry Care Guide',
    template: 'default',
    seoDescription: 'How to care for gold vermeil, solid gold, pearls and diamonds.',
    content: md`## Gold vermeil

- Put your jewelry on last — after perfume, lotion and hairspray.
- Remove before swimming, showering, exercising or sleeping.
- Store each piece separately in its pouch to prevent scratches.

## Solid gold & diamonds

Soak in warm water with a drop of mild soap, brush gently with a soft toothbrush and dry with a lint-free cloth. Bring your diamond pieces to our atelier yearly for a complimentary prong check.

## Pearls

Pearls are organic and delicate. Wipe with a soft, damp cloth after wearing, store flat, and never use chemical cleaners. We recommend re-knotting strands every two years.`,
  },
  {
    slug: 'credits',
    title: 'Photography Credits',
    template: 'default',
    seoDescription: 'Photography credits for imagery used on the Evermoon Jewels website.',
    content:
      'Campaign and product imagery for the Aurelia, Amara, Celestine, Luna Crescent and Soleil pieces, as well as our homepage campaign, are original Evermoon Jewels artwork.\n\nAdditional photography is used under the [Unsplash License](https://unsplash.com/license), with thanks to the following photographers:\n\n' +
      Array.from(new Map(UNSPLASH_CREDITS.map((c) => [c.photographer, c])).values())
        .map((c) => `- [${c.photographer}](${c.profile}) on Unsplash`)
        .join('\n'),
  },
];

export const NAVIGATION = {
  main: [
    {
      label: 'Shop',
      href: '/shop',
      children: [
        { label: 'All Jewelry', href: '/shop' },
        { label: 'Rings', href: '/collections/rings' },
        { label: 'Necklaces', href: '/collections/necklaces' },
        { label: 'Earrings', href: '/collections/earrings' },
        { label: 'Bracelets', href: '/collections/bracelets' },
        { label: 'Jewelry Sets', href: '/collections/jewelry-sets' },
      ],
    },
    { label: 'New Arrivals', href: '/collections/new-arrivals' },
    { label: 'Best Sellers', href: '/collections/best-sellers' },
    {
      label: 'Collections',
      href: '/collections',
      children: [
        { label: 'The Pearl Edit', href: '/collections/pearl-edit' },
        { label: 'Bridal', href: '/collections/bridal' },
        { label: 'Everyday Gold', href: '/collections/everyday-gold' },
        { label: 'Gifts', href: '/collections/gifts' },
        { label: 'Sale', href: '/collections/sale' },
      ],
    },
    { label: 'About', href: '/about' },
  ],
  footer: [
    {
      title: 'Shop',
      links: [
        { label: 'All Jewelry', href: '/shop' },
        { label: 'New Arrivals', href: '/collections/new-arrivals' },
        { label: 'Best Sellers', href: '/collections/best-sellers' },
        { label: 'Gifts', href: '/collections/gifts' },
        { label: 'Sale', href: '/collections/sale' },
      ],
    },
    {
      title: 'Client Care',
      links: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Shipping Policy', href: '/policies/shipping-policy' },
        { label: 'Returns & Exchanges', href: '/policies/return-policy' },
        { label: 'Track Your Order', href: '/account/orders' },
      ],
    },
    {
      title: 'The House',
      links: [
        { label: 'Our Story', href: '/about' },
        { label: 'Jewelry Care', href: '/pages/jewelry-care' },
        { label: 'Privacy Policy', href: '/policies/privacy-policy' },
        { label: 'Terms of Service', href: '/policies/terms-of-service' },
        { label: 'Photography Credits', href: '/pages/credits' },
      ],
    },
  ],
};

export const DEFAULT_SETTINGS = {
  store: {
    name: 'Evermoon Jewels',
    tagline: 'Wear Your Little Wonder',
    email: 'care@maisonaurelle.pk',
    phone: '+92 300 1234567',
    whatsapp: '923001234567',
    address: '42-C Main Boulevard, Gulberg III, Lahore 54660, Pakistan',
    hours: 'Monday – Saturday, 11am – 8pm PKT',
  },
  shipping: {
    freeThreshold: 1000000,
    methods: [
      { id: 'standard', name: 'Standard Delivery', description: '3–5 working days, nationwide', price: 25000, enabled: true },
      { id: 'express', name: 'Express Delivery', description: '1–2 working days · Lahore, Karachi, Islamabad', price: 50000, enabled: true },
    ],
  },
  payments: {
    cod: { enabled: true, fee: 0, maxOrder: 20000000, instructions: 'Pay the courier in cash when your order arrives. We may call to confirm the address before dispatch.' },
    bank: {
      enabled: true,
      bankName: 'Meezan Bank',
      accountTitle: 'Evermoon Jewels',
      accountNumber: '0101-0105678901',
      iban: 'PK36MEZN0001010105678901',
      instructions: 'Transfer the exact order total, then upload a screenshot or PDF of the receipt. The order stays under review until the payment is verified.',
    },
    easypaisa: {
      enabled: true,
      accountName: 'Evermoon Jewels',
      accountNumber: '0345-1234567',
      instructions: 'Send the exact order total to this EasyPaisa account, then upload a screenshot or PDF of the receipt. The order is confirmed only after the payment is verified.',
    },
    jazzcash: {
      enabled: true,
      accountName: 'Evermoon Jewels',
      accountNumber: '0300-1234567',
      instructions: 'Send the exact order total to this JazzCash account, then upload a screenshot or PDF of the receipt. The order is confirmed only after the payment is verified.',
    },
    wallet: {
      enabled: false,
      jazzcash: '0300-1234567',
      easypaisa: '0345-1234567',
      accountTitle: 'Evermoon Jewels',
      instructions: 'Legacy combined wallet. Use the separate EasyPaisa and JazzCash methods.',
    },
    card: { enabled: false },
  },
  tax: { enabled: false, rate: 0, label: 'Sales tax', inclusive: true },
  social: {
    instagram: 'https://instagram.com/',
    facebook: 'https://facebook.com/',
    pinterest: 'https://pinterest.com/',
    tiktok: 'https://tiktok.com/',
  },
  navigation: NAVIGATION,
  search: { popular: ['Pearl earrings', 'Gold hoops', 'Tennis bracelet', 'Solitaire ring', 'Gift sets', 'Bridal'] },
  theme: { active: 'soft-luxury', visitorSwitcher: true },
  seo: {
    title: 'Evermoon Jewels — Wear Your Little Wonder',
    description:
      'Timeless fine jewelry designed in Lahore — 18k gold vermeil, freshwater pearls and lab-grown diamonds. Cash on Delivery, EasyPaisa, JazzCash and bank transfer, with free shipping over Rs 10,000.',
  },
  reviews: { autoPublishVerified: true },
};
