import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, ExternalLink, Percent, Leaf, Tag, Star, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

interface Product {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  image: string;
  url: string;
  tags: string[];
}

interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  category: string;
  website: string;
  certifications: string[];
  products: Product[];
}

const ecoBrands: Brand[] = [
  {
    id: "patagonia",
    name: "Patagonia",
    logo: "🏔️",
    description: "Abbigliamento outdoor sostenibile. Usa materiali riciclati e dona l'1% del fatturato a cause ambientali.",
    category: "Abbigliamento",
    website: "https://www.patagonia.com",
    certifications: ["B Corp", "Fair Trade", "1% for the Planet"],
    products: [
      { id: "p1", name: "Better Sweater® Jacket", originalPrice: 139, discountedPrice: 97, discountPercent: 30, image: "🧥", url: "https://www.patagonia.com", tags: ["Pile riciclato", "Fair Trade"] },
      { id: "p2", name: "Nano Puff® Vest", originalPrice: 189, discountedPrice: 132, discountPercent: 30, image: "🦺", url: "https://www.patagonia.com", tags: ["Isolamento riciclato"] },
      { id: "p3", name: "Capilene® Cool T-Shirt", originalPrice: 45, discountedPrice: 31, discountPercent: 31, image: "👕", url: "https://www.patagonia.com", tags: ["Poliestere riciclato"] },
    ],
  },
  {
    id: "ecoalf",
    name: "ECOALF",
    logo: "♻️",
    description: "Moda 100% sostenibile spagnola. Trasforma rifiuti oceanici e plastica in capi di alta qualità.",
    category: "Abbigliamento",
    website: "https://ecoalf.com",
    certifications: ["B Corp", "OEKO-TEX"],
    products: [
      { id: "e1", name: "Zaino Osaka", originalPrice: 89, discountedPrice: 62, discountPercent: 30, image: "🎒", url: "https://ecoalf.com", tags: ["Bottiglie riciclate"] },
      { id: "e2", name: "Sneakers Shao", originalPrice: 120, discountedPrice: 84, discountPercent: 30, image: "👟", url: "https://ecoalf.com", tags: ["Alghe marine", "Reti da pesca"] },
      { id: "e3", name: "Parka Antartica", originalPrice: 299, discountedPrice: 209, discountPercent: 30, image: "🧥", url: "https://ecoalf.com", tags: ["PET riciclato", "Imbottitura eco"] },
    ],
  },
  {
    id: "ecobio",
    name: "EcoBio Bottega",
    logo: "🌿",
    description: "E-commerce italiano di prodotti biologici e naturali per la cura della persona e della casa.",
    category: "Cura persona",
    website: "https://www.ecobiobottega.it",
    certifications: ["ICEA", "Vegan OK"],
    products: [
      { id: "eb1", name: "Shampoo Solido Lavanda", originalPrice: 12, discountedPrice: 8.40, discountPercent: 30, image: "🧴", url: "https://www.ecobiobottega.it", tags: ["Zero plastica", "Bio"] },
      { id: "eb2", name: "Deodorante Naturale", originalPrice: 9.90, discountedPrice: 6.90, discountPercent: 30, image: "💐", url: "https://www.ecobiobottega.it", tags: ["Alluminio free", "Vegan"] },
      { id: "eb3", name: "Crema Viso Antiage", originalPrice: 28, discountedPrice: 19.60, discountPercent: 30, image: "✨", url: "https://www.ecobiobottega.it", tags: ["Acido ialuronico bio"] },
    ],
  },
  {
    id: "tentree",
    name: "tentree",
    logo: "🌳",
    description: "Per ogni articolo acquistato vengono piantati 10 alberi. Abbigliamento in cotone organico e Tencel™.",
    category: "Abbigliamento",
    website: "https://www.tentree.com",
    certifications: ["B Corp", "Climate Neutral"],
    products: [
      { id: "t1", name: "Classic T-Shirt Organica", originalPrice: 42, discountedPrice: 29, discountPercent: 31, image: "👕", url: "https://www.tentree.com", tags: ["Cotone organico", "10 alberi"] },
      { id: "t2", name: "French Terry Hoodie", originalPrice: 88, discountedPrice: 61, discountPercent: 30, image: "🧶", url: "https://www.tentree.com", tags: ["Tencel™", "10 alberi"] },
    ],
  },
  {
    id: "bambu",
    name: "Bambaw",
    logo: "🎋",
    description: "Prodotti zero-waste in bambù e acciaio inox. Alternative riutilizzabili per la vita quotidiana.",
    category: "Zero Waste",
    website: "https://www.bambaw.com",
    certifications: ["FSC", "Plastic Free"],
    products: [
      { id: "bw1", name: "Kit Cannucce Riutilizzabili", originalPrice: 14.90, discountedPrice: 9.90, discountPercent: 34, image: "🥤", url: "https://www.bambaw.com", tags: ["Acciaio inox", "Zero waste"] },
      { id: "bw2", name: "Rasoio di Sicurezza", originalPrice: 29.90, discountedPrice: 22.90, discountPercent: 23, image: "🪒", url: "https://www.bambaw.com", tags: ["Acciaio", "Durata vita"] },
      { id: "bw3", name: "Spazzolino in Bambù (4pz)", originalPrice: 9.90, discountedPrice: 6.90, discountPercent: 30, image: "🪥", url: "https://www.bambaw.com", tags: ["Bambù FSC", "Compostabile"] },
      { id: "bw4", name: "Lunch Box Inox", originalPrice: 34.90, discountedPrice: 24.90, discountPercent: 29, image: "🍱", url: "https://www.bambaw.com", tags: ["Acciaio inox", "No plastica"] },
    ],
  },
  {
    id: "officina",
    name: "Officina Naturae",
    logo: "🧪",
    description: "Detergenza ecologica e cosmesi naturale italiana. Formulazioni biodegradabili al 100%.",
    category: "Casa & Pulizia",
    website: "https://www.officinanaturae.com",
    certifications: ["ICEA", "Vegan", "Cruelty Free"],
    products: [
      { id: "on1", name: "Detersivo Piatti Concentrato", originalPrice: 6.50, discountedPrice: 4.50, discountPercent: 31, image: "🫧", url: "https://www.officinanaturae.com", tags: ["100% biodegradabile"] },
      { id: "on2", name: "Bucato Ecologico 3L", originalPrice: 15.90, discountedPrice: 11.10, discountPercent: 30, image: "👚", url: "https://www.officinanaturae.com", tags: ["Dermocompatibile", "Bio"] },
      { id: "on3", name: "Sapone di Marsiglia 300g", originalPrice: 5.90, discountedPrice: 3.90, discountPercent: 34, image: "🧼", url: "https://www.officinanaturae.com", tags: ["Vegetale", "Tradizionale"] },
    ],
  },
];

const categories = ["Tutti", ...new Set(ecoBrands.map((b) => b.category))];

export default function EcoShop() {
  const [selectedCategory, setSelectedCategory] = useState("Tutti");

  const filtered = selectedCategory === "Tutti"
    ? ecoBrands
    : ecoBrands.filter((b) => b.category === selectedCategory);

  const totalProducts = ecoBrands.reduce((sum, b) => sum + b.products.length, 0);
  const avgDiscount = Math.round(
    ecoBrands.flatMap((b) => b.products).reduce((sum, p) => sum + p.discountPercent, 0) / totalProducts
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">🛍️ EcoShop</h1>
        <p className="text-muted-foreground mt-1">Brand ecosostenibili con articoli in sconto — acquista consapevole</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: ShoppingBag, value: ecoBrands.length, label: "Brand eco" },
            { icon: Tag, value: totalProducts, label: "Prodotti in sconto" },
            { icon: Percent, value: `~${avgDiscount}%`, label: "Sconto medio" },
          ].map((s) => (
            <Card key={s.label} className="text-center">
              <CardContent className="p-4">
                <s.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* Category filter */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Brand sections */}
      {filtered.map((brand, bi) => (
        <motion.div
          key={brand.id}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={bi + 3}
        >
          <Card className="overflow-hidden">
            {/* Brand header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-card border border-border flex items-center justify-center text-3xl shadow-sm shrink-0">
                  {brand.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-foreground">{brand.name}</h2>
                    <Badge variant="secondary" className="text-[10px]">{brand.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{brand.description}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {brand.certifications.map((cert) => (
                      <span key={cert} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 shrink-0 text-xs"
                  onClick={() => window.open(brand.website, "_blank")}
                >
                  <ExternalLink className="w-3 h-3" /> Sito
                </Button>
              </div>
            </div>

            {/* Products grid */}
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {brand.products.map((product) => (
                  <div
                    key={product.id}
                    className="group relative p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => window.open(product.url, "_blank")}
                  >
                    {/* Discount badge */}
                    <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      -{product.discountPercent}%
                    </div>

                    <div className="text-center mb-3">
                      <span className="text-4xl">{product.image}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground leading-tight">{product.name}</h3>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {product.tags.map((tag) => (
                        <span key={tag} className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Prices */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-lg font-bold text-primary">€{product.discountedPrice.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground line-through">€{product.originalPrice.toFixed(2)}</span>
                    </div>

                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      <span>Vai al sito</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Footer tip */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={filtered.length + 3}>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Perché comprare eco?</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Ogni acquisto consapevole riduce la tua impronta ecologica. I brand certificati B Corp, Fair Trade e ICEA garantiscono 
                rispetto per l'ambiente, i lavoratori e la tua salute. Scegli prodotti con materiali riciclati, biologici o zero-waste per fare la differenza.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
