// Lightweight software renderer adapted from the site’s own skin thumbnail maker.
window.drawPfp3d = function (ctx, skin, options) {
    var pixels=skin.getImageData(0,0,64,64).data, slim=options.slim, aw=slim?3:4, ax=slim?5.5:6;
    var yaw=options.yaw*Math.PI/180, pitch=options.pitch*Math.PI/180;
    var cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch), quads=[];
    var piv={head:[0,24],body:[0,24],ra:[-5,22],la:[5,22],rl:[-2,12],ll:[2,12]};
    var parts=[['head',0,0,8,8,8,0,28,0],['body',16,16,8,12,4,0,18,0],['ra',40,16,aw,12,4,-ax,18,0],['la',32,48,aw,12,4,ax,18,0],['rl',0,16,4,12,4,-2,6,0],['ll',16,48,4,12,4,2,6,0]];
    var layers=[[32,0],[16,32],[40,32],[48,48],[0,32],[0,48]];
    function point(name,x,y,z){
      var pv=piv[name], a=(options.angles[name] || 0)*Math.PI/180, c=Math.cos(a), t=Math.sin(a), X=x-pv[0], Y=y-pv[1];
      x=X*c-Y*t+pv[0];y=X*t+Y*c+pv[1];
      if (name === 'head') {
        var hy=(options.headYaw || 0)*Math.PI/180, hp=(options.headPitch || 0)*Math.PI/180;
        var yc=Math.cos(hp), ys=Math.sin(hp), hc=Math.cos(hy), hs=Math.sin(hy);
        var localY=y-pv[1], y2=localY*yc-z*ys, z2=localY*ys+z*yc;
        var x2=x*hc+z2*hs; z=-x*hs+z2*hc; x=x2; y=y2+pv[1];
      }
      y-=16;
      var xx=x*cy+z*sy, zz=-x*sy+z*cy, yy=y*cp-zz*sp, depth=y*sp+zz*cp;
      return [256+xx*options.scale,256-(yy-options.centerY)*options.scale,depth];
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
          var r=rects[fi], a=point(name,...fn(0,0)),b=point(name,...fn(r[2],0)),c=point(name,...fn(0,r[3]));
          var cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); if(fi===5)cross=-cross;
          // Do not paint the far side of the outer shell over neighboring pixels.
          // Keep alpha on the visible side, so translucent/glass pixels remain translucent.
          if(cross<=0)return;
          var shade=fi<2?1:fi<4?0.82:fi===4?1:0.6;
          for(var j=0;j<r[3];j++)for(var i=0;i<r[2];i++){
            var o=((r[1]+j)*64+r[0]+i)*4;if(!pixels[o+3])continue;
            var q=[point(name,...fn(i,j)),point(name,...fn(i+1,j)),point(name,...fn(i+1,j+1)),point(name,...fn(i,j+1))];
            quads.push({z:(q[0][2]+q[1][2]+q[2][2]+q[3][2])/4,q:q,opaque:pixels[o+3]===255,color:'rgba('+Math.round(pixels[o]*shade)+','+Math.round(pixels[o+1]*shade)+','+Math.round(pixels[o+2]*shade)+','+(pixels[o+3]/255)+')'});
          }
        });
      });
    });
    // A slightly overlapping same-colour edge seals antialiased gaps between opaque
    // pixels. Do not double-paint translucent pixels, which would darken glass.
    quads.sort(function(a,b){return a.z-b.z});ctx.lineJoin='round';ctx.lineWidth=1.5;
    quads.forEach(function(item){ctx.fillStyle=ctx.strokeStyle=item.color;ctx.beginPath();ctx.moveTo(item.q[0][0],item.q[0][1]);for(var i=1;i<4;i++)ctx.lineTo(item.q[i][0],item.q[i][1]);ctx.closePath();ctx.fill();if(item.opaque)ctx.stroke();});
};
