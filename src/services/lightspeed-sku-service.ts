export class LightspeedSkuService {
  buildSku(input: {
    conditionCode: string;
    brandCode: string;
    modelCode: string;
    sizeCode: string;
    sequence: number;
  }) {
    const sequence = String(input.sequence).padStart(2, "0");
    return `${input.conditionCode}-${input.brandCode}-${input.modelCode}-${input.sizeCode}-${sequence}`;
  }
}
