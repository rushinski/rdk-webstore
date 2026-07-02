export type ExistingAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

export type HomeOfficeFormData = {
  stateCode: string;
  businessName: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
};

export type OldHomeOfficeAction = {
  hasPhysicalNexus: boolean;
  continueCollecting: boolean;
};
