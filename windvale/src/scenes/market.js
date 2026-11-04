import {CanvasTexture,Color,Fog,MeshBasicMaterial,PlaneGeometry,IcosahedronGeometry,SRGBColorSpace} from 'three';

export function createMarket({scene,obstacles,clouds,box,cyl,mesh,mat,wood,wall,leaf,stone,path}){
  for(const object of scene.children)if(!object.isLight)object.visible=false;
  obstacles.length=0;clouds.length=0;
  scene.background=new Color('#cee0ce');scene.fog=new Fog('#cee0ce',35,100);
  const dirt=mat('#a6b77a'),red=mat('#bd6f58'),cream=mat('#f5dfaa');
  box(55,.16,55,dirt,0,-.12,2);
  box(8,.04,42,path,0,0,5);box(34,.045,7,path,0,.01,9);
  function label(text,x,y,z,width=3){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#39594b';ctx.fillRect(0,0,768,192);
    ctx.fillStyle='#fff1d0';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='48px Georgia';ctx.fillText(text,384,96);
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
    mesh(new PlaneGeometry(width,width/4),new MeshBasicMaterial({map:texture}),x,y,z);
  }
  // The entrance frames the farmer without blocking the walking route.
  for(const x of [-4.5,4.5])box(.28,4.4,.28,wood,x,2.2,21);
  box(9.4,.8,.35,wood,0,4.15,21);label('WINDVALE MARKET',0,4.18,21.2,8.4);
  function stall(x,z,color,title){
    box(4.8,.9,1.8,wood,x,.45,z);box(5,.16,2,wall,x,.98,z);
    for(const dx of [-2.25,2.25])for(const dz of [-.8,.8])box(.12,3.1,.12,wood,x+dx,1.55,z+dz);
    for(let stripe=0;stripe<8;stripe++)box(.68,.15,3,stripe%2?cream:color,x-2.38+stripe*.68,3.15,z);
    label(title,x,2.55,z+1,3.5);
    for(let bin=0;bin<3;bin++){
      const bx=x-1.55+bin*1.55;
      box(1.3,.12,1.35,wood,bx,1.12,z);for(const dx of [-.65,.65])box(.08,.3,1.35,wood,bx+dx,1.26,z);
      for(let a=0;a<3;a++)for(let b=0;b<3;b++)mesh(new IcosahedronGeometry(.18,1),[mat('#bb5746'),mat('#e6bb58'),mat('#799352')][bin],bx-.4+a*.4,1.35,z-.4+b*.4);
    }
    // Overlapping footprints keep the player outside the long counters.
    for(const dx of [-1.6,0,1.6])obstacles.push({x:x+dx,z,r:1.15});
  }
  stall(-7,10,red,'OLIVER · FRESH FRUIT');stall(7,6,mat('#73977d'),'GARDEN GREENS');
  stall(-7,-1,mat('#bda46e'),'BREAD & HONEY');
  for(const x of [-13,13])for(const z of [-9,1,15]){
    cyl(.2,.28,2.2,wood,x,1.1,z);mesh(new IcosahedronGeometry(1.7,1),leaf,x,3,z);obstacles.push({x,z,r:.6});
  }
  for(const z of [-10,-7,-4,0,3,6]){box(5,.1,1.4,mat('#887255'),11,.04,z);for(let i=0;i<6;i++)mesh(new IcosahedronGeometry(.25),leaf,9+i*.75,.3,z);}
  for(const x of [-16,16]){box(.18,1.4,35,wood,x,.7,4);for(const z of [-13,-6,1,8,15,21])cyl(.12,.15,1.8,wood,x,.9,z);}
  box(4,.15,.7,wood,7,.65,16);box(4,.6,.12,wood,7,1,15.7);for(const x of [5.5,8.5])box(.15,.65,.6,wood,x,.32,16);
  obstacles.push({x:7,z:16,r:2});
  cyl(.7,.8,.85,stone,4,.43,-7);
}
