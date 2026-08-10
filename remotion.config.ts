import { Config } from '@remotion/cli/config';

// The strip is flat vector on a solid ground, so it compresses extremely well
// and does not need a high bitrate — CRF is doing the work here, not the codec
// defaults. Overwriting is on because the asset is regenerated in place.
Config.setVideoImageFormat('png');
Config.setOverwriteOutput(true);
Config.setCrf(28);
