import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { rk4Step } from '../../math/rk4.js';

const vertexShader = `
attribute float aProgress; uniform float uTime; uniform float uScale; uniform float uAudio;
varying float vProgress; varying float vPulse;
void main(){vec3 p=position*uScale;float head=fract(uTime*.035);float d=abs(aProgress-head);d=min(d,1.-d);vPulse=exp(-d*d*1500.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp((1.6+vPulse*6.+uAudio*5.)*(3./-mv.z),1.,12.);gl_Position=projectionMatrix*mv;vProgress=aProgress;}`;
const fragmentShader = `
uniform vec3 uA;uniform vec3 uB;varying float vProgress;varying float vPulse;
void main(){vec2 q=gl_PointCoord-.5;float a=1.-smoothstep(.08,.5,length(q));vec3 c=mix(uA,uB,.5+.5*sin(vProgress*31.416));c+=vPulse*.8;gl_FragColor=vec4(c,a*(.22+vPulse*.75));}`;

function finite(point){return point.length>=3&&point.slice(0,3).every(Number.isFinite);}

export function createEquationStudy(runtime, config){
  const {THREE,reducedMotion}=runtime;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x01030a);
  const camera=new THREE.PerspectiveCamera(48,1,.01,100);camera.position.set(3.3,2.1,5.4);
  const controls=new OrbitControls(camera,runtime.canvas);controls.enableDamping=true;controls.enablePan=false;controls.zoomToCursor=true;controls.autoRotate=!reducedMotion;controls.autoRotateSpeed=.32;controls.minDistance=2;controls.maxDistance=11;controls.saveState();
  const count=window.matchMedia('(pointer: coarse)').matches?9000:22000;
  const positions=new Float32Array(count*3),progress=new Float32Array(count);
  let state=[...config.initial],time=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const raw=[];
  for(let i=0;i<count+1800;i++){
    state=config.kind==='map'?config.iterate(state):rk4Step(state,time,config.dt,config.derivative);time+=config.dt;
    const p=(config.project?config.project(state):state).slice(0,3);
    if(i>=1800&&finite(p)){raw.push(p);for(let j=0;j<3;j++){min[j]=Math.min(min[j],p[j]);max[j]=Math.max(max[j],p[j]);}}
    if(!state.every(Number.isFinite)){state=[...config.initial];time=0;}
  }
  const center=min.map((v,i)=>(v+max[i])/2),span=Math.max(...max.map((v,i)=>Math.max(v-min[i],1e-5)));
  raw.slice(0,count).forEach((p,i)=>{for(let j=0;j<3;j++)positions[i*3+j]=(p[j]-center[j])/span*3*(config.scale?.[j]??1);progress[i]=i/(count-1);});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aProgress',new THREE.BufferAttribute(progress,1));
  const uniforms={uTime:{value:0},uScale:{value:1},uAudio:{value:0},uA:{value:new THREE.Color(config.palette[0])},uB:{value:new THREE.Color(config.palette[1])}};
  const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
  const lineMaterial=new THREE.LineBasicMaterial({color:config.palette[0],transparent:true,opacity:.11,blending:THREE.AdditiveBlending});const line=new THREE.Line(geometry,lineMaterial);scene.add(line);
  const composer=new EffectComposer(runtime.renderer);composer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.08,.2,.83);composer.addPass(bloom);composer.addPass(new OutputPass());
  const stateControls={speed:.08,scale:1,glow:1.3,paletteA:config.palette[0],paletteB:config.palette[1],background:0x01030a};
  return {equation:config.equation,update({time,audio,delta}){uniforms.uTime.value=time*Math.max(.2,stateControls.speed*12);uniforms.uAudio.value=audio.rms??0;points.rotation.y=time*.035;line.rotation.y=points.rotation.y;bloom.strength=.045*stateControls.glow+(audio.rms??0)*.08;controls.update(delta);},resize({width,height}){camera.aspect=width/height;camera.updateProjectionMatrix();composer.setSize(width,height);},render(){composer.render();},getControls(){return {...stateControls,paletteA:`#${uniforms.uA.value.getHexString()}`,paletteB:`#${uniforms.uB.value.getHexString()}`,background:`#${scene.background.getHexString()}`};},setControls(n){if(Number.isFinite(n.speed))stateControls.speed=n.speed;if(Number.isFinite(n.scale)){stateControls.scale=n.scale;uniforms.uScale.value=n.scale;}if(Number.isFinite(n.glow))stateControls.glow=n.glow;if(n.paletteA)uniforms.uA.value.set(n.paletteA);if(n.paletteB)uniforms.uB.value.set(n.paletteB);if(n.background)scene.background.set(n.background);},resetView(){controls.reset();},dispose(){controls.dispose();composer.dispose();geometry.dispose();material.dispose();lineMaterial.dispose();scene.clear();}};
}
