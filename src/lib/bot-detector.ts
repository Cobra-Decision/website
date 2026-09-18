/**
 * Zero-dependency bot and crawler detection utility.
 * Identifies search engine bots, preview crawlers, CLI tools, and prefetch headers.
 */
const BOT_REGEX =
  /(bot|crawler|spider|crawling|telegrambot|twitterbot|facebookexternalhit|whatsapp|slackbot|discordbot|googlebot|bingbot|yandex|baiduspider|duckduckbot|bytespider|applebot|curl|wget|python-requests|aiohttp|httpx|go-http-client|postman|insomnia|headlesschrome|phantomjs|puppeteer|playwright)/i;

export interface RequestWithHeaders {
  header(name: string): string | undefined;
}

export function isBotOrCrawler(req: RequestWithHeaders): boolean {
  const purpose = req.header("purpose") || req.header("sec-purpose") || req.header("x-purpose");
  if (purpose === "prefetch" || purpose === "preview") {
    return true;
  }

  const userAgent = req.header("user-agent");
  if (!userAgent) {
    return false;
  }

  return BOT_REGEX.test(userAgent);
}
