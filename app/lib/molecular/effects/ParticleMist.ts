import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  type Fog,
  type FogExp2,
} from 'three';
import { ACCENT_COLOR, SCENE_DUST_COLOR } from '../sceneColors';

/** Hard ceiling; the authored rows are stream + atom dive + ambient (170 at max). */
const MAX_PARTICLES = 280;
/** Ambient shell dust around the molecule — sparse, ~1/4 of the old cloud. */
const AMBIENT_POINTS = 70;
/** Align the scene fog to the dust's visible range; the data cloud is small. */
const DUST_FOG_NEAR = 6.5;
const DUST_FOG_FAR = 22;
/** Share of the budget that streams toward the upcoming atom (bond or hub dive). */
const STREAM_RATIO = 0.18;
/**
 * Share of the budget that dives onto the upcoming peripheral atom itself,
 * while the bond stream is still running. Same trajectory and density as the
 * hub dive, so the effect reads identically on any upcoming atom.
 */
const ATOM_DIVE_RATIO = STREAM_RATIO;
const TAU = Math.PI * 2;
const HUB_YAW = 0.022;
const HUB_PITCH = 0.009;
/** Dive shell in hub radii: where a point is born, and where it touches the surface. */
const FALL_OUTER_RADIUS = 2.2;
const FALL_INNER_RADIUS = 1.02;
/** Radians a dive point sweeps tangentially while falling — a spiral, not a spoke. */
const FALL_SWIRL = 2.4;
/** Few, chunky squares — no blur to hide the aliasing. */
const DUST_POINT_PX = 3.4;
const DUST_POINT_MAX_PX = 5;
/** Per-point loop period range; each particle re-launches on its own clock. */
const STREAM_PERIOD_MIN = 5.2;
const STREAM_PERIOD_MAX = 7.0;
/** Time a single point spends travelling hub → atom. */
const STREAM_TRAVEL_SECONDS = 2.2;
/** Short settle before the first points start after a target change. */
const STREAM_LAUNCH_DELAY = 0.25;
/** Home boot: share of the spawn window spread across per-point launch delays. */
const BOOT_SPREAD = 0.55;
/** Radians a shell point sweeps while leaving the hub — mirrors `FALL_SWIRL`. */
const BOOT_SWIRL = 1.9;

/** Small deterministic PRNG so the point set does not reshuffle on HMR. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const vertexShader = /* glsl */ `
  /** Stream clock — restarted from 0 whenever the target atom changes. */
  uniform float uTime;
  /** Ambient clock — monotonic scene time, never restarted by a target change. */
  uniform float uAmbientTime;
  uniform float uOpacity;
  uniform float uPixelRatio;

  uniform vec3 uLinkFrom;
  uniform vec3 uLinkTo;
  uniform float uLinkMix;

  /** 0 = hub→atom bond stream, 1 = shell→hub dive (upcoming atom is the hub). */
  uniform float uLinkMode;
  uniform vec3 uFallFrom;
  uniform float uFallOuter;
  uniform float uFallInner;

  /** Shell→atom dive on the upcoming peripheral atom (rides with the bond stream). */
  uniform vec3 uDiveFrom;
  uniform float uDiveOuter;
  uniform float uDiveInner;
  /** 1 = dive rows may draw; 0 = no dive (no peripheral target). */
  uniform float uDiveGate;

  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uFogDensity;

  uniform vec3 uInk;
  uniform vec3 uAccent;
  /** 1 = ambient shell drifts; 0 = ambient is static (LOW). */
  uniform float uDrift;
  /** Home boot spawn: 0 = every point still at the hub, 1 = live. */
  uniform float uBoot;
  /** 1 = stream rows may draw; 0 = no stream at all (frozen routes). */
  uniform float uStreamGate;

  // JS constants are injected as literals — GLSL has no access to module scope.
  const float TAU = ${TAU.toFixed(8)};
  const float HUB_YAW = ${HUB_YAW.toFixed(6)};
  const float HUB_PITCH = ${HUB_PITCH.toFixed(6)};
  const float DUST_POINT_PX = ${DUST_POINT_PX.toFixed(2)};
  const float DUST_POINT_MAX_PX = ${DUST_POINT_MAX_PX.toFixed(1)};
  const float STREAM_PERIOD_MIN = ${STREAM_PERIOD_MIN.toFixed(2)};
  const float STREAM_PERIOD_MAX = ${STREAM_PERIOD_MAX.toFixed(2)};
  const float STREAM_TRAVEL_SECONDS = ${STREAM_TRAVEL_SECONDS.toFixed(2)};
  const float STREAM_LAUNCH_DELAY = ${STREAM_LAUNCH_DELAY.toFixed(2)};
  const float FALL_SWIRL = ${FALL_SWIRL.toFixed(2)};
  const float BOOT_SPREAD = ${BOOT_SPREAD.toFixed(2)};
  const float BOOT_SWIRL = ${BOOT_SWIRL.toFixed(2)};

  attribute vec3 aNode;   // x = shell radius 0..1, yz = direction hash
  attribute vec3 aLink;   // x = progress lane, y = swirl lane, z = energy
  attribute vec4 aParams; // phase, speed, mode (0 = ambient, 1 = stream, 2 = atom dive), size class

  varying vec3 vColor;
  varying float vAlpha;

  // Mirrors three's <fog_vertex>/<fog_fragment> for Fog and FogExp2.
  float fogFactor(float depth) {
    if (uFogDensity > 0.0) {
      return 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
    }
    if (uFogFar > uFogNear) {
      return smoothstep(uFogNear, uFogFar, depth);
    }
    return 0.0;
  }

  /**
   * Shell dive: a point is born on a sphere around the atom centre at a fresh
   * bearing and spirals onto its surface. Shared by the hub dive (the hub owns
   * no bond) and the peripheral-atom dive that accompanies the bond stream.
   * The fade output dies on contact so a point never sinks into the shell.
   */
  vec3 spiralFall(
    vec3 center,
    float outer,
    float inner,
    float travel,
    float dirSeed,
    float turnSeed,
    out float fade
  ) {
    float y = dirSeed * 2.0 - 1.0;
    float ring = sqrt(max(0.0, 1.0 - y * y));
    float bearing = turnSeed * TAU;
    vec3 dir = normalize(
      vec3(cos(bearing) * ring, y, sin(bearing) * ring) + 1e-4
    );
    vec3 axis = abs(dir.y) > 0.9
      ? vec3(1.0, 0.0, 0.0)
      : vec3(0.0, 1.0, 0.0);
    vec3 side = normalize(cross(dir, axis));
    float swept = travel * FALL_SWIRL;
    vec3 fall = dir * cos(swept) + side * sin(swept);
    fade = smoothstep(0.0, 0.08, travel)
      * (1.0 - smoothstep(0.88, 1.0, travel));
    return center + fall * mix(outer, inner, travel);
  }

  void main() {
    float phase = aParams.x;
    float speed = aParams.y;
    float mode = aParams.z;
    bool isStream = mode > 0.5;

    vec3 local;
    float depthFade = 1.0;
    float accent = 0.0;

    if (isStream) {
      // Each point owns a loop. Its launch phase and lateral trajectory are
      // re-rolled every period, so the stream is continuous (no synchronized
      // burst) and never repeats the same path twice.
      float period = mix(STREAM_PERIOD_MIN, STREAM_PERIOD_MAX, aLink.z);
      float time = max(0.0, uTime - STREAM_LAUNCH_DELAY);
      float cycle = floor(time / period);
      float phaseTime = time - cycle * period;
      float phase = fract(
        sin((cycle + 1.0) * 12.9898 + aLink.y * 78.233) * 43758.5453
      );
      float launch = (0.04 + 0.96 * phase) * period;
      float age = phaseTime - launch;
      float travel = clamp(age / STREAM_TRAVEL_SECONDS, 0.0, 1.0);
      float alive = step(0.0, age) * step(age, STREAM_TRAVEL_SECONDS);

      // Three trajectories live in these rows. A bond stream runs hub → upcoming
      // peripheral atom; when that atom IS the hub there is no bond and no
      // orbit of its own, so the same points dive in from the shell around it.
      // The dedicated dive rows always land on the upcoming peripheral atom,
      // mirroring that hub dive while the bond stream keeps running.
      if (mode > 1.5) {
        // Fresh bearing on the shell every cycle: the dive never repeats a ray.
        float dirHash = fract(
          sin((cycle + 1.0) * 29.7314159 + aLink.x * 43.8826951) * 47123.91406
        );
        float turnHash = fract(
          sin((cycle + 1.0) * 53.1917362 + aLink.y * 19.4712206) * 18063.41421
        );
        float contactFade;
        local = spiralFall(
          uDiveFrom,
          uDiveOuter,
          uDiveInner,
          travel,
          dirHash,
          turnHash,
          contactFade
        );
        depthFade = alive * contactFade * uDiveGate;
      } else if (uLinkMode > 0.5) {
        // Fresh bearing on the shell every cycle: the dive never repeats a ray.
        float dirHash = fract(
          sin((cycle + 1.0) * 23.1406926 + aLink.x * 61.8033989) * 41509.27148
        );
        float turnHash = fract(
          sin((cycle + 1.0) * 47.7641237 + aLink.y * 27.3710108) * 23711.51733
        );
        float contactFade;
        local = spiralFall(
          uFallFrom,
          uFallOuter,
          uFallInner,
          travel,
          dirHash,
          turnHash,
          contactFade
        );
        // Dies on the surface: contact fade starts earlier than the bond's
        // arrival fade so a point never sinks through the atom shell.
        depthFade = alive * contactFade;
      } else {
        vec3 p = mix(uLinkFrom, uLinkTo, travel);

        // New scatter direction each cycle, but kept close to the connector so
        // the stream reads as one cohesive band rather than a loose cloud.
        float scatter = fract(
          sin((cycle + 1.0) * 39.346 + aLink.z * 11.135) * 24634.6345
        );
        float angle = scatter * TAU;
        float radius = 0.012 + fract(scatter * 5.71) * 0.05;
        p.x += cos(angle) * radius;
        p.y += sin(angle) * radius;
        p.z += (scatter - 0.5) * 0.04;

        local = p;
        // Fade in at the hub, disappear exactly at the atom — never park there.
        depthFade = alive * smoothstep(0.0, 0.08, travel)
          * (1.0 - smoothstep(0.94, 1.0, travel));
      }
      depthFade *= uStreamGate;
      accent = 0.25 + 0.5 * uLinkMix;
      // Boot: the bond stream is born with the live phase, not from a hub
      // that is still condensing.
      depthFade *= step(0.999, uBoot);
    } else {
      // Data dust: thin shell in the molecule frame, yaw + pitch over time.
      // LOW freezes this ambient drift; the bond stream still moves. This uses
      // its own clock so a stream re-emission never snaps the shell.
      float driftTime = uAmbientTime * uDrift;
      float radius = 1.05 + aNode.x * 2.35;
      float yaw = driftTime * HUB_YAW * speed + phase * TAU;
      float pitch = driftTime * HUB_PITCH * speed + phase * TAU * 0.37;
      float cy = cos(yaw);
      float sy = sin(yaw);
      float cp = cos(pitch);
      float sp = sin(pitch);
      vec3 dir = normalize(vec3(aNode.y, aNode.z, phase * 2.0 - 1.0) + 1e-4);
      vec3 d = vec3(cy * dir.x + sy * dir.z, dir.y, -sy * dir.x + cy * dir.z);
      d = vec3(d.x, cp * d.y - sp * d.z, sp * d.y + cp * d.z);

      // Home boot: the shell is born at the hub and spirals out to its place -
      // the hub dive mirrored. Each point leaves on its own delay and
      // decelerates into its radius, so the cloud freezes point by point.
      float bootFade = 1.0;
      if (uBoot < 1.0) {
        float launch = phase * BOOT_SPREAD;
        float p = clamp((uBoot - launch) / (1.0 - BOOT_SPREAD), 0.0, 1.0);
        float grow = 1.0 - pow(1.0 - p, 3.0);
        float swept = (1.0 - grow) * BOOT_SWIRL;
        vec3 axis = abs(d.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 side = normalize(cross(d, axis));
        d = d * cos(swept) + side * sin(swept);
        radius *= grow;
        bootFade = smoothstep(0.02, 0.16, p);
      }

      local = d * radius;
      depthFade = (0.35 + 0.65 * (1.0 - aNode.x)) * bootFade;
      accent = aNode.x > 0.86 ? 0.5 : 0.0;
    }

    vec4 mv = modelViewMatrix * vec4(local, 1.0);
    gl_Position = projectionMatrix * mv;

    // Few, simple squares for ambient dust; stream size matches it.
    float sizeScale = 1.0;
    gl_PointSize = clamp(
      DUST_POINT_PX * aParams.w * sizeScale * uPixelRatio,
      1.0,
      DUST_POINT_MAX_PX
    );

    float fog = fogFactor(-mv.z);
    float twinkle = isStream
      ? 0.72 + 0.28 * sin(uTime * 0.4 + phase * 31.0)
      : mix(1.0, 0.72 + 0.28 * sin(uAmbientTime * 0.4 + phase * 31.0), uDrift);
    float baseAlpha = isStream ? mix(0.15, 0.85, uLinkMix) : 0.8;
    vAlpha = uOpacity * baseAlpha * twinkle * depthFade * (1.0 - fog);

    // Idle streams fade to a faint residue, never disappear entirely.
    if (isStream && uLinkMix < 0.05) {
      vAlpha *= 0.25;
    }

    vColor = mix(uInk, uAccent, accent);

    if (vAlpha <= 0.003) {
      vAlpha = 0.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    }
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Hard square: no sprite, no smoothstep disc, no texture — cheap to fill.
    gl_FragColor = vec4(vColor, vAlpha);
    #include <colorspace_fragment>
  }
`;

/** Reorder a per-point attribute so stream points come first. */
function gather(
  source: Float32Array,
  stride: number,
  order: Uint32Array,
): Float32Array {
  const out = new Float32Array(source.length);
  for (let k = 0; k < order.length; k += 1) {
    const from = order[k]! * stride;
    const to = k * stride;
    for (let s = 0; s < stride; s += 1) {
      out[to + s] = source[from + s]!;
    }
  }
  return out;
}

/**
 * Molecular dust as data: one `Points` draw call of chunky squares.
 *
 * - Free points drift on a thin shell around the hub in the molecule frame.
 * - ~18% of rows stream toward the upcoming atom. For a peripheral atom that
 *   is the hub → atom bond; for the hub itself the same rows dive from a shell
 *   around it onto its surface. Each point has its own launch/travel/rest loop
 *   and never parks on the destination.
 * - The dedicated dive rows (same share as the stream) copy that hub dive onto
 *   the upcoming peripheral atom, so the bond stream's arrival is backed by
 *   particles converging on the atom itself.
 * - Drift is computed in the vertex shader from `uAmbientTime`; the stream runs
 *   on `uTime`, which a target change restarts. Two clocks on purpose: a stream
 *   re-emission must not snap the ambient shell. The CPU writes uniforms only.
 * - Distance fade reuses the scene fog, so the dust sits in the scene depth.
 *
 * The object mirrors the molecule transform (position + quaternion), so `local`
 * is molecule space and bond anchors stay valid while the group rotates/spins.
 * Stream and dive rows sit at the head of the buffer, so any grade draws them
 * and only the ambient tail is trimmed, without rebuilding attributes.
 */
export class ParticleMist {
  readonly object: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly linkAttribute: BufferAttribute;
  private readonly streamSource: Float32Array;
  /** Rows actually authored: stream + atom dive + ambient shell. */
  private usedRows = 0;
  private count = 0;

  constructor(seed = 0x6d6f6c65) {
    const random = mulberry32(seed);
    const nodes = new Float32Array(MAX_PARTICLES * 3);
    const links = new Float32Array(MAX_PARTICLES * 3);
    const params = new Float32Array(MAX_PARTICLES * 4);
    const order = new Uint32Array(MAX_PARTICLES);
    // Fixed row budget: the first STREAM_ROWS rows stream, the next dive rows
    // land on the upcoming peripheral atom, then the ambient shell. Everything
    // else is unused so a grade can only change the draw range, never the
    // layout.
    const streamRows = Math.round(MAX_PARTICLES * STREAM_RATIO);
    const diveRows = Math.round(MAX_PARTICLES * ATOM_DIVE_RATIO);
    let cursor = 0;

    for (let i = 0; i < streamRows + diveRows + AMBIENT_POINTS; i += 1) {
      const o = i * 3;
      const isStream = i < streamRows;
      const isDive = !isStream && i < streamRows + diveRows;
      order[cursor++] = i;

      links[o] = (i * 0.6180339887) % 1;
      links[o + 1] = (i * 0.3819660113) % 1;
      links[o + 2] = 0.4 + ((i * 0.7548776662) % 1) * 0.6;

      if (isStream || isDive) {
        nodes[o] = random();
        nodes[o + 1] = random();
        nodes[o + 2] = random();
      } else {
        const y = random() * 2 - 1;
        const theta = random() * TAU;
        const s = Math.sqrt(Math.max(0, 1 - y * y));
        nodes[o] = Math.pow(random(), 0.8);
        nodes[o + 1] = Math.cos(theta) * s;
        nodes[o + 2] = Math.sin(theta) * s;
      }

      const p = i * 4;
      params[p] = random();
      params[p + 1] = isStream || isDive
        ? 0.6 + random() * 1.1
        : 0.35 + random() * 1.0;
      // 0 = ambient shell, 1 = bond / hub-dive rows, 2 = atom dive rows.
      params[p + 2] = isStream ? 1 : isDive ? 2 : 0;
      params[p + 3] = random() < 0.6 ? 1 : 1.5;
    }

    this.geometry = new BufferGeometry();
    this.usedRows = cursor;
    // Positions are computed in the shader; the buffer satisfies three's layout.
    this.geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3),
    );
    this.streamSource = gather(links, 3, order);
    this.geometry.setAttribute(
      'aNode',
      new BufferAttribute(gather(nodes, 3, order), 3),
    );
    this.linkAttribute = new BufferAttribute(this.streamSource, 3);
    this.geometry.setAttribute('aLink', this.linkAttribute);
    this.geometry.setAttribute(
      'aParams',
      new BufferAttribute(gather(params, 4, order), 4),
    );
    this.geometry.setDrawRange(0, 0);

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmbientTime: { value: 0 },
        uOpacity: { value: 0 },
        uPixelRatio: { value: 1 },
        uLinkFrom: { value: [0, 0, 0] },
        uLinkTo: { value: [0, 0, 0] },
        uLinkMix: { value: 0 },
        uLinkMode: { value: 0 },
        uFallFrom: { value: [0, 0, 0] },
        uFallOuter: { value: 0.7 },
        uFallInner: { value: 0.33 },
        uDiveFrom: { value: [0, 0, 0] },
        uDiveOuter: { value: 0.7 },
        uDiveInner: { value: 0.33 },
        uDiveGate: { value: 0 },
        uDrift: { value: 1 },
        uBoot: { value: 1 },
        uStreamGate: { value: 1 },
        uFogNear: { value: DUST_FOG_NEAR },
        uFogFar: { value: DUST_FOG_FAR },
        uFogDensity: { value: 0 },
        uInk: { value: new Color(SCENE_DUST_COLOR) },
        uAccent: { value: new Color(ACCENT_COLOR) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
    });

    this.object = new Points(this.geometry, this.material);
    this.object.name = 'molecule-dust';
    this.object.frustumCulled = false;
    this.object.renderOrder = 3;
    this.object.visible = false;
  }

  /**
   * Mirror the scene fog into the shader so the dust fades with the scene.
   * The range is aligned to the dust shell so the far ring dissolves instead
   * of disappearing behind the camera frustum.
   */
  setFog(fog: Fog | FogExp2 | null): void {
    const uniforms = this.material.uniforms;
    if (fog && 'density' in fog) {
      uniforms.uFogDensity!.value = fog.density;
      uniforms.uFogNear!.value = 0;
      uniforms.uFogFar!.value = 0;
      return;
    }
    uniforms.uFogDensity!.value = 0;
    uniforms.uFogNear!.value = DUST_FOG_NEAR;
    uniforms.uFogFar!.value = DUST_FOG_FAR;
  }

  /**
   * Quality grade — draw range only. Stream rows come first, so a smaller
   * grade trims the ambient shell and keeps the stream intact.
   */
  setCount(count: number): void {
    const next = Math.max(0, Math.min(this.usedRows, Math.floor(count)));
    if (next === this.count) return;
    this.count = next;
    this.geometry.setDrawRange(0, next);
    this.syncVisibility();
  }

  /**
   * Bond anchors in molecule space (inset by atom radii, matching `Bond`).
   * Only the stream points read them, so set them when the pose settles.
   */
  setLink(
    from: readonly [number, number, number],
    to: readonly [number, number, number],
    active: boolean,
  ): void {
    const fromUniform = this.material.uniforms.uLinkFrom!.value as number[];
    const toUniform = this.material.uniforms.uLinkTo!.value as number[];
    fromUniform[0] = from[0];
    fromUniform[1] = from[1];
    fromUniform[2] = from[2];
    toUniform[0] = to[0];
    toUniform[1] = to[1];
    toUniform[2] = to[2];
    this.material.uniforms.uLinkMode!.value = 0;
    this.setActive(active);
  }

  /**
   * Central-atom variant of the same rows. The hub owns no bond and no orbit,
   * so points are born on a shell around it and spiral onto its surface. The
   * loop (launch → travel → vanish → period) is identical to the bond stream;
   * only the trajectory differs. `hubRadius` is live (compact layout shrinks
   * the hub), so the caller may write it every frame.
   */
  setFall(
    center: { x: number; y: number; z: number },
    hubRadius: number,
    active: boolean,
  ): void {
    const uniforms = this.material.uniforms;
    const fallFrom = uniforms.uFallFrom!.value as number[];
    fallFrom[0] = center.x;
    fallFrom[1] = center.y;
    fallFrom[2] = center.z;
    uniforms.uFallOuter!.value = hubRadius * FALL_OUTER_RADIUS;
    uniforms.uFallInner!.value = hubRadius * FALL_INNER_RADIUS;
    uniforms.uLinkMode!.value = 1;
    this.setActive(active);
  }

  /**
   * Peripheral-atom variant of the dive. While the bond stream runs hub → atom,
   * the dedicated dive rows are born on a shell around that same atom and
   * spiral onto its surface — the hub dive copied onto the upcoming peripheral
   * atom. Loop, sizing, fades and accent are identical; only the target and the
   * row block differ. Centre and radius are live (compact layout moves/shrinks
   * peripheral atoms), so the caller writes them every frame.
   */
  setAtomDive(
    center: { x: number; y: number; z: number } | null,
    radius: number,
    active: boolean,
  ): void {
    const uniforms = this.material.uniforms;
    uniforms.uDiveGate!.value = active && center ? 1 : 0;
    if (!center) return;
    const diveFrom = uniforms.uDiveFrom!.value as number[];
    diveFrom[0] = center.x;
    diveFrom[1] = center.y;
    diveFrom[2] = center.z;
    uniforms.uDiveOuter!.value = radius * FALL_OUTER_RADIUS;
    uniforms.uDiveInner!.value = radius * FALL_INNER_RADIUS;
  }

  /**
   * Link state is a uniform only. `aLink` rows are authored once with
   * golden-ratio lanes.
   */
  setActive(active: boolean): void {
    this.material.uniforms.uLinkMix!.value = active ? 1 : 0;
  }

  /**
   * Hard gate for the stream rows. `setActive` only dims them to the idle
   * residue that keeps the home field alive; a frozen route must draw none of
   * them, otherwise the last target's stream keeps flying at a stale atom.
   */
  setStreamEnabled(enabled: boolean): void {
    this.material.uniforms.uStreamGate!.value = enabled ? 1 : 0;
  }

  /** LOW freezes the ambient shell; the bond stream never relies on this. */
  setDrift(enabled: boolean): void {
    this.material.uniforms.uDrift!.value = enabled ? 1 : 0;
  }

  /**
   * Stream lifecycle: the caller restarts its local clock at 0, so every
   * stream point is born at its start (hub mouth or dive shell) in the same
   * frame. Nothing is left "paused" mid-trajectory from the previous target.
   * The ambient shell runs on its own monotonic clock and is untouched here.
   */
  restartStream(): void {
    this.material.uniforms.uTime!.value = 0;
  }

  /** Per-frame toggle when a stream is disabled for a while. */
  setEnabled(enabled: boolean): void {
    this.object.visible =
      enabled && this.count > 0 &&
      (this.material.uniforms.uOpacity!.value as number) > 0.005;
  }

  resize(pixelRatio: number): void {
    this.material.uniforms.uPixelRatio!.value = pixelRatio;
  }

  /**
   * @param streamTime  clock of the bond stream; restarts on a target change
   * @param ambientTime monotonic scene clock for the ambient shell drift
   * @param boot        0..1 home-boot spawn of the ambient shell (1 = live)
   */
  update(
    streamTime: number,
    ambientTime: number,
    opacity: number,
    boot = 1,
  ): void {
    const uniforms = this.material.uniforms;
    uniforms.uTime!.value = streamTime;
    uniforms.uAmbientTime!.value = ambientTime;
    uniforms.uOpacity!.value = opacity;
    uniforms.uBoot!.value = boot;
    this.syncVisibility();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private syncVisibility(): void {
    this.object.visible =
      this.count > 0 &&
      (this.material.uniforms.uOpacity!.value as number) > 0.005;
  }
}
