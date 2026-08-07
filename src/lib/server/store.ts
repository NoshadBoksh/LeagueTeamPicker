import { promises as fs } from "fs";
import path from "path";
import {
  emptyAppState,
  normalizeAppState,
  trimStateForPersist,
  type AppState,
} from "@/lib/app-state";

const STATE_PATH =
  process.env.GITHUB_STATE_PATH?.trim() || "data/app-state.json";
/** Keep state off `main` so saves don't trigger Vercel production rebuilds. */
const STATE_BRANCH = process.env.GITHUB_STATE_BRANCH?.trim() || "app-data";
const LOCAL_FILE = path.join(process.cwd(), STATE_PATH);

function githubRepo(): string {
  const explicit = process.env.GITHUB_REPO?.trim();
  if (explicit) return explicit;
  const owner = process.env.VERCEL_GIT_REPO_OWNER?.trim();
  const slug = process.env.VERCEL_GIT_REPO_SLUG?.trim();
  if (owner && slug) return `${owner}/${slug}`;
  return "NoshadBoksh/LeagueTeamPicker";
}

function githubToken(): string | undefined {
  return (
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.GITHUB_STATE_TOKEN?.trim() ||
    undefined
  );
}

export type StoreBackend = "github" | "file";

export interface LoadedState {
  state: AppState;
  sha: string | null;
  backend: StoreBackend;
}

async function readLocalFile(): Promise<AppState> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf8");
    return normalizeAppState(JSON.parse(raw));
  } catch {
    return emptyAppState();
  }
}

async function writeLocalFile(state: AppState): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

interface GitHubContentResponse {
  sha?: string;
  content?: string;
  encoding?: string;
  message?: string;
}

async function githubFetch(
  urlPath: string,
  init?: RequestInit
): Promise<Response> {
  const token = githubToken();
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for shared cloud storage");
  }
  return fetch(`https://api.github.com${urlPath}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function loadFromGitHub(): Promise<LoadedState> {
  const repo = githubRepo();
  const res = await githubFetch(
    `/repos/${repo}/contents/${STATE_PATH}?ref=${encodeURIComponent(STATE_BRANCH)}`
  );

  if (res.status === 404) {
    return { state: emptyAppState(), sha: null, backend: "github" };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GitHubContentResponse;
    throw new Error(
      body.message || `GitHub read failed (${res.status})`
    );
  }

  const body = (await res.json()) as GitHubContentResponse;
  const encoded = body.content?.replace(/\n/g, "") ?? "";
  const json = Buffer.from(encoded, "base64").toString("utf8");
  return {
    state: normalizeAppState(JSON.parse(json)),
    sha: body.sha ?? null,
    backend: "github",
  };
}

async function saveToGitHub(
  state: AppState,
  sha: string | null
): Promise<LoadedState> {
  const repo = githubRepo();
  const trimmed = trimStateForPersist(state);
  const content = Buffer.from(
    `${JSON.stringify(trimmed, null, 2)}\n`,
    "utf8"
  ).toString("base64");

  let currentSha = sha;
  if (!currentSha) {
    try {
      const existing = await loadFromGitHub();
      currentSha = existing.sha;
    } catch {
      currentSha = null;
    }
  }

  const payload: Record<string, string> = {
    message: `chore: sync app state (${new Date().toISOString()})`,
    content,
    branch: STATE_BRANCH,
  };
  if (currentSha) payload.sha = currentSha;

  const res = await githubFetch(`/repos/${repo}/contents/${STATE_PATH}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 409 || res.status === 422) {
    const err = new Error("STATE_CONFLICT");
    (err as Error & { status: number }).status = 409;
    throw err;
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GitHubContentResponse;
    throw new Error(
      body.message || `GitHub write failed (${res.status})`
    );
  }

  const body = (await res.json()) as {
    content?: { sha?: string };
  };

  return {
    state: trimmed,
    sha: body.content?.sha ?? currentSha,
    backend: "github",
  };
}

/** Prefer GitHub when a token is configured so every deploy shares one store. */
export async function loadAppState(): Promise<LoadedState> {
  if (githubToken()) {
    try {
      return await loadFromGitHub();
    } catch (err) {
      // On Vercel/Netlify never fall back to empty ephemeral disk — that
      // looks like "wiped data" and breaks saves with Bad credentials.
      if (process.env.VERCEL || process.env.NETLIFY) {
        throw err instanceof Error
          ? err
          : new Error("GitHub storage unavailable");
      }
      console.warn("[store] GitHub load failed, using local file:", err);
    }
  }

  if (process.env.VERCEL || process.env.NETLIFY) {
    throw new Error(
      "GITHUB_TOKEN is missing or invalid — shared saves cannot load"
    );
  }

  const state = await readLocalFile();
  return { state, sha: null, backend: "file" };
}

export async function saveAppState(
  state: AppState,
  sha: string | null
): Promise<LoadedState> {
  const next: AppState = {
    ...trimStateForPersist(state),
    updatedAt: Date.now(),
    version: 1,
  };

  if (githubToken()) {
    return saveToGitHub(next, sha);
  }

  // On Vercel/Netlify, local disk is ephemeral — require a cloud token.
  if (process.env.VERCEL || process.env.NETLIFY) {
    throw new Error(
      "GITHUB_TOKEN is required in production so tier list and history stay saved across deploys"
    );
  }

  await writeLocalFile(next);
  return { state: next, sha: null, backend: "file" };
}

export function storeMode(): StoreBackend {
  return githubToken() ? "github" : "file";
}
