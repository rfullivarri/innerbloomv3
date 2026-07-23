import fs from 'node:fs/promises';
import path from 'node:path';

const [renderDir, outputPath, repository, commitSha] = process.argv.slice(2);
if (!renderDir || !outputPath || !repository || !commitSha) {
  throw new Error('Usage: tsx scripts/create-marketing-github-staging-manifest.ts <render-dir> <output.json> <owner/repo> <commit-sha>');
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  throw new Error('repository must be owner/repo');
}
if (!/^[a-f0-9]{40}$/i.test(commitSha)) {
  throw new Error('commit-sha must be a full Git commit SHA');
}

const files = (await fs.readdir(renderDir)).filter((file) => /\.png$/i.test(file)).sort();
if (!files.length) throw new Error(`No PNG files found in ${renderDir}`);

const relativeRenderDir = path.relative(process.cwd(), path.resolve(renderDir)).split(path.sep).join('/');
const assets = await Promise.all(files.map(async (file) => {
  const repositoryPath = `${relativeRenderDir}/${file}`;
  const bytes = await fs.readFile(path.join(renderDir, file));
  return {
    file,
    source_url: `data:image/png;base64,${bytes.toString('base64')}`,
    repository_path: repositoryPath,
    web_view_url: `https://github.com/${repository}/blob/${commitSha}/${repositoryPath.split('/').map(encodeURIComponent).join('/')}`,
    staging_provider: 'neon_inline_review',
  };
}));

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  repository,
  commit_sha: commitSha,
  assets,
}, null, 2) + '\n');

console.log(`Created inline review manifest for ${assets.length} PNGs backed by the monthly branch.`);
