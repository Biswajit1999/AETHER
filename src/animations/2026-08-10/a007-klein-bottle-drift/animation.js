import { createStudy } from '../../shared/study-engine.js';
import { studies } from '../../shared/study-catalog.js';

export function createAnimation(runtime) {
  return createStudy(runtime, studies.a007);
}

