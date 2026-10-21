import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  type BufferGeometry,
} from 'three';
import type { Atom } from '../Atom';
import { ACCENT_LIGHT_COLOR } from '../sceneColors';

const RIM_SCALE = 1.035;
const RIM_POWER = 2.6;

const vertexShader = /* glsl */ `
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;

  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    float fresnel = pow(
      1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))),
      uPower
    );
    gl_FragColor = vec4(uColor, fresnel * uIntensity);
    #include <colorspace_fragment>
  }
`;

/**
 * Back-side fresnel shell: a thin lit edge outside the atom silhouette.
 * One additive mesh per atom, no postprocessing, no lights.
 */
export class AtomRim {
  private readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly atom: Atom;
  private enabled = true;
  private intensity = 0;

  constructor(atom: Atom, geometry: BufferGeometry, enabled: boolean) {
    this.atom = atom;
    this.enabled = enabled;

    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(ACCENT_LIGHT_COLOR) },
        uIntensity: { value: 0 },
        uPower: { value: RIM_POWER },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      side: BackSide,
      toneMapped: false,
    });

    this.mesh = new Mesh(geometry, this.material);
    this.mesh.name = `atom-rim-${atom.id}`;
    this.mesh.scale.setScalar(atom.radius * RIM_SCALE);
    this.mesh.raycast = () => {};
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
    atom.object.add(this.mesh);
  }

  applyQuality(geometry: BufferGeometry, enabled: boolean): void {
    this.enabled = enabled;
    this.mesh.geometry = geometry;
    this.mesh.visible = enabled && this.intensity > 0.002;
  }

  setRadius(radius: number): void {
    this.mesh.scale.setScalar(radius * RIM_SCALE);
  }

  setIntensity(value: number): void {
    this.intensity = value;
    this.material.uniforms.uIntensity!.value = value;
    this.mesh.visible = this.enabled && value > 0.002;
  }

  dispose(): void {
    this.atom.object.remove(this.mesh);
    this.material.dispose();
  }
}
