import { TestFrame } from '@/components/frames/TestFrame';
import { FrameWrapper } from '@/components/frames/FrameWrapper';

export default function TestFramePage() {
  return (
    <FrameWrapper
      title="Mem - Test Frame"
      description="Test frame for Mem app integration"
      buttons={['Study Now', 'View Details']}
    >
      <TestFrame />
    </FrameWrapper>
  );
} 