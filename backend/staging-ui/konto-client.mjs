export function extractMailAction(fragment) {
  const match = /^#(verify|reset|invite)=([a-f0-9]{64})$/.exec(String(fragment || ''));
  return match ? {kind: match[1], token: match[2]} : null;
}

export function clearMailFragment(locationRef, historyRef) {
  if (locationRef.hash) historyRef.replaceState(null, '', locationRef.pathname + locationRef.search);
}
