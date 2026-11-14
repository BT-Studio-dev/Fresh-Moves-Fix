from PIL import Image,ImageDraw,ImageChops
import sys
U=16
def rows(*spec):
    out=[]
    for s,n in spec: out+= [s]*n
    return out
G={
'E':rows(("XXXXXXX",2),("XXX....",2),("XXXXXXX",2),("XXX....",2),("XXXXXXX",2)),
'F':rows(("XXXXXXX",2),("XXX....",2),("XXXXXXX",2),("XXX....",4)),
'R':rows(("XXXXXXX",2),("XXX.XXX",2),("XXXXXX.",1),("XXXXXXX",1),("XXX.XXX",4)),
'H':rows(("XXX.XXX",4),("XXXXXXX",2),("XXX.XXX",4)),
'O':rows(("XXXXXXX",2),("XXX.XXX",6),("XXXXXXX",2)),
'I':rows(("XXX",10)),
'M':rows(("XXX....XXX",2),("XXXX..XXXX",2),("XXXXXXXXXX",2),("XXX.XX.XXX",2),("XXX....XXX",2)),
'N':rows(("XXX...XXX",2),("XXXX..XXX",2),("XXXXXXXXX",2),("XXX..XXXX",2),("XXX...XXX",2)),
'C':rows(("XXXXXXX",2),("XXX....",6),("XXXXXXX",2)),
'A':rows(("XXXXXXX",2),("XXX.XXX",2),("XXXXXXX",2),("XXX.XXX",4)),
'T':rows(("XXXXXXX",2),("..XXX..",8)),
'B':rows(("XXXXXXX",2),("XXX.XXX",2),("XXXXXX.",1),("XXXXXXX",1),("XXX.XXX",2),("XXXXXXX",2)),
}
OX,OY,D=8,12,44   # outline left/right, outline top/bottom, depth of the shade
def word(t,face,shade):
    w=sum(len(G[c][0]) for c in t)*U+(len(t)-1)*U
    m=Image.new('L',(w+2*OX,10*U+D+2*OY),0); d=ImageDraw.Draw(m); x=OX
    for ch in t:
        for r,row in enumerate(G[ch]):
            for c,v in enumerate(row):
                if v=='X': d.rectangle((x+c*U,OY+r*U,x+(c+1)*U-1,OY+(r+1)*U-1),fill=255)
        x+=(len(G[ch][0])+1)*U
    ext=m.copy()
    for k in range(1,D+1): ext=ImageChops.lighter(ext,ImageChops.offset(m,0,k))
    ol=ext.copy()
    for k in range(1,OX+1): ol=ImageChops.lighter(ol,ImageChops.lighter(ImageChops.offset(ext,k,0),ImageChops.offset(ext,-k,0)))
    o2=ol.copy()
    for k in range(1,OY+1): o2=ImageChops.lighter(o2,ImageChops.lighter(ImageChops.offset(ol,0,k),ImageChops.offset(ol,0,-k)))
    out=Image.new('RGBA',m.size,(0,0,0,0))
    out.paste((20,16,14,255),(0,0),o2); out.paste(shade+(255,),(0,0),ext); out.paste(face+(255,),(0,0),m)
    return out
def title(words,gap=48,vgap=None):
    ims=[word(t,f,s) for t,f,s in words]
    if vgap is None:
        W=sum(i.width for i in ims)+gap*(len(ims)-1)-2*OX*(0); im=Image.new('RGBA',(W,ims[0].height),(0,0,0,0)); x=0
        for i in ims: im.alpha_composite(i,(x,0)); x+=i.width+gap
    else:
        W=max(i.width for i in ims); im=Image.new('RGBA',(W,sum(i.height for i in ims)+vgap*(len(ims)-1)),(0,0,0,0)); y=0
        for i in ims: im.alpha_composite(i,((W-i.width)//2,y)); y+=i.height+vgap
    return im
WH=((255,255,255),(84,84,84)); GR=((99,255,84),(33,84,28))
if __name__=='__main__':
    title([('MINECRAFT',)+WH,('HEROBRINE',)+GR],vgap=12).save('title-herobrine.png',optimize=True)
    title([('FRE',)+WH,('HM',)+WH]).save('/tmp/cmp.png')
