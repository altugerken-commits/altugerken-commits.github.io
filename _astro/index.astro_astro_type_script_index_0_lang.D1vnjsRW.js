const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["_astro/OrbitControls.BjX4jlWr.js","_astro/three.module.DXsC02Ky.js"])))=>i.map(i=>d[i]);
import{o as e,r as t,t as n}from"./loop.b42_oZ99.js";import{t as r}from"./preload-helper.CxFQXtKk.js";import{i,n as a,r as o,t as s}from"./detail.CU7lUrK-.js";function c(e,t,n={}){let r=n.tone??1,i=new Map,a=[],o=0,s=e=>{if(!e)return e;if(i.has(e))return i.get(e);if(e.isMeshLambertMaterial||e.isMeshBasicMaterial)return i.set(e,e),e;let n=new t.MeshLambertMaterial({name:e.name,color:e.color?e.color.clone():new t.Color(16777215),map:e.map??null,transparent:e.transparent??!1,opacity:e.opacity??1,side:e.side,vertexColors:e.vertexColors??!1,emissive:e.emissive?e.emissive.clone():new t.Color(0)});return r!==1&&n.color.multiplyScalar(r),n.transparent=!1,n.opacity=1,n.depthWrite=!0,n.depthTest=!0,n.alphaTest=0,n.envMap=null,n.needsUpdate=!0,i.set(e,n),a.push(e.name||`(unnamed)`),o++,n};return e.traverse(e=>{!e.isMesh||!e.material||(e.material=Array.isArray(e.material)?e.material.map(s):s(e.material))}),{materials:i.size,names:a,converted:o}}var l=[{id:`nomad`,url:`/models/nomad-brewer.opt.glb`,anchor:`[data-product="nomad"]`,fill:.82,restY:-.55,spin:1.15,fixRotX:Math.PI},{id:`shifu`,url:`/models/shifu-26-bodywork.opt.glb`,anchor:`[data-product="shifu"]`,fill:.92,restY:.62,spin:-1.05}],u=.052,d=.055,f=6,p=Math.PI*.62,m=-.75,h=5.4,g=4.2,_=4.6,v=2.6;function y(e,t,n,r){let i=t.position.z,a=2*Math.tan(t.fov*Math.PI/180/2)*i,o=a*t.aspect,s=e.left+e.width/2,c=e.top+e.height/2,l=s/n*2-1,u=-(c/r*2-1);return{x:l*o/2,y:u*a/2,w:e.width/n*o,h:e.height/r*a}}async function b(r){let{THREE:i,scene:a,camera:o,renderer:b,pointer:x,loadGLB:S,lights:C}=r,w=matchMedia(`(prefers-reduced-motion: reduce)`).matches,T=matchMedia(`(hover: hover) and (pointer: fine)`).matches,E=[];for(let e of l){let{gltf:t,meshes:n,triangles:r}=await S(e.url),o=new i.Group;e.fixRotX&&(t.scene.rotation.x=e.fixRotX),o.add(t.scene);let s=new i.Box3().setFromObject(o),l=new i.Vector3,u=new i.Vector3;s.getSize(l),s.getCenter(u),t.scene.position.sub(u),c(t.scene,i);let d=new i.Group;d.add(o),d.visible=!1,a.add(d),E.push({spec:e,group:d,pivot:o,el:document.querySelector(e.anchor),size:{x:l.x,y:l.y,z:l.z},yaw:e.restY,tiltX:0,tiltY:0,info:{meshes:n,triangles:r}})}let D=e=>((!e.el||!e.el.isConnected)&&(e.el=document.querySelector(e.spec.anchor)),e.el),O=m;return{slots:E,stop:t((t,i)=>{let a=r.size?.w||b.domElement.clientWidth||1,c=r.size?.h||b.domElement.clientHeight||1,l=s.progress>.001;if(C?.key){let t=l?m+p*(.5+x.x*.45):m+p*e.progress;O=n(O,t,3.2,i),C.key.position.set(Math.sin(O)*h,g,Math.cos(O)*h),C.rim.position.set(Math.sin(O+Math.PI*.85)*_,v,Math.cos(O+Math.PI*.85)*_)}for(let e of E){let r=D(e);if(!r){e.group.visible=!1;continue}let p=r.getBoundingClientRect(),m=p.bottom>-c*.5&&p.top<c*1.5&&p.width>0&&p.height>0,h=l&&s.stopId===e.spec.id;if(l&&!h){e.group.visible=!1;continue}if(e.group.visible=m||h,e.group.visible&&!h){let r=y(p,o,a,c),s=r.w/Math.max(1e-6,e.size.x),l=r.h/Math.max(1e-6,e.size.y),m=Math.min(s,l)*e.spec.fill;e.group.position.set(r.x,r.y,0),e.group.scale.setScalar(m);let h=c+p.height,g=h>0?1-(p.top+p.height)/h:.5,_=e.spec.restY+(g-.5)*e.spec.spin,v=w?0:t*u;e.yaw=n(e.yaw,_+v,f,i),e.pivot.rotation.y=e.yaw,T&&!w&&(e.tiltX=n(e.tiltX,-x.y*d,f,i),e.tiltY=n(e.tiltY,x.x*d,f,i),e.pivot.rotation.x=e.tiltX,e.pivot.rotation.z=e.tiltY*.4)}}}),slotOf:e=>E.find(t=>t.spec.id===e)??null,info:Object.fromEntries(E.map(e=>[e.spec.id,e.info]))}}var x=matchMedia(`(pointer: coarse)`).matches?210:420,S={x:17,y:11,z:9};function C(e){let{THREE:n,scene:r,lights:i}=e,a=matchMedia(`(prefers-reduced-motion: reduce)`).matches,o=new Float32Array(x*3),c=new Float32Array(x),l=new Float32Array(x);for(let e=0;e<x;e++)o[e*3+0]=(Math.random()-.5)*S.x,o[e*3+1]=(Math.random()-.5)*S.y,o[e*3+2]=(Math.random()-.5)*S.z,c[e]=Math.random()*100,l[e]=Math.random()**3*.85+.15;let u=new n.BufferGeometry;u.setAttribute(`position`,new n.BufferAttribute(o,3)),u.setAttribute(`aSeed`,new n.BufferAttribute(c,1)),u.setAttribute(`aScale`,new n.BufferAttribute(l,1));let d={uTime:{value:0},uLightDir:{value:new n.Vector3(-.4,.7,.6)},uFade:{value:1},uPixelRatio:{value:Math.min(devicePixelRatio,2)},uWarm:{value:new n.Color(16767400)},uCool:{value:new n.Color(10466512)},uSpanY:{value:S.y}},f=new n.ShaderMaterial({uniforms:d,transparent:!0,depthWrite:!1,depthTest:!0,blending:n.AdditiveBlending,vertexShader:`
      attribute float aSeed;
      attribute float aScale;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSpanY;
      uniform vec3 uLightDir;
      varying float vLit;
      varying float vAlpha;

      void main() {
        vec3 p = position;

        // Slow convection: a steady rise plus a lazy lateral wander, each mote
        // on its own phase. Wrapped with mod so the field never empties.
        float rise = uTime * 0.055 + aSeed;
        p.y = mod(p.y + rise + uSpanY * 0.5, uSpanY) - uSpanY * 0.5;
        p.x += sin(uTime * 0.18 + aSeed * 6.2) * 0.42;
        p.z += cos(uTime * 0.14 + aSeed * 4.7) * 0.32;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);

        // How much this mote faces the key light. normalize guards against a
        // zero-length direction on the first frame before the orbit has run.
        vec3 toLight = normalize(uLightDir);
        vLit = clamp(dot(normalize(p), toLight) * 0.5 + 0.5, 0.0, 1.0);

        // Fade motes that drift close to the camera. A mote at 1 unit fills a
        // large part of the frame and reads as a smudge on the lens.
        vAlpha = smoothstep(1.5, 5.0, -mv.z);

        gl_Position = projectionMatrix * mv;
        gl_PointSize = aScale * 26.0 * uPixelRatio / max(0.001, -mv.z);
      }
    `,fragmentShader:`
      precision highp float;
      uniform vec3 uWarm;
      uniform vec3 uCool;
      uniform float uFade;
      varying float vLit;
      varying float vAlpha;

      void main() {
        // Round, soft-edged point. NO discard: on the tile-based GPUs every
        // phone uses, a discard disables early-Z for the whole tile and forces
        // a slower fragment path — and with additive blending it buys nothing,
        // because a fragment at alpha 0 already contributes nothing. The
        // smoothstep reaches 0 at the disc edge, so the sprite corners are
        // transparent rather than cut away.
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        float core = 1.0 - smoothstep(0.0, 0.5, r);

        // Warm where the light hits, cool where it does not — the same
        // warm-core/cool-falloff rule the CSS glow tokens follow.
        vec3 tint = mix(uCool, uWarm, vLit);

        // The lit side is several times brighter than the unlit side. This is
        // the whole point: as the key swings with scroll, the flare travels
        // across the field.
        float lit = 0.12 + pow(vLit, 2.2) * 0.88;

        gl_FragColor = vec4(tint, core * lit * vAlpha * 0.55 * uFade);
      }
    `}),p=new n.Points(u,f);return p.frustumCulled=!1,p.renderOrder=-10,r.add(p),{points:p,uniforms:d,stop:t(e=>{d.uTime.value=a?0:e,i?.key&&d.uLightDir.value.copy(i.key.position).normalize(),d.uFade.value=1-s.progress}),count:x}}var w=1.3,T=9,E=.55,D=2.1;async function O(e,i){let{camera:a,renderer:o}=e,{OrbitControls:c}=await r(async()=>{let{OrbitControls:e}=await import(`./OrbitControls.BjX4jlWr.js`);return{OrbitControls:e}},__vite__mapDeps([0,1])),l=new c(a,o.domElement);l.enabled=!1,l.enableDamping=!0,l.dampingFactor=.075,l.enablePan=!1,l.rotateSpeed=.85,l.zoomSpeed=.8,l.minPolarAngle=.12,l.maxPolarAngle=Math.PI-.12;let u=a.position.clone(),d=a.fov,f=12,p=!1,m=e=>{let t=a.fov*Math.PI/180/2,n=a.aspect||1.6,r=e.size.y/2/Math.tan(t),i=e.size.x/2/(Math.tan(t)*n);return Math.max(r,i)*w+e.size.z/2};return t((e,t)=>{let r=s.progress,o=s.stopId?i.slotOf(s.stopId):null;if(!o||r<=.001){p&&(l.enabled=!1,p=!1,a.position.copy(u),a.fov=d,a.updateProjectionMatrix(),a.lookAt(0,0,0));return}p||(p=!0,f=m(o),l.target.set(0,0,0),l.minDistance=f*E,l.maxDistance=f*D);let c=s.mode===`active`;if(l.enabled!==c&&(l.enabled=c,c&&l.update()),c)o.group.position.set(0,0,0),o.group.scale.setScalar(1),l.update();else{let e=o;e.group.position.set(n(e.group.position.x,0,T,t),n(e.group.position.y,0,T,t),n(e.group.position.z,0,T,t)),e.group.scale.setScalar(n(e.group.scale.x,1,T,t));let i=u.z+(f-u.z)*r;a.position.set(n(a.position.x,0,T,t),n(a.position.y,0,T,t),i),a.lookAt(0,0,0)}}),{controls:l,framingOf:e=>{let t=i.slotOf(e);return t?m(t):null}}}var k=matchMedia(`(prefers-reduced-motion: reduce)`).matches,A=document.querySelectorAll(`[data-reveal]`);if(A.length){let e=e=>{let t=getComputedStyle(e),n=e=>Math.max(...e.split(`,`).map(e=>parseFloat(e)*(e.includes(`ms`)?1:1e3)),0),r=n(t.transitionDuration)+n(t.transitionDelay)+120;setTimeout(()=>{e.removeAttribute(`data-reveal`),e.classList.remove(`is-in`)},r)},t=new IntersectionObserver(n=>{for(let r of n){if(!r.isIntersecting)continue;let n=r.target;n.classList.add(`is-in`),t.unobserve(n),e(n)}},{rootMargin:`0px 0px -12% 0px`,threshold:.1});for(let e of A)t.observe(e)}var j=[`work`,`about`,`contact`].map(e=>document.getElementById(e)).filter(Boolean),M=new Map;for(let e of document.querySelectorAll(`[data-navlink]`))M.set(e.dataset.navlink,e);if(j.length){let e=new IntersectionObserver(e=>{for(let t of e){let e=M.get(t.target.id);if(e&&t.isIntersecting){for(let e of M.values())e.removeAttribute(`data-active`);e.setAttribute(`data-active`,``)}}},{rootMargin:`-45% 0px -45% 0px`});for(let t of j)e.observe(t)}for(let e of document.querySelectorAll(`a[href^="#"]`))e.addEventListener(`click`,t=>{let n=e.getAttribute(`href`).slice(1),r=document.getElementById(n),i=window.__lenis;!r||!i||(t.preventDefault(),i.scrollTo(r,{offset:0,duration:k?0:1.1}),history.replaceState(null,``,`#${n}`))});var N=document.querySelector(`[data-words]`),P=[];if(N&&!k){for(let e of Array.from(N.querySelectorAll(`p`))){let t=(e.textContent??``).split(/\s+/).filter(Boolean);e.replaceChildren(...t.flatMap((e,n)=>{let r=document.createElement(`span`);return r.textContent=e,n<t.length-1?[r,document.createTextNode(` `)]:[r]}))}P=Array.from(N.querySelectorAll(`span`))}if(matchMedia(`(hover: hover) and (pointer: fine)`).matches)for(let e of document.querySelectorAll(`.spot`))e.addEventListener(`pointermove`,t=>{let n=e.getBoundingClientRect();e.style.setProperty(`--mx`,`${(t.clientX-n.left)/n.width*100}%`),e.style.setProperty(`--my`,`${(t.clientY-n.top)/n.height*100}%`)},{passive:!0});var F={nomad:{title:`Nomad Brewer`,body:[`The body separates into stacked components that travel nested and assemble by feel. Each joint is a twist-lock — a quarter turn seats and seals it.`,`Dark matte ceramic for the structure, frosted glass for the vessels, so the brew level stays readable without opening anything.`]},shifu:{title:`Shifu 26`,body:[`Formula Student bodywork for Ozu Racing: carbon fibre skins over a steel spaceframe, developed in the composites and aerodynamics sub-team.`,`1,498 CAD bodies consolidated by material into carbon, steel and enamel, then decimated for the web without altering a single material definition.`]}},I=document.querySelector(`[data-detail]`),L=document.querySelector(`[data-detail-title]`),R=document.querySelector(`[data-detail-body]`),z=e=>{let t=F[e];!t||!L||!R||(L.textContent=t.title,R.replaceChildren(...t.body.map(e=>{let t=document.createElement(`p`);return t.textContent=e,t})))};i(e=>{I&&(e.mode===`active`?(I.hidden=!1,I.offsetHeight,I.classList.add(`is-open`)):(I.classList.remove(`is-open`),e.mode===`idle`&&setTimeout(()=>{s.mode===`idle`&&(I.hidden=!0)},420)))});for(let e of document.querySelectorAll(`[data-inspect]`))e.addEventListener(`click`,()=>{let t=e.dataset.inspect;t&&(z(t),a(t))});document.querySelector(`[data-detail-back]`)?.addEventListener(`click`,()=>o()),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&s.mode===`active`&&o()});var B=async()=>{let e=window.__scene;if(!(!e||window.__studio))try{let n=await b(e);window.__studio=n;let r=C(e);window.__motes=r;let i=await O(e,n);window.__inspect=i;let a=[document.querySelector(`.hero`),document.querySelector(`.work`),document.querySelector(`#about`),document.querySelector(`#contact`),document.querySelector(`.footer`),document.querySelector(`.nav`)].filter(Boolean),o=document.querySelector(`main.layer`);t(()=>{let e=P.length&&N?N.getBoundingClientRect():null,t=window.innerHeight||1,n=(1-s.progress)**2;for(let e of a)e.style.opacity=String(n),e.style.pointerEvents=n<.05?`none`:``;if(o&&(o.style.pointerEvents=s.progress>.02?`none`:``),e){let n=e,r=t*.78,i=-n.height+t*.32,a=Math.max(0,Math.min(1,(r-n.top)/Math.max(1,r-i))),o=P.length,s=a*(o+12)-6;for(let e=0;e<o;e++){let t=Math.max(.18,Math.min(1,.18+(s-e)/8));P[e].style.opacity=t.toFixed(3)}}})}catch(e){console.error(`[studio]`,e)}};document.addEventListener(`stage:ready`,B),window.__scene?.ready&&B();