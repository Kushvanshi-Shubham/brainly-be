import { Router, Request, Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../asyncHandler";
import { userMiddleware } from "../middleware";

const router = Router();

interface AuthenticatedRequest extends Request {
  userId: string;
}

// Validation schema
const urlSchema = z.object({
  url: z.string().min(1).refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Invalid URL format" })
});

// Fetch link metadata endpoint
router.post(
  "/fetch-metadata",
  userMiddleware as any, // Express v5 type compatibility
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url } = urlSchema.parse(req.body);

    try {
      // Fetch the HTML content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BrainlyBot/1.0; +http://brainly.com/bot)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const html = await response.text();

      // Parse Open Graph and meta tags
      const metadata = {
        title: extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title') || extractTitle(html) || 'No title',
        description: extractMetaTag(html, 'og:description') || extractMetaTag(html, 'twitter:description') || extractMetaTag(html, 'description') || 'No description available',
        image: extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image') || '',
        siteName: extractMetaTag(html, 'og:site_name') || new URL(url).hostname,
        url: extractMetaTag(html, 'og:url') || url,
      };

      res.json({ success: true, metadata });
    } catch (error: unknown) {
      // Log error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch link metadata:', errorMessage);
      
      // Fallback metadata
      const fallbackMetadata = {
        title: 'Saved Link',
        description: url,
        image: '',
        siteName: new URL(url).hostname,
        url,
      };
      
      res.json({ success: true, metadata: fallbackMetadata });
    }
  })
);

// Helper functions to extract meta tags
function extractMetaTag(html: string, property: string): string | null {
  // Try Open Graph tags
  const ogRegex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const ogMatch = ogRegex.exec(html);
  if (ogMatch) return ogMatch[1];

  // Try Twitter tags
  const twitterRegex = new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const twitterMatch = twitterRegex.exec(html);
  if (twitterMatch) return twitterMatch[1];

  // Try standard meta tags
  const metaRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const metaMatch = metaRegex.exec(html);
  if (metaMatch) return metaMatch[1];

  // Try alternate attribute order
  const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["'](?:og:|twitter:)?${property}["']`, 'i');
  const altMatch = altRegex.exec(html);
  if (altMatch) return altMatch[1];

  return null;
}

function extractTitle(html: string): string | null {
  const titleRegex = /<title[^>]*>([^<]*)<\/title>/i;
  const match = titleRegex.exec(html);
  return match ? match[1].trim() : null;
}

export default router;
