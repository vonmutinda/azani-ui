export const siteConfig = {
  contact: {
    phone: process.env.NEXT_PUBLIC_AZANI_PHONE || "",
    phoneDisplay:
      process.env.NEXT_PUBLIC_AZANI_PHONE_DISPLAY || process.env.NEXT_PUBLIC_AZANI_PHONE || "",
    email: process.env.NEXT_PUBLIC_AZANI_EMAIL || "hello@azani.shop",
    location: "Nairobi, Kenya",
    hours: process.env.NEXT_PUBLIC_AZANI_SUPPORT_HOURS?.trim() || "",
  },
  social: {
    instagram: process.env.NEXT_PUBLIC_AZANI_INSTAGRAM_URL || "https://instagram.com/azani",
    facebook: process.env.NEXT_PUBLIC_AZANI_FACEBOOK_URL || "https://facebook.com/azani",
    tiktok: process.env.NEXT_PUBLIC_AZANI_TIKTOK_URL || "https://tiktok.com/@azani",
  },
  whatsapp: {
    // wa.me requires digits only, no leading '+'
    number: (process.env.NEXT_PUBLIC_AZANI_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
    prefillMessage: "Hi Azani, I'd like to ask about...",
  },
  shipping: {
    // Single source of truth for the free-delivery threshold (KES). Reused by the
    // header trust bar, home, cart progress bar and checkout so they never disagree.
    freeShippingThreshold: 5000,
  },
} as const;
