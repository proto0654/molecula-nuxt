import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';

test('autoplay caption brightens during the final quarter of the comet lap', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true } });
  try {
    const { MoleculeScene } = await server.ssrLoadModule('/app/lib/molecular/MoleculeScene.ts');
    const { MoleculeEffects } = await server.ssrLoadModule('/app/lib/molecular/effects/MoleculeEffects.ts');
    const { OrbitComet } = await server.ssrLoadModule('/app/lib/molecular/effects/OrbitComet.ts');
    const effects = Object.create(MoleculeEffects.prototype);
    let title;
    const scene = {
      targetAccentEnterMix: 1,
      accentEnterMix: 1,
      accentWireframe: { visible: true },
      accentWireframeMode: 'pulse',
      accentWireframeMaterial: { opacity: 0 },
      pulseProgress: 0,
      effects,
      setAccentTitlePulse(value) { title = value; },
    };
    for (const [phase, expected] of [[0, 0], [0.5, 0], [0.75, 0], [0.8125, 0.00072479248046875], [0.875, 0.04296875], [1, 1], [2, 1]]) {
      effects.streamTime = phase * OrbitComet.cycleSeconds;
      MoleculeScene.prototype.updateAccentWireframePulse.call(scene, 0, 0);
      assert.ok(Math.abs(title - expected) < 1e-9, `phase ${phase}: ${title}`);
    }
    assert.equal(scene.accentWireframeMaterial.opacity, 0.035);
  } finally {
    await server.close();
  }
});
