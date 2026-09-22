export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html')) return response;

    // Crawlers — X in particular — drop cards whose og:image, twitter:image, or
    // og:url is relative. The document keeps root-relative paths so it stays
    // deployable anywhere; the origin is bound here, per request.
    const origin = new URL(request.url).origin;
    const html = (await response.text()).replaceAll('content="/', `content="${origin}/`);

    return new Response(html, response);
  },
};
