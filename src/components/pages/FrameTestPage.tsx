import { TestFrame } from '@/components/frames/TestFrame';
import { Helmet } from 'react-helmet';

export function FrameTestPage() {
  // Get the full URL for assets
  const baseUrl = 'https://wailing-branch-broad.on-fleek.app';
  const imageUrl = `${baseUrl}/logo.svg`;

  return (
    <>
      <Helmet>
        {/* Required Open Graph Meta Tags */}
        <meta property="og:title" content="Mem - Test Frame" />
        <meta property="og:description" content="Test frame for Mem app integration" />
        <meta property="og:image" content={imageUrl} />
        
        {/* Frame-specific metadata */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={imageUrl} />
        <meta property="fc:frame:button:1" content="Study Now" />
        <meta property="fc:frame:button:2" content="View Details" />
        <meta property="fc:frame:post_url" content={`${baseUrl}/frame/test`} />
      </Helmet>

      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <TestFrame />
      </div>
    </>
  );
} 