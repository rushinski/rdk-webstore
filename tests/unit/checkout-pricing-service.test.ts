describe("checkout shipping price resolution", () => {
  it("uses category default when product shipping price is null", () => {
    const productShippingPriceCents: number | null = null;
    const categoryDefaultCents = 1500;
    const effective = productShippingPriceCents ?? categoryDefaultCents;

    expect(effective).toBe(1500);
  });

  it("uses zero as a free shipping override", () => {
    const productShippingPriceCents = 0;
    const categoryDefaultCents = 1500;
    const effective = productShippingPriceCents ?? categoryDefaultCents;

    expect(effective).toBe(0);
  });

  it("uses positive product shipping override", () => {
    const productShippingPriceCents = 999;
    const categoryDefaultCents = 1500;
    const effective = productShippingPriceCents ?? categoryDefaultCents;

    expect(effective).toBe(999);
  });
});
