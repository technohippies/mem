import { ReactNode } from 'react';

interface FrameWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
  image?: string;
  buttons?: string[];
}

export function FrameWrapper({
  children,
  title = 'Mem',
  description = 'Study smarter with spaced repetition',
  image = '/logo.svg',
  buttons = ['Study Now']
}: FrameWrapperProps) {
  return (
    <>
      {/* Frame Metadata */}
      <head>
        <title>{title}</title>
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        
        {/* Frame-specific metadata */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={image} />
        {buttons.map((button, index) => (
          <meta 
            key={`button-${index + 1}`}
            property={`fc:frame:button:${index + 1}`}
            content={button}
          />
        ))}
      </head>

      {/* Frame Content */}
      <div className="min-h-screen bg-neutral-900 text-neutral-100">
        {children}
      </div>
    </>
  );
} 