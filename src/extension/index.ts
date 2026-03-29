import type { NodeCG } from './nodecg';
import { eventGraphics } from './eventGraphics';

export default (nodecg: NodeCG) => {
  const log = new nodecg.Logger('extension');
  log.info('=====Extension is running=====');

  eventGraphics(nodecg);
};
