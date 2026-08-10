import { Composition } from 'remotion';
import { DraftingStrip } from './DraftingStrip';

/**
 * 1600x400 at 30fps for 8 seconds.
 *
 * The strip renders at 2x its CSS box (800x200) so it stays sharp on a retina
 * display. 30fps rather than 60 because nothing in it moves fast enough to
 * benefit — the grid crosses one 40px tile over the entire eight seconds — and
 * halving the frame count halves the file the visitor downloads.
 */
export const RemotionRoot: React.FC = () => (
  <Composition
    id="DraftingStrip"
    component={DraftingStrip}
    durationInFrames={240}
    fps={30}
    width={1600}
    height={400}
  />
);
