// Données de référence d'Energy Plus. Prix, stocks et tarifs de livraison : valeurs de lancement
// modifiables dans l'administration. Aucune caractéristique sans source.

export const PERMISSIONS = [
  "dashboard.view", "catalog.manage", "inventory.manage", "orders.manage", "payments.manage",
  "delivery.manage", "customers.manage", "content.manage", "staff.manage", "settings.manage", "audit.view",
];

export const ROLES = [
  { code: "super_admin", name: "Super administrateur", system: true, perms: PERMISSIONS },
  { code: "manager", name: "Gestionnaire", perms: ["dashboard.view", "catalog.manage", "inventory.manage", "orders.manage", "payments.manage", "delivery.manage", "customers.manage", "content.manage"] },
  { code: "order_operator", name: "Opérateur commandes", perms: ["dashboard.view", "orders.manage", "delivery.manage"] },
  { code: "content_editor", name: "Éditeur contenu", perms: ["content.manage"] },
];

export const CITIES = [
  { name: "Douala", region: "Littoral", fee: 0, eta: [60, 90], quarters: ["Akwa", "Bonanjo", "Bonapriso", "Bonamoussadi", "Makepe", "Deïdo", "Bali", "New Bell", "Bépanda", "Logbaba", "Ndokoti", "Kotto", "Logpom", "Bonabéri", "Cité des Palmiers", "Village", "Yassa", "PK 8", "Ndogbong", "Akwa Nord"] },
  { name: "Yaoundé", region: "Centre", fee: 0, eta: [60, 90], quarters: ["Bastos", "Mvan", "Biyem-Assi", "Essos", "Mvog-Mbi", "Nlongkak", "Emana", "Odza", "Mendong", "Ngousso", "Omnisport", "Etoudi", "Melen", "Nkolbisson", "Mimboman", "Ekounou", "Nsimeyong", "Elig-Essono", "Tsinga", "Mokolo"] },
  ...["Bafoussam", "Bamenda", "Buea", "Limbé", "Kribi", "Edéa", "Kumba", "Nkongsamba", "Dschang", "Ebolowa", "Bertoua", "Ngaoundéré", "Garoua", "Maroua"].map((name) => ({ name, region: null, fee: 0, eta: [1440, 1440], quarters: [] })),
];

export const CATEGORIES = [
  { slug: "energie", name: "Énergie", description: "Batteries externes et accessoires pour garder vos appareils chargés, même pendant les coupures.", children: [{ slug: "powerbanks", name: "Powerbanks", description: "Batteries externes magnétiques et filaires pour smartphones." }] },
  { slug: "maison", name: "Maison", description: "Des appareils simples pour le confort de la maison.", children: [{ slug: "anti-moustiques", name: "Anti-moustiques", description: "Lampes et accessoires pour réduire la présence des moustiques dans la maison, en complément de la moustiquaire." }] },
  { slug: "beaute", name: "Beauté", description: "Une sélection courte de soins authentiques.", children: [{ slug: "soins-visage", name: "Soins du visage", description: "Sérums et soins pour le visage." }] },
];

const SRC_VISUEL = "Visuels et emballage du fournisseur (dossier produit Energy Plus)";

export const PRODUCTS = [
  {
    slug: "powerbank-magnetique-sans-fil",
    name: "Powerbank magnétique sans fil",
    category: "energie/powerbanks",
    brand: null,
    image_alt: "Powerbank magnétique blanche fixée au dos d'un smartphone",
    short: "Une batterie externe qui se fixe au dos de votre téléphone et le recharge sans câble. Idéale pendant les coupures de courant et les longues journées.",
    seo_title: "Powerbank magnétique sans fil 10 000 mAh",
    seo_description: "Batterie externe magnétique qui se fixe au dos du téléphone et charge sans fil. Livraison à Douala, Yaoundé et partout au Cameroun, paiement à la livraison.",
    variants: [
      { sku: "EP-PB-MAG-10K", title: "10 000 mAh", options: { "Capacité": "10 000 mAh" }, price: 16500, stock: 10 },
    ],
    specs: [
      { label: "Capacité nominale", value: "10 000 mAh", source: SRC_VISUEL },
      { label: "Fixation", value: "Magnétique, au dos des téléphones compatibles MagSafe", source: SRC_VISUEL },
      { label: "Recharge du téléphone", value: "Sans fil (induction) ou par câble", source: SRC_VISUEL },
      { label: "Compatibilité magnétique", value: "iPhone 12 et modèles ultérieurs ; autres téléphones avec un anneau magnétique et la charge sans fil", source: "Apple, Guide utilisateur de l'iPhone (MagSafe) : https://support.apple.com/guide/iphone/iphac0f12e49/ios" },
    ],
    body: [
      { type: "benefits", items: ["Se fixe seule au dos du téléphone : pas de câble à chercher", "Rechargez en continuant à utiliser votre téléphone", "Format de poche, à glisser dans un sac ou une poche", "Port pour recharger aussi par câble quand vous êtes pressé"] },
      { type: "text", title: "Pour qui ?", body: "Pour celles et ceux qui passent la journée dehors, qui vivent les coupures de courant du soir, ou qui veulent simplement ne plus tomber en panne de batterie. Ses 10 000 mAh tiennent une journée de coupure pour la plupart des smartphones." },
      { type: "text", title: "Combien de recharges ?", body: "La capacité en mAh n'est pas l'énergie réellement transmise : une partie se perd en chaleur, surtout en charge sans fil. En pratique, comptez un peu moins de deux recharges complètes pour beaucoup de smartphones récents, davantage pour un petit téléphone. Le détail du calcul est dans notre guide." },
      { type: "safety", items: ["Ne pas recharger au soleil ni sous un oreiller", "Retirer la batterie si l'ensemble devient très chaud", "Ne plus utiliser une batterie gonflée ou déformée", "En avion : en cabine uniquement, jamais en soute"] },
      { type: "faq", items: [
        { q: "En combien de temps suis-je livré ?", a: "En 1 h à 1 h 30 à Douala et Yaoundé, le jour même. Dans les autres villes desservies, sous 24 h." },
        { q: "Est-ce compatible avec mon téléphone ?", a: "La fixation magnétique fonctionne avec les iPhone 12 et modèles ultérieurs. Pour un autre téléphone qui accepte la charge sans fil, ajoutez un anneau ou une coque magnétique. Sinon, utilisez la recharge par câble. En cas de doute, écrivez-nous avant de commander." },
        { q: "Puis-je la prendre en avion ?", a: "Oui, en bagage cabine uniquement. Une batterie de 10 000 mAh représente environ 37 Wh, sous le seuil de 100 Wh généralement accepté sans accord de la compagnie. Vérifiez toujours les règles de votre compagnie." },
        { q: "Comment payer ?", a: "À la livraison, en espèces, à Douala, Yaoundé et dans les autres villes desservies." },
      ] },
    ],
    image_files: ["images produit/MAGNETIC WIRELESS POWER BANK.jpg", "images produit/WhatsApp Image 2026-06-22 at 3.35.56 AM.jpeg"],
  },
  {
    slug: "lampe-anti-moustiques-mosqitoshot",
    name: "MosqitoShot, lampe anti-moustiques rechargeable",
    category: "maison/anti-moustiques",
    brand: null,
    image_alt: "Lampe anti-moustiques MosqitoShot allumée, lumière violette",
    short: "Une lampe rechargeable par USB qui attire et capture une partie des moustiques présents dans la pièce, sans spray ni odeur. Un complément à la moustiquaire.",
    seo_title: "Lampe anti-moustiques rechargeable MosqitoShot",
    seo_description: "Lampe anti-moustiques rechargeable USB, sans produit chimique ni odeur, à utiliser en complément de la moustiquaire. Paiement à la livraison au Cameroun.",
    variants: [{ sku: "EP-MOSQ-LAMP", title: "Standard", options: {}, price: 12500, stock: 10 }],
    specs: [
      { label: "Principe", value: "Lumière violette qui attire les insectes volants vers une grille", source: SRC_VISUEL },
      { label: "Alimentation", value: "Batterie rechargeable par USB", source: SRC_VISUEL },
      { label: "Produit chimique", value: "Aucun insecticide ni diffuseur", source: SRC_VISUEL },
      { label: "Usage", value: "En intérieur, pièce sombre, en complément de la moustiquaire imprégnée", source: "OMS, aide-mémoire Paludisme : https://www.who.int/news-room/fact-sheets/detail/malaria" },
    ],
    body: [
      { type: "benefits", items: ["Sans spray, sans fumée, sans odeur", "Rechargeable par USB, pas de piles", "Silencieuse et transportable grâce à sa poignée", "S'utilise dans la chambre, le salon ou en voyage"] },
      { type: "text", title: "Ce qu'elle fait, et ce qu'elle ne fait pas", body: "Sa lumière attire une partie des moustiques présents dans une pièce fermée et sombre. Les études sur les pièges lumineux montrent qu'ils capturent des moustiques, avec des résultats qui varient selon les espèces et le lieu. Elle ne protège pas du paludisme : la moustiquaire imprégnée d'insecticide reste le geste de base recommandé par l'OMS. Utilisez la lampe en plus, jamais à la place." },
      { type: "text", title: "Bien l'utiliser", body: "Allumez-la en fin de journée, portes et fenêtres fermées, dans la partie sombre de la pièce et à l'écart du lit. Éteignez les autres lumières. Nettoyez la grille chaque semaine en saison des pluies, lampe éteinte et débranchée." },
      { type: "safety", items: ["Ne jamais passer les doigts à travers la grille", "Garder hors de portée des jeunes enfants", "Ne pas mouiller la grille ni les parties électriques", "En cas de fièvre après des piqûres, consulter rapidement un centre de santé"] },
      { type: "faq", items: [
        { q: "Remplace-t-elle la moustiquaire ?", a: "Non. Dormez toujours sous une moustiquaire imprégnée. La lampe réduit le nombre de moustiques dans la pièce, en complément." },
        { q: "Fonctionne-t-elle dehors ?", a: "Elle est conçue pour l'intérieur. Dehors, la lumière ambiante et le vent réduisent fortement son intérêt." },
        { q: "Comment la nettoyer ?", a: "Éteignez et débranchez-la, attendez quelques minutes, puis brossez la grille avec une petite brosse sèche. Pas d'eau." },
      ] },
    ],
    image_files: ["Creatives Statics/file_000000004a3c71f4b22e509fdca05189.png"],
    crop: { left: 300, top: 240, width: 660, height: 660 },
  },
  {
    slug: "biodance-pore-tightening-collagen-ampoule",
    name: "Biodance Pore Tightening Collagen Ampoule",
    category: "beaute/soins-visage",
    brand: "Biodance",
    image_alt: "Flacon compte-gouttes de l'ampoule Biodance Pore Tightening Collagen",
    short: "Le sérum coréen au collagène de Biodance, pensé pour une peau plus lisse et des pores moins visibles. Flacon compte-gouttes de 50 ml.",
    seo_title: "Biodance Pore Tightening Collagen Ampoule 50 ml",
    seo_description: "Sérum Biodance au collagène de bas poids moléculaire pour des pores moins visibles. Flacon de 50 ml, livraison au Cameroun, paiement à la livraison.",
    variants: [{ sku: "EP-BIOD-PTCA-50", title: "50 ml", options: { "Contenance": "50 ml" }, price: 19500, stock: 10 }],
    specs: [
      { label: "Marque", value: "Biodance (Corée du Sud)", source: SRC_VISUEL },
      { label: "Contenance", value: "50 ml", source: SRC_VISUEL },
      { label: "Ingrédients mis en avant", value: "Collagène de très bas poids moléculaire, peptide SYN-COLL (palmitoyl tripeptide-5), élastine, acide hyaluronique", source: "Fiches revendeurs : https://www.skincupid.us/products/pore-tightening-collagen-ampoule-50ml ; https://www.consentz.com/directory/products/brands/biodance/biodance-pore-tightening-collagen-ampoule/" },
      { label: "Composition complète", value: "Liste INCI imprimée sur l'emballage du flacon", source: "Emballage du produit" },
    ],
    body: [
      { type: "benefits", items: ["Texture légère qui pénètre vite, adaptée au climat chaud", "Collagène de bas poids moléculaire et peptide SYN-COLL", "Flacon compte-gouttes pour doser facilement", "S'intègre à une routine simple, matin et/ou soir"] },
      { type: "text", title: "Comment l'utiliser", body: "Après le nettoyage, appliquez quelques gouttes sur le visage, puis votre crème hydratante. Le matin, terminez toujours par une protection solaire. La première semaine, utilisez-la un jour sur deux pour observer la réaction de votre peau." },
      { type: "text", title: "Ce qu'il faut savoir", body: "Un sérum ne ferme pas les pores et ne traite pas l'acné : il aide à rendre la peau plus lisse et les pores moins visibles, avec des résultats qui varient d'une personne à l'autre. En cas d'acné, d'irritation ou de grossesse, demandez l'avis d'un dermatologue ou d'un pharmacien." },
      { type: "safety", items: ["Faire un test de tolérance 24 à 48 h derrière l'oreille", "Éviter le contour des yeux", "Arrêter en cas de rougeur ou de brûlure", "Conserver à l'abri de la chaleur"] },
      { type: "faq", items: [
        { q: "Le produit est-il authentique ?", a: "Nous vendons le produit de la marque Biodance, dans son emballage scellé, avec numéro de lot et date de péremption visibles. Vérifiez-les à la réception." },
        { q: "Convient-il aux peaux grasses ?", a: "Sa texture est légère. Comme pour tout nouveau soin, introduisez-le seul et observez votre peau pendant deux semaines." },
        { q: "Peut-on retourner un flacon ouvert ?", a: "Pour des raisons d'hygiène, les cosmétiques ouverts ne sont ni repris ni échangés, sauf défaut constaté à la livraison." },
      ] },
    ],
    image_files: ["Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo2.webp", "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo3.webp", "Biodance/Images produits/Biodance_PoreTighteningCollagenAmpoule_Photo4.webp"],
  },
];

export const ARTICLES = [
  { dir: "powerbank-magnetique", file: "01-coupures-de-courant.md", product: "powerbank-magnetique-sans-fil", cat: "energie-mobile" },
  { dir: "powerbank-magnetique", file: "02-capacite-reelle-mah.md", product: "powerbank-magnetique-sans-fil", cat: "guides-achat" },
  { dir: "powerbank-magnetique", file: "03-compatibilite-securite.md", product: "powerbank-magnetique-sans-fil", cat: "energie-mobile" },
  { dir: "mosqitoshot", file: "01-ce-que-fait-une-lampe.md", product: "lampe-anti-moustiques-mosqitoshot", cat: "maison-confort" },
  { dir: "mosqitoshot", file: "02-proteger-la-maison.md", product: "lampe-anti-moustiques-mosqitoshot", cat: "maison-confort" },
  { dir: "mosqitoshot", file: "03-utilisation-entretien.md", product: "lampe-anti-moustiques-mosqitoshot", cat: "maison-confort" },
  { dir: "biodance-collagen-ampoule", file: "01-pores-dilates.md", product: "biodance-pore-tightening-collagen-ampoule", cat: "beaute-soins" },
  { dir: "biodance-collagen-ampoule", file: "02-composition.md", product: "biodance-pore-tightening-collagen-ampoule", cat: "beaute-soins" },
  { dir: "biodance-collagen-ampoule", file: "03-routine-climat-chaud.md", product: "biodance-pore-tightening-collagen-ampoule", cat: "beaute-soins" },
];

export const POST_CATEGORIES = [
  { slug: "energie-mobile", name: "Énergie et mobile" },
  { slug: "maison-confort", name: "Maison et confort" },
  { slug: "beaute-soins", name: "Beauté et soins" },
  { slug: "guides-achat", name: "Guides d'achat" },
];

export const SETTINGS = {
  store: { name: "Energy Plus", tagline: "L'énergie qui suit votre journée", phone: "", whatsapp: "", email: "", hours: "Du lundi au samedi, 8 h – 19 h" },
  checkout: { cod_reservation_hours: 48, mobile_money_expiry_minutes: 30, max_qty_per_item: 5 },
};

// Images dans Neon Object Storage (bucket public « media »), générées par scripts/upload-images.mjs.
export const MEDIA_BASE = "https://br-falling-lake-bakkb361.storage.c-8.eu-central-1.aws.neon.tech/media/";
// Photos dans l'ordre de la galerie : clé, texte alternatif, [largeur demandée, largeur réelle, hauteur réelle].
export const PRODUCT_MEDIA: Record<string, { key: string; alt: string; kind: "photo" | "creative"; sizes: number[][] }[]> = {
  "powerbank-magnetique-sans-fil": [
    {
      "key": "products/powerbank-magnetique-sans-fil-abba708995",
      "alt": "Powerbank magnétique blanche, face avant et dos",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          640,
          640
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-f034747d3e",
      "alt": "Powerbank magnétique fixée au dos d'un smartphone",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1280,
          1280
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-5b515e5a89",
      "alt": "Powerbank magnétique blanche vue de face et de profil",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          736,
          736
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-dae3a4ec84",
      "alt": "Powerbank magnétique à côté d'un smartphone noir",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          736,
          736
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-75de536311",
      "alt": "Powerbank magnétique tenue en main au dos d'un téléphone",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          639
        ],
        [
          960,
          736,
          980
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-5e8ea9d135",
      "alt": "Powerbank magnétique posée sur une table de chevet",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          720
        ],
        [
          960,
          736,
          1104
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-dce68c61c6",
      "alt": "Powerbank magnétique fixée à un iPhone, avec ses boîtes",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          632
        ],
        [
          960,
          960,
          1264
        ],
        [
          1600,
          1080,
          1422
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-ead357db97",
      "alt": "Powerbank magnétique blanche tenue en main devant sa boîte",
      "kind": "photo",
      "sizes": [
        [
          480,
          440,
          550
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-15dda83682",
      "alt": "Pourquoi choisir la powerbank magnétique plutôt qu'une batterie à câble",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          263
        ],
        [
          960,
          960,
          527
        ],
        [
          1600,
          1600,
          878
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-e958ec6359",
      "alt": "Powerbank 10 000 mAh, charge rapide 20 W, fixée à un iPhone",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1024,
          1024
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-61fae40bf1",
      "alt": "Powerbank MagSafe 10 000 mAh compatible iPhone, sans câble",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          599
        ],
        [
          960,
          923,
          1152
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-88a70bf91b",
      "alt": "Conçue pour les iPhone 12 à 15 : batterie 10 000 mAh, charge rapide",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1024,
          1024
        ]
      ]
    },
    {
      "key": "products/powerbank-magnetique-sans-fil-d2243b1087",
      "alt": "Powerbank magnétique tenue en main, avec sa base de recharge",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          262
        ],
        [
          960,
          960,
          524
        ],
        [
          1600,
          1408,
          768
        ]
      ]
    }
  ],
  "lampe-anti-moustiques-mosqitoshot": [
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-5c3cdaf493",
      "alt": "Pourquoi racheter des sprays chaque mois : la lampe se recharge par USB",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-78661ff384",
      "alt": "Une nuit paisible, sans spray ni odeur",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-f06754987f",
      "alt": "Lampe MosqitoShot allumée dans une chambre, le soir",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-779ebd59f8",
      "alt": "Les moustiques entrent, ils ne ressortent plus : lampe allumée",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-af29223380",
      "alt": "Lampe MosqitoShot en voyage, compacte et rechargeable",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-d08ff8384f",
      "alt": "Lampe MosqitoShot près d'une famille endormie",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-622d542e30",
      "alt": "Avant, après : la famille sans spray ni spirale",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-c2af801fe2",
      "alt": "Lampe MosqitoShot sur une table de nuit près d'un bébé",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    },
    {
      "key": "products/lampe-anti-moustiques-mosqitoshot-26e0422793",
      "alt": "Lampe MosqitoShot silencieuse sur un bureau",
      "kind": "creative",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          960,
          960
        ],
        [
          1600,
          1254,
          1254
        ]
      ]
    }
  ],
  "biodance-pore-tightening-collagen-ampoule": [
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-aeb75b7f7e",
      "alt": "Flacons de l'ampoule Biodance Pore Tightening Collagen",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          800,
          800
        ]
      ]
    },
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-2de834b044",
      "alt": "Flacon Biodance avec sa pipette",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          800,
          800
        ]
      ]
    },
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-241f28223a",
      "alt": "Flacon Biodance Pore Tightening Collagen Ampoule de face",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          800,
          800
        ]
      ]
    },
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-7a68082860",
      "alt": "Application de l'ampoule Biodance sur le visage",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          800,
          800
        ]
      ]
    },
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-e01c901b78",
      "alt": "Ingrédients mis en avant de l'ampoule Biodance",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          672
        ],
        [
          960,
          736,
          1030
        ]
      ]
    },
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-9ff9ce6863",
      "alt": "Pipette de l'ampoule Biodance tenue au-dessus du flacon",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          800,
          800
        ]
      ]
    },
    {
      "key": "products/biodance-pore-tightening-collagen-ampoule-542931881b",
      "alt": "Flacon Biodance devant ses boîtes",
      "kind": "photo",
      "sizes": [
        [
          480,
          480,
          480
        ],
        [
          960,
          800,
          800
        ]
      ]
    }
  ]
};

const energySections = [
  { id: "s1", type: "hero", enabled: true, eyebrow: "Nouveau · Powerbank magnétique", title: "L'énergie qui suit votre journée", text: "Des accessoires utiles, choisis pour le Cameroun. Vous payez à la livraison, après avoir vu votre colis.", ctaLabel: "Voir la boutique", ctaHref: "/shop", secondaryLabel: "Nos conseils", secondaryHref: "/blog", productSlug: "powerbank-magnetique-sans-fil" },
  { id: "s2", type: "trust", enabled: true, items: ["Paiement à la livraison", "Livré en 1 h à 1 h 30 à Douala et Yaoundé", "Échange sous 7 jours si défaut"] },
  { id: "s3", type: "categories", enabled: true, title: "Nos univers" },
  { id: "s4", type: "products", enabled: true, title: "Tout ce qu'il vous faut", tabs: true, limit: 8 },
  { id: "s5", type: "banner", enabled: true, title: "Commandez aujourd'hui, payez à la réception.", text: "Nous vous appelons pour confirmer, le livreur vous contacte avant de passer. Vous vérifiez, puis vous payez.", ctaLabel: "Comment ça marche", ctaHref: "/livraison" },
  { id: "s6", type: "posts", enabled: true, title: "Conseils et guides" },
  { id: "s7", type: "newsletter", enabled: true, title: "Les nouveautés en premier", text: "Laissez votre numéro WhatsApp : un message par mois au plus, désinscription à tout moment." },
];

/** Boutique Energy Plus : identité, thème et sections de l'accueil (source de l'import en base). */
export const STORE = {
    id: "st_energyplus",
    slug: "energyplus",
    name: "Energy Plus",
    tagline: "L'énergie qui suit votre journée",
    status: "active",
    logo: "/stores/energyplus/logo.png",
    favicon: "/stores/energyplus/favicon.png",
    heroImage: "/stores/energyplus/hero.webp",
    theme: { colors: { ink: "#121211", bg: "#ffffff", accent: "#d6ad45", accentDeep: "#8a6a1f", accentSoft: "#f1d27c", night: "#0c0c0c", onNight: "#f5f3ee" }, headingFont: "serif" },
    sections: energySections,
    contact: { phone: "", whatsapp: "", email: "", hours: "Du lundi au samedi, 8 h – 19 h" },
    social: { facebook: "", instagram: "", tiktok: "" },
    tracking: { metaPixelIds: [], tiktokPixelId: "", ga4Id: "", googleAdsId: "", gtmId: "" },
    currency: "XAF",
    createdAt: "2026-11-14T03:35:00Z",
  };
