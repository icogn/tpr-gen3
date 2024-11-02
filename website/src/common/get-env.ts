import { cookies } from 'next/headers';

// We use cookies() here to cause any route using this to be dynamic. Otherwise,
// a page which uses this will statically use the value of the environment
// variable at build time. We use a string variable to references the env
// variable just to be safe (to avoid inlining).
export function getVolumeDir() {
  cookies();
  const name = 'VOLUME_DIR';
  return process.env[name];
}
