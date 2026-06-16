// Server-only helper to derive the trusted application origin from the
// current request. Never trust client-supplied URLs/redirect targets for
// building links sent in emails — derive from the request the user is
// actually hitting (or APP_ORIGIN env override).

import { getRequest } from "@tanstack/react-start/server";

const ALLOWED_HOST_PATTERNS = [
  /^osclima\.lovable\.app$/i,
  /^.*\.lovable\.app$/i,
  /^localhost(:\d+)?$/i,
];

export function getTrustedAppOrigin(): string {
  const envOrigin = process.env.APP_ORIGIN;
  if (envOrigin) {
    try {
      return new URL(envOrigin).origin;
    } catch {
      // fall through
    }
  }

  try {
    const req = getRequest();
    const url = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const host = forwardedHost ?? url.host;
    const protocol = (forwardedProto ?? url.protocol.replace(":", "")) || "https";

    if (ALLOWED_HOST_PATTERNS.some((re) => re.test(host))) {
      return `${protocol}://${host}`;
    }
  } catch {
    // ignore
  }

  return "https://osclima.lovable.app";
}
