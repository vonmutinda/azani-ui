import { siteConfig } from "@/lib/site-config";

export type StoreInfoPageSection = {
  title: string;
  body?: string;
  items?: string[];
};

export type StoreInfoQuickFact = {
  label: string;
  value: string;
};

export type StoreInfoContactMethod = {
  label: string;
  value: string;
  href: string;
  description: string;
};

export type StoreInfoPageContent = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  quickFacts: StoreInfoQuickFact[];
  sections: StoreInfoPageSection[];
  contactMethods?: StoreInfoContactMethod[];
};

const LAST_UPDATED = "May 24, 2026";
const whatsappHref = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(
  siteConfig.whatsapp.prefillMessage,
)}`;

export const policyPages = {
  shipping: {
    href: "/policies/shipping",
    eyebrow: "Delivery",
    title: "Shipping Policy",
    description:
      "How Azani handles delivery timing, shipping fees, order processing, and delivery support.",
    updatedAt: LAST_UPDATED,
    quickFacts: [
      { label: "Coverage", value: "Nairobi and delivery across Kenya" },
      { label: "Free delivery", value: "Orders over KSh5,000" },
      { label: "Fast option", value: "Same-day express where available" },
    ],
    sections: [
      {
        title: "Where we deliver",
        body: "Azani serves shoppers in Nairobi and delivery across Kenya through local courier partners. Exact delivery options and fees are confirmed during checkout based on your address and order.",
      },
      {
        title: "Delivery timelines",
        items: [
          "Nairobi standard delivery is usually completed within 24 hours after payment confirmation.",
          "Same-day express delivery is available for eligible Nairobi orders placed early enough in the day.",
          "County deliveries depend on courier routes and are usually confirmed after order review.",
        ],
      },
      {
        title: "Fees and free delivery",
        body: "Free delivery is available for orders over KSh5,000. Smaller orders and express deliveries may include a delivery fee, shown at checkout before you pay.",
      },
      {
        title: "Missed deliveries",
        body: "Please provide an accurate phone number and delivery address. If a rider or courier cannot reach you, redelivery may require a new delivery fee.",
      },
    ],
  },
  returns: {
    href: "/policies/returns",
    eyebrow: "After purchase",
    title: "Returns & Exchanges",
    description:
      "Return, exchange, and damaged-item guidance for baby products purchased from Azani.",
    updatedAt: LAST_UPDATED,
    quickFacts: [
      { label: "Return window", value: "3 days after delivery" },
      { label: "Issue window", value: "48 hours for wrong or damaged items" },
      { label: "Condition", value: "Unused and in original packaging" },
    ],
    sections: [
      {
        title: "Eligible returns",
        body: "Azani accepts returns within 3 days of delivery when the item is unused, unopened where relevant, in its original packaging, and accompanied by the order number or receipt.",
      },
      {
        title: "Items we cannot take back",
        body: "For safety and hygiene, opened feeding, bath, diapering, or personal-care items cannot be returned unless they arrived damaged, faulty, or different from what you ordered.",
      },
      {
        title: "Exchanges",
        body: "If you need a different size, color, or product, contact us within the return window. Exchanges depend on stock availability and the condition of the returned item.",
      },
      {
        title: "Wrong or damaged items",
        body: "If an item arrives damaged or incorrect, contact Azani within 48 hours of delivery with your order number and clear photos. We will review the issue and arrange a replacement, refund, or store credit where appropriate.",
      },
    ],
  },
  privacy: {
    href: "/policies/privacy",
    eyebrow: "Data",
    title: "Privacy Policy",
    description:
      "How Azani collects, uses, and protects customer information while serving online orders.",
    updatedAt: LAST_UPDATED,
    quickFacts: [
      { label: "Use", value: "Orders, delivery, and support" },
      { label: "Sharing", value: "Only service providers when needed" },
      { label: "Control", value: "Contact us for account or data help" },
    ],
    sections: [
      {
        title: "Information we collect",
        body: "Azani may collect your name, phone number, email address, delivery address, order details, payment confirmation, and messages you send to our support channels.",
      },
      {
        title: "How we use information",
        body: "We use customer information for order processing, delivery, support, fraud prevention, account access, and service updates you choose to receive.",
      },
      {
        title: "How information is shared",
        body: "We share information only when needed to run the shop, such as with payment processors, delivery partners, technical service providers, or where required by law. We do not sell customer personal information.",
      },
      {
        title: "Your choices",
        body: "You can contact Azani to ask about your customer information, correct account details, or opt out of non-essential marketing messages.",
      },
    ],
  },
  terms: {
    href: "/policies/terms",
    eyebrow: "Store terms",
    title: "Terms of Service",
    description:
      "The basic terms that apply when browsing Azani, creating an account, or placing an order.",
    updatedAt: LAST_UPDATED,
    quickFacts: [
      { label: "Payments", value: "M-Pesa, card, or mobile money" },
      { label: "Orders", value: "Confirmed after payment" },
      { label: "Support", value: "WhatsApp, phone, or email" },
    ],
    sections: [
      {
        title: "Orders and payments",
        body: "Orders are confirmed after payment is received through M-Pesa, card, or supported mobile-money payment. If an item becomes unavailable after payment, Azani will contact you to arrange a replacement, store credit, or refund.",
      },
      {
        title: "Product information",
        body: "We aim to keep product names, photos, prices, stock, and descriptions accurate. Small differences in packaging, color, or supplier presentation can happen, especially for baby essentials sourced from different batches.",
      },
      {
        title: "Delivery and returns",
        body: "Delivery, returns, and exchanges follow the current Azani shipping and returns policies. Please review those pages before completing checkout.",
      },
      {
        title: "Account use",
        body: "You are responsible for keeping your account and login details secure. Azani may refuse or cancel orders connected to abuse, fraud, incorrect delivery information, or activity that could harm customers or the shop.",
      },
    ],
  },
} as const satisfies Record<string, StoreInfoPageContent>;

export const contactPage = {
  href: "/contact",
  eyebrow: "Support",
  title: "Contact Azani",
  description:
    "Need help choosing baby essentials, tracking an order, or checking stock? Reach Azani through the channel that works best for you.",
  updatedAt: LAST_UPDATED,
  quickFacts: [
    { label: "Location", value: siteConfig.contact.location },
    { label: "Response", value: "Order help during shop hours" },
    { label: "Best for urgent help", value: "Phone or WhatsApp" },
  ],
  contactMethods: [
    {
      label: "Call Azani",
      value: siteConfig.contact.phoneDisplay,
      href: `tel:${siteConfig.contact.phone}`,
      description: "Best for urgent delivery, stock, or order questions.",
    },
    {
      label: "Email Azani",
      value: siteConfig.contact.email,
      href: `mailto:${siteConfig.contact.email}`,
      description: "Best for order records, returns, and detailed support requests.",
    },
    {
      label: "WhatsApp Azani",
      value: "Start a WhatsApp chat",
      href: whatsappHref,
      description: "Best for quick product, sizing, and delivery questions.",
    },
  ],
  sections: [
    {
      title: "What we can help with",
      items: [
        "Choosing feeding, diapering, nursery, clothing, toy, and maternity essentials.",
        "Checking stock, size, color, and bundle availability before you order.",
        "Tracking an order or correcting delivery details before dispatch.",
        "Starting a return, exchange, or damaged-item review.",
      ],
    },
    {
      title: "Before contacting us",
      body: "Please keep your order number, phone number, and product name nearby. For damaged or incorrect items, include clear photos so the support team can review the issue faster.",
    },
  ],
} as const satisfies StoreInfoPageContent;

export const allStoreInfoPages = [...Object.values(policyPages), contactPage] as const;
