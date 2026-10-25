// The documents Uyir's medical content and numbers come from. Every statement in the app
// carries a Cite, which the UI shows as "Source: …". Page numbers are the document's own.

export type SourceId =
  | 'nrcp2019'
  | 'nrcpWound'
  | 'nrcpFaq'
  | 'nrcpClinics'
  | 'nrcpNote'
  | 'tnSapre'
  | 'napre'
  | 'snake2017'
  | 'icmr2025'
  | 'debnath2025'
  | 'khandwa'
  | 'suraweera2020'
  | 'bites2024';

export interface Source {
  title: string;
  /** How the app names it on screen. */
  short: string;
  publisher: string;
  year: number;
  url: string;
}

export interface Cite {
  source: SourceId;
  /** Section number or name in the document, as printed. */
  section?: string;
  page?: number;
}

export const SOURCES: Record<SourceId, Source> = {
  nrcp2019: {
    title: 'National Guidelines for Rabies Prophylaxis',
    short: 'National Guidelines for Rabies Prophylaxis, 2019',
    publisher: 'National Rabies Control Programme, NCDC, Ministry of Health and Family Welfare',
    year: 2019,
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/171214085536.pdf',
  },
  nrcpWound: {
    title: 'Rabies Post Exposure Prophylaxis: Wound Management Guidelines',
    short: 'NRCP wound management guidelines',
    publisher: 'National Rabies Control Programme, NCDC, Ministry of Health and Family Welfare',
    year: 2023,
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/169391055721.pdf',
  },
  nrcpFaq: {
    title: 'Frequently Asked Questions',
    short: 'National Rabies Control Programme FAQ',
    publisher: 'National Rabies Control Programme (rabiesfreeindia.mohfw.gov.in)',
    year: 2026,
    url: 'https://rabiesfreeindia.mohfw.gov.in/faq',
  },
  nrcpClinics: {
    title: 'List of Anti Rabies Clinic under NRCP (updated 26 March 2026)',
    short: 'NRCP list of anti-rabies clinics, March 2026',
    publisher: 'National Rabies Control Programme, NCDC, Ministry of Health and Family Welfare',
    year: 2026,
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/177452428483.pdf',
  },
  nrcpNote: {
    title: 'Advisory/guidance note for preventing shortage of rabies vaccine, human and anti rabies serum (re-issued June 2026)',
    short: 'NCDC advisory note on rabies vaccine supply, June 2026',
    publisher: 'Centre for One Health, NCDC, Ministry of Health and Family Welfare',
    year: 2026,
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/178480497866.pdf',
  },
  tnSapre: {
    title: 'State Action Plan for Dog Mediated Rabies Elimination from Tamil Nadu by 2030',
    short: 'Tamil Nadu State Action Plan for Rabies Elimination',
    publisher: 'Directorate of Public Health and Preventive Medicine, Government of Tamil Nadu',
    year: 2025,
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/174419151310.pdf',
  },
  napre: {
    title: 'National Action Plan for Dog Mediated Rabies Elimination from India by 2030',
    short: 'National Action Plan for Rabies Elimination, 2021',
    publisher: 'Ministry of Health and Family Welfare and Ministry of Fisheries, Animal Husbandry and Dairying',
    year: 2021,
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/169391359514.pdf',
  },
  snake2017: {
    title: 'Standard Treatment Guidelines: Management of Snake Bite',
    short: 'MoHFW snakebite treatment guidelines, 2017',
    publisher: 'Ministry of Health and Family Welfare, Government of India',
    year: 2017,
    url: 'https://ncdc.mohfw.gov.in/uploads/pdf/Standard-Treatment-Guidelines-for-Management-of-Snake-Bite.pdf',
  },
  icmr2025: {
    title:
      'Estimates of the burden of human rabies deaths and animal bites in India, 2022–23: a community-based cross-sectional survey and probability decision-tree modelling study',
    short: 'ICMR–NIE study, Lancet Infectious Diseases, 2025',
    publisher: 'ICMR–National Institute of Epidemiology, The Lancet Infectious Diseases',
    year: 2025,
    url: 'https://doi.org/10.1016/S1473-3099(24)00490-0',
  },
  debnath2025: {
    title: 'Compliance of post-exposure prophylaxis (PEP) following animal bite in Indian population: a systematic review and meta-analysis',
    short: 'Debnath et al., J Family Med Prim Care, 2025',
    publisher: 'Journal of Family Medicine and Primary Care',
    year: 2025,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12488117/',
  },
  khandwa: {
    title: 'Compliance towards post-exposure prophylaxis of rabies vaccination among animal bite patients at a tertiary care hospital in Khandwa, Madhya Pradesh',
    short: 'Khandwa PEP compliance study, 2025',
    publisher: 'PubMed Central',
    year: 2025,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13545943/',
  },
  suraweera2020: {
    title: 'Trends in snakebite deaths in India from 2000 to 2019 in a nationally representative mortality study',
    short: 'Suraweera et al., eLife, 2020',
    publisher: 'eLife 9:e54076',
    year: 2020,
    url: 'https://elifesciences.org/articles/54076',
  },
  bites2024: {
    title: 'SC takes suo motu note of fatal stray dog attacks (2024 dog bite and rabies death figures, Ministry of Fisheries, Animal Husbandry and Dairying data)',
    short: 'The Tribune, ministry figures for 2024',
    publisher: 'The Tribune',
    year: 2025,
    url: 'https://www.tribuneindia.com/news/delhi/sc-takes-suo-motu-note-of-fatal-stray-dog-attacks',
  },
};
