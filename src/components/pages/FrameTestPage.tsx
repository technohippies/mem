import { TestFrame } from '@/components/frames/TestFrame';
import { Helmet } from 'react-helmet';

export function FrameTestPage() {
  return (
    <>
      <Helmet>
        <title>Mem - Test Frame</title>
        <meta property="og:title" content="Mem - Test Frame" />
        <meta property="og:description" content="Test frame for Mem app integration" />
        <meta property="og:image" content="/logo.svg" />
        
        {/* Frame-specific metadata */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="/logo.svg" />
        <meta property="fc:frame:button:1" content="Study Now" />
        <meta property="fc:frame:button:2" content="View Details" />
      </Helmet>

      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        <TestFrame />
      </div>
    </>
  );
} 