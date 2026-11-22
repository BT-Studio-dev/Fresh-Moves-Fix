// Lightweight software renderer adapted from the site’s own skin thumbnail maker.
window.drawPfp3d = function (ctx, skin, options) {
    var pixels=skin.getImageData(0,0,64,64).data, slim=options.slim, aw=slim?3:4, ax=slim?5.5:6;
    var yaw=options.yaw*Math.PI/180, pitch=options.pitch*Math.PI/180;
    var cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch), quads=[];
    var piv={head:[0,24],body:[0,24],ra:[-5,22],la:[5,22],rl:[-2,12],ll:[2,12]};
    var parts=[['head',0,0,8,8,8,0,28,0],['body',16,16,8,12,4,0,18,0],['ra',40,16,aw,12,4,-ax,18,0],['la',32,48,aw,12,4,ax,18,0],['rl',0,16,4,12,4,-2,6,0],['ll',16,48,4,12,4,2,6,0]];
    var layers=[[32,0],[16,32],[40,32],[48,48],[0,32],[0,48]];
    function point(name,x,y,z){
      // Rotate the lower limb as a volume, blending into the upper limb near
      // the joint. Rotating depth as well as height avoids flattened, pointed ends.
      var bend=options.bends && options.bends[name], hinge=(name==='ra'||name==='la')?18:(name==='rl'||name==='ll')?6:null;
      if (bend && hinge !== null && y < hinge) {
        var dy=y-hinge, blend=Math.min(1,-dy/2), ba=bend*blend*Math.PI/180;
        var by=dy*Math.cos(ba)-z*Math.sin(ba), bz=dy*Math.sin(ba)+z*Math.cos(ba);
        y=hinge+by; z=bz;
      }
      var pv=piv[name], part=options.rotations && options.rotations[name] || {};
      var X=x-pv[0], Y=y-pv[1], Z=z;
      var rx=(part.x||0)*Math.PI/180, ry=(part.y||0)*Math.PI/180;
      var yx=Y*Math.cos(rx)-Z*Math.sin(rx), zx=Y*Math.sin(rx)+Z*Math.cos(rx); Y=yx; Z=zx;
      var xy=X*Math.cos(ry)+Z*Math.sin(ry); Z=-X*Math.sin(ry)+Z*Math.cos(ry); X=xy;
      var a=((options.angles[name] || 0)+(part.z||0))*Math.PI/180, c=Math.cos(a), t=Math.sin(a);
      x=X*c-Y*t+pv[0];y=X*t+Y*c+pv[1];z=Z;
      if (name === 'head') {
        var hy=(options.headYaw || 0)*Math.PI/180, hp=(options.headPitch || 0)*Math.PI/180;
        var yc=Math.cos(hp), ys=Math.sin(hp), hc=Math.cos(hy), hs=Math.sin(hy);
        var localY=y-pv[1], y2=localY*yc-z*ys, z2=localY*ys+z*yc;
        var x2=x*hc+z2*hs; z=-x*hs+z2*hc; x=x2; y=y2+pv[1];
      }
      y-=16+options.centerY;
      var xx=x*cy+z*sy, zz=-x*sy+z*cy, yy=y*cp-zz*sp, depth=y*sp+zz*cp;
      var roll=(options.roll||0)*Math.PI/180, dx=xx, dy=yy;
      xx=dx*Math.cos(roll)-dy*Math.sin(roll); yy=dx*Math.sin(roll)+dy*Math.cos(roll);
      return [256+xx*options.scale+(options.offsetX||0),256-yy*options.scale+(options.offsetY||0),depth];
    }
    parts.forEach(function(p,pi){
      [0,1].forEach(function(layer){
        if(layer && (!options.outer || (options.legacy && (pi===3||pi===5))))return;
        if (options.headOnly && pi !== 0) return;
        var name=p[0],u=layer?layers[pi][0]:p[1],v=layer?layers[pi][1]:p[2],w=p[3],h=p[4],d=p[5],x=p[6],y=p[7],inf=layer?(pi===0?0.5:0.25):0;
        var sx=(w+2*inf)/w,sy2=(h+2*inf)/h,sz=(d+2*inf)/d,top=y+h/2*sy2;
        var rects=[[u+d,v+d,w,h],[u+2*d+w,v+d,w,h],[u,v+d,d,h],[u+d+w,v+d,d,h],[u+d,v,w,d],[u+d+w,v,w,d]];
        var faces=[function(i,j){return [x+(-w/2+i)*sx,top-j*sy2,d/2*sz]},function(i,j){return [x+(w/2-i)*sx,top-j*sy2,-d/2*sz]},function(i,j){return [x-w/2*sx,top-j*sy2,(-d/2+i)*sz]},function(i,j){return [x+w/2*sx,top-j*sy2,(d/2-i)*sz]},function(i,j){return [x+(-w/2+i)*sx,top,(-d/2+j)*sz]},function(i,j){return [x+(-w/2+i)*sx,top-h*sy2,(-d/2+j)*sz]}];
        faces.forEach(function(fn,fi){
          var r=rects[fi];
          // Bent limbs need separate depth groups for each half of a face.
          var bent=!!(options.bends && options.bends[name]);
          function depthAt(start,end){
            var a=point(name,...fn(0,start)),b=point(name,...fn(r[2],start)),c=point(name,...fn(0,end)),d=point(name,...fn(r[2],end));
            return (a[2]+b[2]+c[2]+d[2])/4;
          }
          var faceDepth=depthAt(0,r[3]), upperDepth=faceDepth, lowerDepth=faceDepth;
          if(bent && fi<4){upperDepth=depthAt(0,6);lowerDepth=depthAt(6,12);}
          var baseShade=fi<2?1:fi<4?0.82:fi===4?1:0.6;
          var shade=(1-(1-baseShade)*(options.shading == null ? 1 : options.shading))*(options.brightness == null ? 1 : options.brightness);
          if(options.lightStrength){
            // Directional face lighting in model coordinates; no expensive shadows.
            var az=(options.lightDirection||0)*Math.PI/180, el=(options.lightHeight||0)*Math.PI/180;
            var lx=Math.sin(az)*Math.cos(el), ly=Math.sin(el), lz=Math.cos(az)*Math.cos(el);
            var normals=[[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]], n=normals[fi];
            var diffuse=Math.max(0,n[0]*lx+n[1]*ly+n[2]*lz);
            shade*=1+options.lightStrength*(diffuse-0.5)*0.8;
          }
          var lightRGB=[255,255,255];
          if(/^#[0-9a-f]{6}$/i.test(options.lightColor||'')){lightRGB=[parseInt(options.lightColor.slice(1,3),16),parseInt(options.lightColor.slice(3,5),16),parseInt(options.lightColor.slice(5,7),16)];}
          function channel(v,index){var tint=1-(options.lightStrength||0)*(1-lightRGB[index]/255)*0.55;return Math.min(255,Math.round(v*shade*tint));}
          for(var j=0;j<r[3];j++)for(var i=0;i<r[2];i++){
            var o=((r[1]+j)*64+r[0]+i)*4;if(!pixels[o+3])continue;
            var q=[point(name,...fn(i,j)),point(name,...fn(i+1,j)),point(name,...fn(i+1,j+1)),point(name,...fn(i,j+1))];
            // A bent face may turn away even when its other half faces forward.
            var cross=(q[1][0]-q[0][0])*(q[3][1]-q[0][1])-(q[1][1]-q[0][1])*(q[3][0]-q[0][0]);
            if(fi===5)cross=-cross;
            if(cross<=0)continue;
            quads.push({z:bent && fi<4 ? (j<6?upperDepth:lowerDepth) : faceDepth,q:q,opaque:pixels[o+3]===255,color:'rgba('+channel(pixels[o],0)+','+channel(pixels[o+1],1)+','+channel(pixels[o+2],2)+','+(pixels[o+3]/255)+')'});
          }
        });
      });
    });
    // Original miniature pixel props, attached to the same arm transforms as the skin.
    var itemArt={
      sword:['......a.','.....aa.','....aa..','...aa...','..aab...','...bc...','..cb....','.c......'],
      pick:['.aaaaaa.','aa...aa.','.....c..','....c...','...c....','..c.....','.c......','c.......'],
      gem:['...dd...','..deed..','.deeeed.','.deeeed.','..deed..','...dd...','........','........'],
      apple:['...c....','..fcc...','.fffff..','fffffff.','fffffff.','.fffff..','..fff...','........'],
      torch:['...ee...','..eae...','...e....','...c....','...c....','...c....','...c....','........'],
      bug:['gggggggg','ghhggghg','gghhhhgg','gggggggg','gghhhhgg','ghhggghg','gggggggg','........'],
      coin:['..iiii..','.ijjjji.','ijijjjji','ijijjjji','ijjjjjji','.ijjjji.','..iiii..','........'],
      berry:['...c....','..kkk...','.ffffff.','ffjffjff','ffffffff','.ffffff.','..ffff..','........'],
      book:['gggggggg','gllllllg','gllllllg','gllggllg','gllllllg','gllllllg','gggggggg','........']
    };
    var itemColors={a:'#aab9c5',b:'#6b7887',c:'#704a2f',d:'#208d9a',e:'#75ece6',f:'#e95646',g:'#30323b',h:'#e65050',i:'#bc8522',j:'#ffe480',k:'#51ac68',l:'#bd9c75'};
    if(!options.headOnly && options.items){
      [['ra',-ax],['la',ax]].forEach(function(hand){
        var item=options.items[hand[0]], pattern=item==='skin-face'?['ssssssss','ssssssss','ssssssss','ssssssss','ssssssss','ssssssss','ssssssss','ssssssss']:itemArt[item];if(!pattern)return;
        var cell=0.65, startX=hand[1]-2.6, startY=14.5, front=2.6;
        var center=point(hand[0],hand[1],12,front), itemDepth=center[2]+0.01;
        pattern.forEach(function(row,j){for(var i=0;i<row.length;i++){
          var color=itemColors[row.charAt(i)];
          if(item==='skin-face') { var pos=((8+j)*64+8+i)*4; if(!pixels[pos+3])continue; color='rgba('+pixels[pos]+','+pixels[pos+1]+','+pixels[pos+2]+','+(pixels[pos+3]/255)+')'; }
          if(!color)continue;
          var px=startX+i*cell,py=startY-j*cell;
          var q=[point(hand[0],px,py,front),point(hand[0],px+cell,py,front),point(hand[0],px+cell,py-cell,front),point(hand[0],px,py-cell,front)];
          quads.push({z:itemDepth,q:q,opaque:item!=='skin-face'||pixels[((8+j)*64+8+i)*4+3]===255,color:color});
        }});
      });
    }
    // A slightly overlapping same-colour edge seals antialiased gaps between opaque
    // pixels. Do not double-paint translucent pixels, which would darken glass.
    quads.sort(function(a,b){return a.z-b.z});ctx.lineJoin='round';ctx.lineWidth=1.5;
    quads.forEach(function(item){ctx.fillStyle=ctx.strokeStyle=item.color;ctx.beginPath();ctx.moveTo(item.q[0][0],item.q[0][1]);for(var i=1;i<4;i++)ctx.lineTo(item.q[i][0],item.q[i][1]);ctx.closePath();ctx.fill();if(item.opaque)ctx.stroke();});
};
