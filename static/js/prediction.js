async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || "The archive terminal could not complete that request.");
  }
  return body;
}

export const api = {
  health: () => request("/api/health"),
  metadata: () => request("/api/metadata"),
  records: (params = "") => request(`/api/records${params}`),
  record: (id) => request(`/api/records/${id}`),
  predict: (features) => request("/api/predict", { method: "POST", body: JSON.stringify({ features }) }),
  evaluateRecord: (recordId) =>
    request("/api/evaluate-record", { method: "POST", body: JSON.stringify({ record_id: recordId }) }),
  evaluation: () => request("/api/evaluate-model"),
};
