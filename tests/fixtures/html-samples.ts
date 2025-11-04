/**
 * HTML Fixtures for Image Scraper Tests
 * Each sample tests a different extraction strategy
 */

export const HTML_WITH_OG_IMAGE = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:image" content="https://example.com/og-image.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <title>Article with Open Graph</title>
</head>
<body>
  <h1>Test Article</h1>
  <p>This is a test article with Open Graph image.</p>
</body>
</html>
`;

export const HTML_WITH_TWITTER_CARD = `
<!DOCTYPE html>
<html>
<head>
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://example.com/twitter-image.jpg" />
  <title>Article with Twitter Card</title>
</head>
<body>
  <h1>Test Article</h1>
  <p>This is a test article with Twitter Card image.</p>
</body>
</html>
`;

export const HTML_WITH_JSON_LD = `
<!DOCTYPE html>
<html>
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "image": {
      "@type": "ImageObject",
      "url": "https://example.com/jsonld-image.jpg",
      "width": 1920,
      "height": 1080
    },
    "headline": "Test Article"
  }
  </script>
  <title>Article with JSON-LD</title>
</head>
<body>
  <h1>Test Article</h1>
</body>
</html>
`;

export const HTML_WITH_LAZY_LOADING = `
<!DOCTYPE html>
<html>
<head>
  <title>Article with Lazy Loading</title>
</head>
<body>
  <article>
    <img 
      src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
      data-src="https://example.com/lazy-image.jpg"
      data-lazy="https://example.com/lazy-image-high.jpg"
      loading="lazy"
      alt="Lazy loaded image"
    />
  </article>
</body>
</html>
`;

export const HTML_WITH_SRCSET = `
<!DOCTYPE html>
<html>
<head>
  <title>Article with Srcset</title>
</head>
<body>
  <article>
    <img 
      src="https://example.com/image-400.jpg"
      srcset="
        https://example.com/image-400.jpg 400w,
        https://example.com/image-800.jpg 800w,
        https://example.com/image-1200.jpg 1200w,
        https://example.com/image-1600.jpg 1600w
      "
      sizes="(max-width: 768px) 100vw, 800px"
      alt="Responsive image"
    />
  </article>
</body>
</html>
`;

export const HTML_WITH_PICTURE_ELEMENT = `
<!DOCTYPE html>
<html>
<head>
  <title>Article with Picture Element</title>
</head>
<body>
  <article>
    <picture>
      <source media="(min-width: 1200px)" srcset="https://example.com/image-xl.webp" type="image/webp" />
      <source media="(min-width: 768px)" srcset="https://example.com/image-lg.webp" type="image/webp" />
      <source srcset="https://example.com/image-md.jpg" type="image/jpeg" />
      <img src="https://example.com/image-fallback.jpg" alt="Picture element image" />
    </picture>
  </article>
</body>
</html>
`;

export const HTML_WITH_AMP = `
<!DOCTYPE html>
<html ⚡>
<head>
  <title>AMP Article</title>
</head>
<body>
  <article>
    <amp-img 
      src="https://example.com/amp-image.jpg"
      width="1200"
      height="800"
      layout="responsive"
      alt="AMP image"
    ></amp-img>
  </article>
</body>
</html>
`;

export const HTML_WITH_NOSCRIPT = `
<!DOCTYPE html>
<html>
<head>
  <title>Article with Noscript</title>
</head>
<body>
  <article>
    <div class="lazy-container">
      <noscript>
        <img src="https://example.com/noscript-image.jpg" alt="Fallback image" />
      </noscript>
    </div>
  </article>
</body>
</html>
`;

export const HTML_WITH_CSS_BACKGROUND = `
<!DOCTYPE html>
<html>
<head>
  <title>Article with CSS Background</title>
  <style>
    .hero {
      background-image: url('https://example.com/css-bg-image.jpg');
      background-size: cover;
      height: 400px;
    }
  </style>
</head>
<body>
  <div class="hero"></div>
  <article>
    <h1>Test Article</h1>
  </article>
</body>
</html>
`;

export const HTML_WITH_INLINE_STYLE = `
<!DOCTYPE html>
<html>
<head>
  <title>Article with Inline Style</title>
</head>
<body>
  <article>
    <div 
      class="featured-image" 
      style="background-image: url('https://example.com/inline-bg-image.jpg'); height: 300px;"
    ></div>
    <h1>Test Article</h1>
  </article>
</body>
</html>
`;

export const HTML_WITH_MULTIPLE_STRATEGIES = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:image" content="https://example.com/og-priority-1.jpg" />
  <meta name="twitter:image" content="https://example.com/twitter-priority-2.jpg" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "image": "https://example.com/jsonld-priority-3.jpg"
  }
  </script>
  <title>Article with Multiple Strategies</title>
</head>
<body>
  <article>
    <img src="https://example.com/content-priority-4.jpg" alt="Article image" />
  </article>
</body>
</html>
`;

export const HTML_WITH_NO_IMAGE = `
<!DOCTYPE html>
<html>
<head>
  <title>Article without Image</title>
</head>
<body>
  <article>
    <h1>Test Article</h1>
    <p>This article has no images.</p>
  </article>
</body>
</html>
`;

export const HTML_WITH_INVALID_IMAGE = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:image" content="not-a-valid-url" />
  <title>Article with Invalid Image</title>
</head>
<body>
  <article>
    <img src="/relative/path/image.jpg" alt="Relative path" />
  </article>
</body>
</html>
`;
