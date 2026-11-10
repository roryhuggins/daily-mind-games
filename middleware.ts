import { NextResponse, type NextRequest } from "next/server";

// Optional shared password for the pages (not the API, which has its own secret).
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const pass = atob(encoded).split(":").slice(1).join(":");
    if (pass === password) return NextResponse.next();
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Daily Mind leaderboard"' },
  });
}

export const config = { matcher: ["/((?!api/|_next/|favicon).*)"] };
