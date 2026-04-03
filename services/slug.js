function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]+/g, '-')     // non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, '')          // trim leading/trailing hyphens
    .substring(0, 80);
}

async function ensureUniqueSlug(pool, slug, excludeId) {
  let candidate = slug;
  let suffix = 1;

  while (true) {
    const query = excludeId
      ? { text: 'SELECT id FROM job_postings WHERE slug = $1 AND id != $2', values: [candidate, excludeId] }
      : { text: 'SELECT id FROM job_postings WHERE slug = $1', values: [candidate] };

    const result = await pool.query(query);
    if (result.rows.length === 0) return candidate;

    suffix++;
    candidate = `${slug}-${suffix}`;
  }
}

module.exports = { generateSlug, ensureUniqueSlug };
