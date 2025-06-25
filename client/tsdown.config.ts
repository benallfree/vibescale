import { copyFileSync } from 'fs'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
  outDir: 'dist',
  onSuccess: (config) => {
    copyFileSync('README.md', '../README.md')
    copyFileSync('llm.md', '../llm.md')
    console.log('README.md and llm.md copied to root directory')
  },
})
