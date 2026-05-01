import esbuild from 'esbuild';
import process from 'process';
import builtins from 'builtin-modules';
import path from 'path';
import fs from 'fs';

const VAULT_PLUGIN_DIR =
  '/Users/michael/Personal/.obsidian/plugins/obsidian-unified-kanban';

const prod = process.argv[2] === 'production';

const copyToVault = {
  name: 'copy-to-vault',
  setup(build) {
    build.onEnd(() => {
      fs.mkdirSync(VAULT_PLUGIN_DIR, { recursive: true });
      for (const file of ['main.js', 'styles.css', 'manifest.json']) {
        const src = path.join(process.cwd(), file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(VAULT_PLUGIN_DIR, file));
        }
      }
      console.log(`[unified-kanban] Copied to vault plugin dir`);
    });
  },
};

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
    ...builtins,
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  treeShaking: true,
  outfile: 'main.js',
  minify: prod,
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  plugins: [copyToVault],
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
