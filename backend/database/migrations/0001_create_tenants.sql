-- +goose Up
CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    phone TEXT UNIQUE,
    instagram TEXT UNIQUE,
    stripe_connect_id TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    opens_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE tenants;