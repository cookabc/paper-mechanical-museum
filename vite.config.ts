import {defineConfig} from 'vitest/config';
export default defineConfig({base:'./',build:{outDir:'dist',emptyOutDir:true},server:{port:4182,strictPort:true},test:{environment:'jsdom',include:['tests/*.test.ts'],setupFiles:['tests/setup.ts'],pool:'forks',maxWorkers:1}});
