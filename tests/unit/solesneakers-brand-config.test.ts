import { brandTheme } from "@/config/brand/solesneakers";

describe("brandTheme", () => {
  it("exposes the approved solesneakers tokens", () => {
    expect(brandTheme.name).toBe("solesneakers");
    expect(brandTheme.colors.page).toBe("#EFEFEF");
    expect(brandTheme.colors.text).toBe("#111111");
    expect(brandTheme.colors.sale).toBe("#CC0000");
    expect(brandTheme.logo.alt).toBe("solesneakers");
    expect(brandTheme.contact.instagramHandle).toBe("null@gmail.com");
  });
});
