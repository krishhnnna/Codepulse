/**
 * Vercel Serverless Function: LeetCode REST API Proxy
 * 
 * Proxies requests to LeetCode's contest ranking REST API
 * because Render's datacenter IPs are blocked by Cloudflare,
 * but Vercel's edge IPs are not.
 * 
 * Usage: GET /api/lc-proxy?slug=biweekly-contest-178&page=1
 */

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug, page } = req.query;

  if (!slug || !page) {
    return res.status(400).json({ error: 'Missing slug or page parameter' });
  }

  const url = `https://leetcode.com/contest/api/ranking/${slug}/?pagination=${page}&region=global`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `LeetCode returned ${response.status}`,
        body: (await response.text()).substring(0, 200),
      });
    }

    const data = await response.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
