function getRequestId(headers: Headers) {
  return headers.get("x-request-id") ?? crypto.randomUUID();
}

function getUserToken(headers: Headers) {
  const token = headers.get("Authorization");
  if (!token) return null;
  return token.replace("Bearer ", "");
}
