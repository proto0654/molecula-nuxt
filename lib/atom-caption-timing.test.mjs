import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'vite';
import { Color } from 'three';

test('autoplay caption follows the wireframe throughout the slide', async () => {
  const server = await createServer({ configFile: false, server: { middlewareMode: true } });
  try {
    const { MoleculeScene } = await server.ssrLoadModule('/app/lib/molecular/MoleculeScene.ts');
    const { AtomLabel } = await server.ssrLoadModule('/app/lib/molecular/AtomLabel.ts');
    let title;
    const scene = {
      targetAccentEnterMix: 1,
      accentEnterMix: 1,
      accentWireframe: { visible: true },
      accentWireframeMode: 'pulse',
      accentWireframeMaterial: { opacity: 0 },
      pulseProgress: 0,
      setAccentTitlePulse(value) { title = value; },
    };
    for (const [phase, expected] of [[0, 0], [0.5, 0], [0.625, 0.15625], [0.75, 0.5], [0.875, 0.84375], [1, 1]]) {
      scene.pulseProgress = phase;
      MoleculeScene.prototype.updateAccentWireframePulse.call(scene, 0, 0);
      assert.ok(Math.abs(title - expected) < 1e-9, `phase ${phase}: ${title}`);
      const wireframeProgress = (scene.accentWireframeMaterial.opacity - 0.035) / (0.22 - 0.035);
      assert.ok(Math.abs(title - wireframeProgress) < 1e-9, `wireframe phase ${phase}`);
    }
    scene.accentWireframeMode = 'static';
    MoleculeScene.prototype.updateAccentWireframePulse.call(scene, 0, 0);
    assert.equal(title, null);

    const label = {
      titlePulse: 0.5,
      titleActive: false,
      scratchColor: new Color(),
      scratchActiveColor: new Color(0xd6dbe0),
      scratchActiveRemainderColor: new Color(0xb8c0c8),
      letter: {},
      remainder: {},
    };
    AtomLabel.prototype.applyTitleColors.call(label);
    for (const [color, full] of [[label.letter.color, 0xd6dbe0], [label.remainder.color, 0xb8c0c8]]) {
      for (const shift of [16, 8, 0]) {
        const channel = (color >> shift) & 255;
        const fullChannel = (full >> shift) & 255;
        assert.ok(Math.abs(channel - fullChannel / 2) <= 1);
      }
    }
  } finally {
    await server.close();
  }
});
