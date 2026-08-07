import { NextResponse } from "next/server";
import { normalizeAppState, type AppState } from "@/lib/app-state";
import { loadAppState, saveAppState, storeMode } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const loaded = await loadAppState();
    return NextResponse.json({
      state: loaded.state,
      sha: loaded.sha,
      backend: loaded.backend,
      mode: storeMode(),
    });
  } catch (err) {
    console.error("[api/state] GET failed:", err);
    // Do NOT return empty state on failure — clients treat that as real data
    // and wipe the tier list / history from the UI and local cache.
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load state",
        mode: storeMode(),
      },
      { status: 503 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      state?: unknown;
      sha?: string | null;
    };

    if (!body.state) {
      return NextResponse.json(
        { error: "Missing state payload" },
        { status: 400 }
      );
    }

    const state: AppState = normalizeAppState(body.state);
    const sha =
      typeof body.sha === "string" && body.sha.length > 0 ? body.sha : null;

    const saved = await saveAppState(state, sha);
    return NextResponse.json({
      state: saved.state,
      sha: saved.sha,
      backend: saved.backend,
      mode: storeMode(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save state";
    if (message === "STATE_CONFLICT") {
      try {
        const latest = await loadAppState();
        return NextResponse.json(
          {
            error: "conflict",
            state: latest.state,
            sha: latest.sha,
            backend: latest.backend,
          },
          { status: 409 }
        );
      } catch {
        return NextResponse.json({ error: "conflict" }, { status: 409 });
      }
    }

    console.error("[api/state] PUT failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
