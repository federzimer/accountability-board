// Canonical Business Readiness checklist.
// Edit this list to add / remove / reorder items — completion state is stored
// per-member in the `readiness_items` table keyed by `item.key`, so renaming a
// `key` resets that item (changing `label` is free).

export type ReadinessItem = {
  key: string;
  label: string;
  hint?: string;
};

export type ReadinessCategory = {
  title: string;
  emoji: string;
  items: ReadinessItem[];
};

export const READINESS: ReadinessCategory[] = [
  {
    title: "Legal & Formation",
    emoji: "⚖️",
    items: [
      { key: "entity", label: "LLC / entity formed", hint: "Filed with the state" },
      { key: "ein", label: "EIN (Federal Tax ID)", hint: "Free from the IRS" },
      { key: "operating_agreement", label: "Operating agreement" },
      { key: "registered_agent", label: "Registered agent" },
      { key: "licenses", label: "Business licenses & permits", hint: "State / city / STR permits" },
    ],
  },
  {
    title: "Finance",
    emoji: "💰",
    items: [
      { key: "bank_account", label: "Business bank account" },
      { key: "business_card", label: "Business debit / credit card" },
      { key: "bookkeeping", label: "Bookkeeping / accounting", hint: "QuickBooks, Xero, etc." },
      { key: "payment_processing", label: "Payment processing", hint: "Stripe / Square" },
      { key: "finances_separated", label: "Personal & business finances separated" },
    ],
  },
  {
    title: "Brand & Online",
    emoji: "🌐",
    items: [
      { key: "domain", label: "Domain registered" },
      { key: "website", label: "Website / landing page live" },
      { key: "business_email", label: "Business email", hint: "you@yourdomain.com" },
      { key: "branding", label: "Logo & brand identity" },
      { key: "social_handles", label: "Social media handles claimed" },
    ],
  },
  {
    title: "Operations",
    emoji: "⚙️",
    items: [
      { key: "phone", label: "Business phone number" },
      { key: "insurance", label: "Business insurance", hint: "General / liability" },
      { key: "contracts", label: "Contract & agreement templates" },
      { key: "crm", label: "CRM / client management system" },
    ],
  },
];

export const READINESS_ITEMS = READINESS.flatMap((c) => c.items);
export const READINESS_TOTAL = READINESS_ITEMS.length;
