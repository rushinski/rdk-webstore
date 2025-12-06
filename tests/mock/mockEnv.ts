module.exports = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test",
    SUPABASE_SECRET_KEY: "test",
    SUPABASE_DB_URL: "postgresql://test",
    SUPABASE_JWT_SECRET: "jwtsecret",
    STRIPE_SECRET_KEY: "test",
    STRIPE_WEBHOOK_SECRET: "testwh",
    UPSTASH_REDIS_REST_URL: "http://upstash",
    UPSTASH_REDIS_REST_TOKEN: "test",
    SENTRY_DSN: "dsn",
    POSTHOG_API_KEY: "ph",
  },
};
