import { describe, expect, it } from "bun:test";
import { isBotOrCrawler } from "../src/lib/bot-detector";

describe("Bot and Crawler Detector", () => {
  it("detects common crawler and bot user-agents", () => {
    const bots = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "TelegramBot (like TwitterBot)",
      "Twitterbot/1.0",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "WhatsApp/2.21.12.21 A",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Discordbot/2.0; +https://discordapp.com",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 (compatible; DuckDuckBot-Https/1.1; https://duckduckgo.com/duckduckbot)",
      "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
      "Mozilla/5.0 (compatible; Bytespider; https://zhanzhang.toutiao.com/)",
      "Mozilla/5.0 (compatible; Applebot/0.3; +http://www.apple.com/go/applebot)",
      "curl/8.4.0",
      "Wget/1.21.3",
      "python-requests/2.31.0",
      "aiohttp/3.8.5",
      "PostmanRuntime/7.32.3",
      "Go-http-client/1.1",
      "HeadlessChrome/120.0.0.0",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Puppeteer/22.0.0",
    ];

    for (const ua of bots) {
      const isBot = isBotOrCrawler({
        header: (name: string) => (name.toLowerCase() === "user-agent" ? ua : undefined),
      });
      expect(isBot).toBe(true);
    }
  });

  it("passes standard desktop and mobile browsers", () => {
    const browsers = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    ];

    for (const ua of browsers) {
      const isBot = isBotOrCrawler({
        header: (name: string) => (name.toLowerCase() === "user-agent" ? ua : undefined),
      });
      expect(isBot).toBe(false);
    }
  });

  it("identifies prefetch and preview purpose headers as bots/crawlers", () => {
    expect(
      isBotOrCrawler({
        header: (name: string) => (name.toLowerCase() === "purpose" ? "prefetch" : undefined),
      })
    ).toBe(true);

    expect(
      isBotOrCrawler({
        header: (name: string) => (name.toLowerCase() === "sec-purpose" ? "preview" : undefined),
      })
    ).toBe(true);
  });

  it("treats missing user-agents as non-bot by default", () => {
    expect(
      isBotOrCrawler({
        header: () => undefined,
      })
    ).toBe(false);
  });
});
