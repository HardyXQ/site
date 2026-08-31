import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const tailwindConfig = fileURLToPath(new URL('./tailwind.config.ts', import.meta.url));

export default {
  plugins: [tailwindcss(tailwindConfig), autoprefixer()],
};
