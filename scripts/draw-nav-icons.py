# Usage: python3 scripts/draw-nav-icons.py public/nav
# Pixel-art stand-in icons for the nav mockup. Drawn on a 32x32 grid, auto-outlined,
# scaled 2x nearest-neighbour to 64x64 (the size of public/main ui/*.png).
from PIL import Image, ImageDraw
import sys, os
OUT = sys.argv[1]
OL=(59,36,18,255); WOOD=(139,94,42,255); WOODL=(201,135,63,255); WOODD=(101,64,28,255)
PAR=(240,221,184,255); PARS=(217,185,138,255); GOLD=(245,197,66,255); GOLDD=(201,120,26,255)
RED=(214,58,42,255); REDD=(143,31,23,255); GRN=(63,155,58,255); GRNL=(120,200,90,255)
STL=(200,208,216,255); STLD=(107,118,130,255); WHT=(255,255,255,255); SUN=(255,215,106,255)
BLU=(70,130,200,255); BLUD=(40,80,140,255)

def new(): 
    im=Image.new('RGBA',(32,32),(0,0,0,0)); return im, ImageDraw.Draw(im)
def px(d,pts,c):
    for p in pts: d.point(p,fill=c)
def outline(im):
    src=im.copy(); w,h=im.size; p=src.load(); q=im.load()
    for y in range(h):
        for x in range(w):
            if p[x,y][3]==0:
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    X,Y=x+dx,y+dy
                    if 0<=X<w and 0<=Y<h and p[X,Y][3]>0 and p[X,Y]!=OL: q[x,y]=OL; break
    return im
def save(im,name,scale=2):
    outline(im).resize((32*scale,32*scale),Image.NEAREST).save(os.path.join(OUT,name))

# 1 Today: parchment scroll, green check, sun peeking top-right
im,d=new()
d.ellipse((19,1,30,12),fill=SUN); d.ellipse((21,3,28,10),fill=GOLD)
d.rectangle((6,7,24,27),fill=PAR); d.rectangle((6,7,7,27),fill=PARS)
d.rectangle((4,4,26,7),fill=WOODL); d.rectangle((4,6,26,7),fill=WOOD)
d.rectangle((4,27,26,30),fill=WOODL); d.rectangle((4,29,26,30),fill=WOOD)
px(d,[(4,4),(26,4),(4,30),(26,30)],(0,0,0,0))
for y in (12,17,22): d.rectangle((9,y,11,y+2),fill=PARS)
d.line((13,13,21,13),fill=PARS); d.line((13,18,21,18),fill=PARS); d.line((13,23,19,23),fill=PARS)
# big check over the list
for i,(x,y) in enumerate([(10,18),(11,19),(12,20),(13,21),(14,20),(15,19),(16,18),(17,17),(18,16),(19,15),(20,14),(21,13)]):
    d.rectangle((x,y,x+1,y+1),fill=GRN)
px(d,[(10,17),(12,19),(14,19),(16,17),(18,15),(20,13)],GRNL)
save(im,'today.png')

# 6 Menu: compass rose in a round wooden badge
im,d=new()
d.ellipse((2,2,29,29),fill=WOOD); d.ellipse((3,3,28,28),fill=WOODL); d.ellipse((6,6,25,25),fill=PAR)
d.polygon([(16,7),(18,16),(16,25),(14,16)],fill=STLD); d.polygon([(16,7),(18,16),(14,16)],fill=RED)
d.polygon([(7,16),(16,14),(25,16),(16,18)],fill=STLD)
d.ellipse((14,14,17,17),fill=GOLD)
px(d,[(16,4),(4,16),(27,16),(16,27)],GOLD)
save(im,'menu.png')

# 7 Battle: two crossed swords over a round wooden shield
im,d=new()
d.ellipse((7,8,25,26),fill=WOOD); d.ellipse((9,10,23,24),fill=WOODL); d.ellipse((14,15,18,19),fill=GOLD)
for a,b in (((4,4),(22,22)),((27,4),(9,22))):
    d.line((a[0],a[1],b[0],b[1]),fill=STL,width=3)
d.line((4,4,21,21),fill=WHT,width=1)
d.line((27,4,10,21),fill=WHT,width=1)
# guards and hilts
d.rectangle((19,22,26,23),fill=GOLDD); d.rectangle((22,24,24,28),fill=WOODD); d.rectangle((22,28,25,29),fill=GOLD)
d.rectangle((5,22,12,23),fill=GOLDD); d.rectangle((7,24,9,28),fill=WOODD); d.rectangle((6,28,9,29),fill=GOLD)
save(im,'battle.png')

# 8 Gift chest closed with red bow + sparkles
def chest(open_):
    im,d=new()
    d.rectangle((5,15,26,28),fill=WOOD); d.rectangle((5,15,26,16),fill=WOODL)
    for x in (10,16,21): d.line((x,17,x,28),fill=WOODD)
    d.rectangle((5,26,26,28),fill=WOODD)
    d.rectangle((4,15,5,28),fill=GOLDD); d.rectangle((26,15,27,28),fill=GOLDD)
    if open_:
        d.polygon([(6,14),(25,14),(23,4),(8,4)],fill=(255,240,170,255))
        d.rectangle((5,12,26,15),fill=(255,224,120,255))
        d.rectangle((6,2,25,6),fill=WOODL); d.rectangle((6,2,25,3),fill=WOOD)
        for s in [(3,5),(28,6),(2,11),(29,12),(16,1)]: d.point(s,fill=WHT)
        d.rectangle((14,9,17,15),fill=GOLD)
    else:
        d.rectangle((5,9,26,15),fill=WOODL); d.rectangle((5,9,26,10),fill=(222,160,80,255)); d.rectangle((5,14,26,15),fill=WOOD)
        d.rectangle((14,9,17,28),fill=RED); d.rectangle((14,9,14,28),fill=REDD)
        d.rectangle((5,18,26,20),fill=RED); d.line((5,20,26,20),fill=REDD)
        d.polygon([(15,8),(9,3),(8,8)],fill=RED); d.polygon([(16,8),(22,3),(23,8)],fill=RED)
        d.rectangle((14,6,17,9),fill=REDD)
        for s in [(3,6),(28,4),(27,11),(2,12)]:
            x,y=s; px(d,[(x,y),(x-1,y),(x+1,y),(x,y-1),(x,y+1)],GOLD)
    return im
save(chest(False),'gift.png'); save(chest(True),'gift-open.png')

# 10 Padlock 16-grid feel on 32 canvas
im,d=new()
d.arc((9,3,22,19),180,360,fill=STLD,width=3)
d.rectangle((9,10,11,15),fill=STLD); d.rectangle((20,10,22,15),fill=STLD)
d.rectangle((6,14,25,29),fill=STL); d.rectangle((6,14,25,15),fill=WHT); d.rectangle((6,27,25,29),fill=STLD)
d.ellipse((14,18,17,21),fill=GOLDD); d.rectangle((15,21,16,25),fill=GOLDD)
save(im,'padlock.png')

# 12 Map-edge plate: square plank with gold corners and nails
im,d=new()
d.rectangle((1,1,30,30),fill=WOOD)
for y in (8,15,22): d.line((2,y,29,y),fill=WOODD)
d.rectangle((2,2,29,3),fill=WOODL)
for (x,y) in ((1,1),(26,1),(1,26),(26,26)):
    d.rectangle((x,y,x+4,y+4),fill=GOLD); d.point((x+2,y+2),fill=GOLDD)
save(im,'plate.png')
print('ok')
