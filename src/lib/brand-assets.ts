export type AzaniLogoVariantId = "blue" | "cream" | "gold" | "rose" | "sage" | "terracotta";

type AzaniLogoVariant = {
  id: AzaniLogoVariantId;
  displayName: string;
  usage: string;
  logo: {
    inline2x: string;
    inline4x: string;
    width: 1108;
    height: 384;
  };
  mark: {
    svg: string;
    width: 260;
    height: 200;
  };
};

const inlineLogoBase = "/brand/azani/logo/inline";
const markBase = "/brand/azani/mark";

function createLogoVariant(
  id: AzaniLogoVariantId,
  displayName: string,
  usage: string,
): AzaniLogoVariant {
  return {
    id,
    displayName,
    usage,
    logo: {
      inline2x: `${inlineLogoBase}/azani-logo-pram-inline-${id}@2x.png`,
      inline4x: `${inlineLogoBase}/azani-logo-pram-inline-${id}@4x.png`,
      width: 1108,
      height: 384,
    },
    mark: {
      svg: `${markBase}/azani-mark-pram-${id}.svg`,
      width: 260,
      height: 200,
    },
  };
}

export const AZANI_LOGO_VARIANTS = {
  blue: createLogoVariant("blue", "Blue", "Trust and secondary surfaces"),
  cream: createLogoVariant("cream", "Cream", "Dark or photographic surfaces"),
  gold: createLogoVariant("gold", "Gold", "Warm campaign moments"),
  rose: createLogoVariant("rose", "Rose", "Default storefront identity"),
  sage: createLogoVariant("sage", "Sage", "Soft neutral surfaces"),
  terracotta: createLogoVariant("terracotta", "Terracotta", "Warm promo surfaces"),
} satisfies Record<AzaniLogoVariantId, AzaniLogoVariant>;

export const AZANI_DEFAULT_LOGO = AZANI_LOGO_VARIANTS.rose;
