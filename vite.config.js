import { defineConfig } from 'vite';

export default defineConfig({
  // The 'base' option is the key.
  // An empty string '' or './' ensures all asset paths are relative.
  // This is crucial for builds that will be hosted in a subdirectory or iframe, like on itch.io.
  base: '', 
});