export const equationStudies = {
  a131: {
    title: 'Rössler Continuous Chaos', equation: 'ẋ = −y − z; ẏ = x + 0.2y; ż = 0.2 + z(x − 5.7)',
    kind: 'flow', initial: [0.1, 0, 0], dt: 0.012, scale: [1, 1, .72], palette: [0x42e8ff, 0xb25cff],
    derivative: ([x,y,z]) => [-y-z, x+.2*y, .2+z*(x-5.7)]
  },
  a132: {
    title: 'Duffing Phase Loom', equation: 'ẍ + 0.2ẋ − x + x³ = 0.3 cos(1.2t)',
    kind: 'flow', initial: [0.2, 0, 0], dt: 0.012, scale: [1.2, 1.2, .22], palette: [0xffbf69, 0xff4fa3],
    derivative: ([x,v,t]) => [v, -.2*v+x-x*x*x+.3*Math.cos(1.2*t), 1]
  },
  a133: {
    title: 'Chua Double Scroll', equation: 'ẋ = 15.6(y − x − h(x)); ẏ = x − y + z; ż = −28y',
    kind: 'flow', initial: [0.1, 0, 0], dt: 0.004, scale: [1,1,.55], palette: [0x5fffe0, 0xff5bd7],
    derivative: ([x,y,z]) => { const h=-.714*x+.5*(-1.143+.714)*(Math.abs(x+1)-Math.abs(x-1)); return [15.6*(y-x-h),x-y+z,-28*y]; }
  },
  a134: {
    title: 'Hénon–Heiles Hamiltonian', equation: 'H = ½(pₓ²+pᵧ²+x²+y²) + x²y − y³/3',
    kind: 'flow', initial: [0, .1, .42, 0], dt: 0.009, scale: [2.7,2.7,1.8], palette: [0x66b7ff, 0xffd76a],
    derivative: ([x,y,px,py]) => [px,py,-x-2*x*y,-y-x*x+y*y], project: ([x,y,px]) => [x,y,px]
  },
  a135: {
    title: 'Double Pendulum State Weave', equation: 'δ=a−b; ä=[−3sin a−sin(a−2b)−2sinδ(v²+u²cosδ)]/[3−cos(2δ)]; b̈=2sinδ[2u²+2cos a+v²cosδ]/[3−cos(2δ)]',
    kind: 'flow', initial: [2.1, 1.1, 0, 0], dt: 0.006, scale: [1.05,1.05,.75], palette: [0x35dbff, 0xff6b7a],
    derivative: ([a,b,u,v]) => { const d=a-b, den=3-Math.cos(2*d); return [u,v,(-3*Math.sin(a)-Math.sin(a-2*b)-2*Math.sin(d)*(v*v+u*u*Math.cos(d)))/den,(2*Math.sin(d)*(2*u*u+2*Math.cos(a)+v*v*Math.cos(d)))/den]; },
    project: ([a,b,u]) => [Math.sin(a)+Math.sin(b),-Math.cos(a)-Math.cos(b),u*.22]
  },
  a136: {
    title: 'Ikeda Optical Cavity Map', equation: 'zₙ₊₁ = 1 + 0.9zₙ exp[i(0.4 − 6/(1+|zₙ|²))]',
    kind: 'map', initial: [.1,.1,0], dt: 1, scale: [1.2,1.2,.7], palette: [0x4fffd2, 0x617cff],
    iterate: ([x,y,n]) => { const t=.4-6/(1+x*x+y*y); return [1+.9*(x*Math.cos(t)-y*Math.sin(t)),.9*(x*Math.sin(t)+y*Math.cos(t)),n+1]; },
    project: ([x,y,n]) => [x,y,Math.sin(n*.017)*.35]
  },
  a137: {
    title: 'Hénon Strange Attractor', equation: 'xₙ₊₁ = 1 − 1.4xₙ² + yₙ; yₙ₊₁ = 0.3xₙ',
    kind: 'map', initial: [.1,.1,0], dt: 1, scale: [1.35,2.4,.8], palette: [0xffd85d, 0xff557e],
    iterate: ([x,y,n]) => [1-1.4*x*x+y,.3*x,n+1], project: ([x,y,n]) => [x,y,Math.sin(n*.011)*.18]
  },
  a138: {
    title: 'Lorenz–96 Weather Ring', equation: 'Ẋᵢ = (Xᵢ₊₁ − Xᵢ₋₂)Xᵢ₋₁ − Xᵢ + 8',
    kind: 'flow', initial: Array.from({length:12},(_,i)=>i===0?8.01:8), dt: .008, scale: [1,1,1], palette: [0x4ad6ff, 0x9b5cff],
    derivative: x => x.map((v,i)=>(x[(i+1)%x.length]-x[(i+x.length-2)%x.length])*x[(i+x.length-1)%x.length]-v+8),
    project: x => [x[0]-8,x[4]-8,x[8]-8]
  },
  a139: {
    title: 'Thomas Cyclic Labyrinth', equation: 'ẋ = sin(y) − 0.208186x; cyclic permutations',
    kind: 'flow', initial: [.1,.2,.3], dt: .035, scale: [.65,.65,.65], palette: [0x50ffc8, 0xe45cff],
    derivative: ([x,y,z]) => [Math.sin(y)-.208186*x,Math.sin(z)-.208186*y,Math.sin(x)-.208186*z]
  },
  a140: {
    title: 'Kuramoto Synchronisation Field', equation: 'θ̇ᵢ = ωᵢ + (K/N)Σⱼ sin(θⱼ − θᵢ)',
    kind: 'flow', initial: Array.from({length:24},(_,i)=>i/24*Math.PI*2+.38*Math.sin(i*1.73)), dt: .025, scale: [1.2,1.2,1.1], palette: [0x44ddff, 0xff74c8],
    derivative: q => q.map((theta,i)=>{let coupling=0;for(const other of q)coupling+=Math.sin(other-theta);return (i-11.5)/18+.65*coupling/q.length;}),
    project: q => {let cx=0,sy=0;for(const t of q){cx+=Math.cos(t);sy+=Math.sin(t);}const r=Math.hypot(cx,sy)/q.length;return [Math.cos(q[0])*(.45+r),Math.sin(q[0])*(.45+r),(r-.5)*1.8];}
  }
};
