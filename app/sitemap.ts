// app/sitemap.ts

export default function sitemap() {
  const baseUrl = "https://realdealkickzsc.com";

  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // Catalog root
    {
      url: `${baseUrl}/products`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // Brand index page (stub for now)
    {
      url: `${baseUrl}/brand`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.5,
    },

    // Size index page (stub for now)
    {
      url: `${baseUrl}/size`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
