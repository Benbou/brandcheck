export interface NameSuggestion {
  name: string;
  justification: string;
  technique: string;
}

export interface DomainAvailability {
  domain: string;
  available: boolean;
}

export interface CompanyMatch {
  name: string;
  siren: string;
  activity: string;
}

export interface LinguisticResult {
  name: string;
  length: number;
  isShort: boolean;
  vowelConsonantRatio: number;
  issues: string[];
}

export interface NameScore {
  name: string;
  score: number;
  breakdown: {
    domainCom: number;
    domainFr: number;
    domainIo: number;
    noCompanyConflict: number;
    noLinguisticIssue: number;
    shortName: number;
  };
}
