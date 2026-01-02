# Square inventory import (checkpointed flow)

This is a guided walkthrough for the Square → Supabase import script that lives at `scripts/import-square-inventory.ts`. It keeps Jacob’s new constraints in mind (bucket-hosted images, category/size normalization, used-item variant rule) and is structured around the script’s checkpoints.

## Prereqs
- Node + npm
- Supabase CLI installed (`npm install -g supabase`) and logged in (if you want to hit a real project).
- Env vars populated (use `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- Images already uploaded to your Supabase bucket. The import file should include a column like `SupabaseImagePath` that points at the bucket object (e.g., `bucket/sku123/main.jpg`). Provide the bucket base URL as the optional 4th arg.

## What the script enforces now
- **Image paths**: Assumes pre-uploaded bucket paths; no Square downloads. Column: `SupabaseImagePath` (falls back to `ImageFilename`).
- **Categories**: Maps/guesses into `sneakers | clothing | accessories | electronics` (placeholder until Jacob’s parser is wired).
- **Sizes**: Uses `src/config/constants/sizes` to pick `size_type` (`shoe`/`clothing`/`custom`). Size tokens are stripped from `title_raw` before sending to ProductService.
- **Variants**: Multiple new items with the same SKU collapse into variants. Used items with multiple rows are split into separate products (one per size) so used products never carry multiple variants.

## Run commands
```bash
# dry-run with checkpoints (uses ts-node)
ts-node scripts/import-square-inventory.ts \
  ./square-export.csv \
  <TENANT_ID> \
  <ADMIN_USER_ID> \
  https://<SUPABASE_PROJECT>.supabase.co/storage/v1/object/public/<BUCKET>/
```

## Checkpoints to watch
1) **File/extension**: Script stops early if the file is missing or not csv/xlsx.  
2) **Rows loaded**: Logs raw row count after CSV/XLSX parse.  
3) **SKUs grouped**: Logs distinct SKU count.  
4) **Supabase health**: Simple select on `products` to confirm credentials.  
5) **Payload preview**: Logs variants/images count per SKU (after used-item splitting).  
6) **Upsert**: Uses `ProductService` create/update (SKU override is TODO—uncomment once added to the service/repo).

## Columns the script expects (align your Square export)
- `SKU`, `Name`, `Brand`, `Model`, `Category`, `Condition`, `Price`, `Cost`, `Quantity`, `Size`, `ImageFilename`, `SupabaseImagePath`
- Adjust `normalizeSquareRow` if your column names differ.

## Testing
- Unit helpers: `tests/unit/scripts/import-square-inventory.test.ts` (mocks fs/XLSX; no Supabase).  
  Run: `npx jest --runTestsByPath tests/unit/scripts/import-square-inventory.test.ts`  
  Note: In this environment Jest expects `ts-node` for its TS config; install it or run via the project’s CI setup.

## Next steps / TODOs
- Wire Jacob’s auto-tagging + category parser and replace the placeholder `deriveCategory`.
- Add SKU override support inside `ProductService`/repository and uncomment the `sku` field in the payload.
- Point `resolveImages` at the actual bucket base URL you use in Supabase.
