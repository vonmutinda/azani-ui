export const siteConfig = {
  contact: {
    phone: process.env.NEXT_PUBLIC_AZANI_PHONE ?? "+254700000000",
    phoneDisplay: process.env.NEXT_PUBLIC_AZANI_PHONE_DISPLAY ?? "+254 700 000 000",
    email: process.env.NEXT_PUBLIC_AZANI_EMAIL ?? "hello@azani.shop",
    location: "Nairobi, Kenya",
  },
  social: {
    instagram: process.env.NEXT_PUBLIC_AZANI_INSTAGRAM_URL ?? "https://instagram.com/azani",
    facebook: process.env.NEXT_PUBLIC_AZANI_FACEBOOK_URL ?? "https://facebook.com/azani",
    tiktok: process.env.NEXT_PUBLIC_AZANI_TIKTOK_URL ?? "https://tiktok.com/@azani",
  },
  whatsapp: {
    // wa.me requires digits only, no leading '+'
    number: (process.env.NEXT_PUBLIC_AZANI_WHATSAPP_NUMBER ?? "254700000000").replace(/\D/g, ""),
    prefillMessage: "Hi Azani, I'd like to ask about...",
  },
} as const;
