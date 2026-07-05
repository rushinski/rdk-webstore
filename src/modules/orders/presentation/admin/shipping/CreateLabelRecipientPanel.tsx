import type {
  AddressErrors,
  AddressValidationStatus,
  ParcelDraft,
  ShippingAddressDraft,
} from "@/modules/orders/presentation/admin/shipping/createLabelFormTypes";
import { CreateLabelAddressFields } from "@/modules/orders/presentation/admin/shipping/CreateLabelAddressFields";
import { CreateLabelOriginSummary } from "@/modules/orders/presentation/admin/shipping/CreateLabelOriginSummary";
import { CreateLabelPackageFields } from "@/modules/orders/presentation/admin/shipping/CreateLabelPackageFields";
import { CreateLabelRateRequestPanel } from "@/modules/orders/presentation/admin/shipping/CreateLabelRateRequestPanel";

type CreateLabelRecipientPanelProps = {
  addressErrors: AddressErrors;
  error: string | null;
  getRates: () => Promise<void>;
  handleParcelInput: (field: keyof ParcelDraft, value: string) => void;
  hasAddressErrors: boolean;
  heightInput: string;
  isGettingRates: boolean;
  lengthInput: string;
  originLine?: string | null;
  recipient: ShippingAddressDraft;
  setRecipientField: (field: keyof ShippingAddressDraft, value: string) => void;
  success: string | null;
  validationStatus: AddressValidationStatus;
  weightInput: string;
  widthInput: string;
};

export function CreateLabelRecipientPanel({
  addressErrors,
  error,
  getRates,
  handleParcelInput,
  hasAddressErrors,
  heightInput,
  isGettingRates,
  lengthInput,
  originLine,
  recipient,
  setRecipientField,
  success,
  validationStatus,
  weightInput,
  widthInput,
}: CreateLabelRecipientPanelProps) {
  return (
    <div className="space-y-6 border-b border-brand-border p-5 lg:border-b-0 lg:border-r">
      <CreateLabelOriginSummary originLine={originLine} />
      <CreateLabelAddressFields
        addressErrors={addressErrors}
        hasAddressErrors={hasAddressErrors}
        recipient={recipient}
        setRecipientField={setRecipientField}
        validationStatus={validationStatus}
      />
      <CreateLabelPackageFields
        handleParcelInput={handleParcelInput}
        heightInput={heightInput}
        lengthInput={lengthInput}
        weightInput={weightInput}
        widthInput={widthInput}
      />
      <CreateLabelRateRequestPanel
        error={error}
        getRates={getRates}
        hasAddressErrors={hasAddressErrors}
        isGettingRates={isGettingRates}
        success={success}
      />
    </div>
  );
}
