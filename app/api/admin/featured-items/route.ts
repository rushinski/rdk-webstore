// app/api/admin/featured-items/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminApi, AuthError } from "@/lib/auth/session";
import { FeaturedItemsService } from "@/services/featured-items-service";
import { logError } from "@/lib/utils/log";

export async function GET() {
  try {
    await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const service = new FeaturedItemsService(supabase);
    const items = await service.getFeaturedItems();

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    logError(error, { layer: "api", endpoint: "GET /api/admin/featured-items" });
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch featured items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const service = new FeaturedItemsService(supabase);
    const item = await service.addFeaturedItem({
      productId,
      userId: session.user.id,
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logError(error, { layer: "api", endpoint: "POST /api/admin/featured-items" });
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add featured item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdminApi();
    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    const service = new FeaturedItemsService(supabase);
    await service.removeFeaturedItem(productId, undefined, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, { layer: "api", endpoint: "DELETE /api/admin/featured-items" });
    
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove featured item" },
      { status: 500 }
    );
  }
}