// These capabilities describe implemented server adapters, not provider marketing support.
export const PUBLISHING_CAPABILITIES = {
  facebook: { available: true, placements: { feed: ['image'] }, maxMediaItems: 1, maxPlacements: 1, altText: false },
  instagram: { available: true, placements: { feed: ['image', 'video'], story: ['image', 'video'], reels_shorts: ['video'] }, maxMediaItems: 1, maxPlacements: 1, altText: false },
  linkedin: { available: false, reason: 'LinkedIn publishing adapter is not configured.' },
  x: { available: false, reason: 'X publishing adapter is not configured.' },
  youtube: { available: false, reason: 'YouTube publishing adapter is not configured.' },
  whatsapp: { available: false, reason: 'WhatsApp publishing adapter is not configured.' },
} as const;
