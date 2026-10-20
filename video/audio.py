# Builds the full soundtrack: processed voiceover + synthesized SFX + music bed (with ducking).
import numpy as np, soundfile as sf, subprocess, json, os
SR=44100; DUR=30.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
D=os.path.dirname(os.path.abspath(__file__))
# voiceover line start times (seconds) — keep in sync with index.html timeline
VO_START=[0.12,3.25,8.35,14.05,17.75,22.3,26.75]

def t_(d): return np.arange(int(SR*d))/SR
def env(n,a=.005,r=None):
    e=np.ones(n); na=max(1,int(a*SR)); e[:na]=np.linspace(0,1,na)
    if r: nr=min(n,int(r*SR)); e[-nr:]*=np.linspace(1,0,nr)
    return e
def lp(x,fc):  # one-pole lowpass, fc may be array
    fc=np.broadcast_to(np.asarray(fc,float),x.shape); a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); s=0.
    for i in range(len(x)): s=(1-a[i])*x[i]+a[i]*s; y[i]=s
    return y
def lp_fast(x,fc):
    a=np.exp(-2*np.pi*fc/SR); from scipy.signal import lfilter
    return lfilter([1-a],[1,-a],x)
def bp(x,lo,hi):
    from scipy.signal import butter,sosfilt
    return sosfilt(butter(2,[lo,hi],btype='band',fs=SR,output='sos'),x)
def hp(x,f):
    from scipy.signal import butter,sosfilt
    return sosfilt(butter(2,f,btype='high',fs=SR,output='sos'),x)
def norm(x,p=1.0): m=np.max(np.abs(x))+1e-9; return x/m*p
def reverb(x,decay=1.2,mix=.3):
    n=int(SR*decay); ir=rng.standard_normal(n)*np.exp(-np.linspace(0,7,n)); ir=lp_fast(ir,5000)
    from scipy.signal import fftconvolve
    w=fftconvolve(x,ir)[:len(x)+n]; w=norm(w,np.max(np.abs(x)))
    out=np.zeros(len(x)+n); out[:len(x)]+=x*(1-mix); out[:len(w)]+=w*mix; return out

# ---------- SFX ----------
def whoosh(d=.6,lo=300,hi=4000,peak=.55):
    n=int(SR*d); x=rng.standard_normal(n); k=np.linspace(0,1,n)
    e=np.where(k<peak,(k/peak)**2,((1-k)/(1-peak))**1.5)
    fc=lo+(hi-lo)*np.sin(np.pi*np.clip(k/peak*0.5,0,1)) 
    y=lp(x,fc)-lp(x,fc*0.25); pan=np.linspace(-.7,.7,n)
    y=norm(y*e)
    return np.stack([y*(1-pan)/1.4,y*(1+pan)/1.4],1)
def impact(d=1.6,f0=120,f1=35,noise=.5):
    tt=t_(d); f=f1+(f0-f1)*np.exp(-tt*18); ph=2*np.pi*np.cumsum(f)/SR
    body=np.sin(ph)*np.exp(-tt*2.6); click=lp_fast(rng.standard_normal(len(tt)),3000)*np.exp(-tt*30)*noise
    y=np.tanh((body+click)*2.2); y=reverb(y,1.8,.25)
    return norm(y,.95)
def riser(d=1.0):
    tt=t_(d); k=tt/d; x=rng.standard_normal(len(tt)); y=lp(x,300+8000*k**2)*k**2
    tone=np.sin(2*np.pi*np.cumsum(200+900*k**2)/SR)*k**3*.4
    return norm(y+tone,.8)
def pop(f=900,d=.12):
    tt=t_(d); fr=f*(1+1.5*np.exp(-tt*60)); y=np.sin(2*np.pi*np.cumsum(fr)/SR)*np.exp(-tt*38)
    return norm(y,.7)
def click(d=.06):
    tt=t_(d); y=(np.sin(2*np.pi*2400*tt)*.6+lp_fast(rng.standard_normal(len(tt)),6000))*np.exp(-tt*120); return norm(y,.8)
def ding(f=1318.5,d=1.3):
    tt=t_(d); y=sum(a*np.sin(2*np.pi*f*m*tt)*np.exp(-tt*dd) for m,a,dd in [(1,1,3.5),(2.0,.35,6),(3.01,.18,9),(1.5,.25,5)])
    y2=np.zeros_like(y); off=int(.09*SR); tt2=tt[:-off]
    y2[off:]=sum(a*np.sin(2*np.pi*f*1.335*m*tt2)*np.exp(-tt2*dd) for m,a,dd in [(1,1,3.5),(2.0,.3,6)])
    return norm(reverb((y+y2)*env(len(y),.002),1.2,.25),.6)
def glitch(d=.3):
    n=int(SR*d); y=np.zeros(n); i=0
    while i<n:
        L=int(SR*rng.uniform(.01,.04)); seg=rng.standard_normal(min(L,n-i)) if rng.random()<.5 else np.sign(np.sin(2*np.pi*rng.uniform(80,900)*np.arange(min(L,n-i))/SR))
        y[i:i+L]=seg*rng.uniform(.3,1); i+=L
    y=np.round(y*6)/6; return norm(hp(y,200),.6)
def shimmer(d=1.4):
    tt=t_(d); y=np.zeros_like(tt)
    for i in range(14):
        st=rng.uniform(0,d*.6); f=rng.choice([2093,2637,3136,3520,4186]); o=int(st*SR); a=tt[:len(tt)-o]
        y[o:]+=np.sin(2*np.pi*f*a)*np.exp(-a*6)*rng.uniform(.3,1)
    return norm(reverb(y,1.5,.4),.45)
def metal(d=.9):  # lock clank
    tt=t_(d); y=sum(np.sin(2*np.pi*f*tt)*np.exp(-tt*k) for f,k in [(523,9),(1187,12),(1893,16),(2741,22)])
    y+=lp_fast(rng.standard_normal(len(tt)),5000)*np.exp(-tt*60)*1.5
    return norm(reverb(y,1.0,.2),.8)
def swipe(d=.35): return whoosh(d,800,9000,.4)

sfx=np.zeros((N+SR*4,2))
def put(sig,t,g=1.0,pan=0.0):
    if sig.ndim==1: sig=np.stack([sig*(1-pan),sig*(1+pan)],1)/1.0
    o=int(t*SR); e=min(len(sfx),o+len(sig)); sfx[o:e]+=sig[:e-o]*g

put(impact(2.0,140,32),0.03,.95); put(glitch(.25),0.03,.35)
put(whoosh(.35,600,6000,.7),0.42,.45); put(glitch(.32),0.5,.45)
put(whoosh(.35,300,3000,.8),1.42,.4); put(metal(),1.72,.6); put(impact(1.2,90,30,.3),1.72,.7)
put(glitch(.15),1.72,.3); put(pop(600),1.78,.4)
put(riser(.55),2.47,.45); put(glitch(.4),2.6,.35)
put(whoosh(.7,200,7000,.45),2.65,.75); put(impact(1.8,150,40,.6),3.0,.75)
put(shimmer(1.6),3.15,.55); put(impact(1.4,110,35,.2),3.98,.5); put(pop(1200),4.0,.4)
put(swipe(.4),4.18,.35); put(swipe(.4),4.52,.3)
put(pop(700),5.47,.45); put(swipe(.3),5.85,.25); put(pop(980),6.32,.45)
for i,t0 in enumerate([5.55,6.0,6.45]): put(click(),t0,.25)
put(swipe(.45),6.9,.3)
put(whoosh(.75,250,8000,.5),7.85,.8)
put(whoosh(.5,300,5000,.6),8.3,.4)
for i,t0 in enumerate([8.7,8.95,9.3,9.45,9.6,9.75]): put(pop(700+i*90),t0,.38,pan=(i%2-.5)*.5)
put(swipe(.5),9.85,.3)
for i in range(8): put(click(.03),10.0+i*.1,.12)
put(ding(1760,.8),10.8,.3)
put(whoosh(.6,250,6000,.5),10.75,.65); put(impact(1.0,100,40,.2),11.4,.3)
for i in range(4): put(pop(800+i*120),11.3+i*.08,.3)
put(click(),11.8,.6); put(pop(1500,.1),11.97,.4)
put(ding(1318.5),12.27,.55); put(swipe(.35),12.2,.3)
put(ding(1568),12.87,.55); put(swipe(.35),12.8,.3)
put(pop(1000),13.0,.4); put(riser(.45),13.55,.35)
put(whoosh(.6,200,7000,.6),13.6,.8); put(impact(1.4,130,40,.4),14.05,.55)
for i in range(8): put(pop(650+(i%4)*150,.1),14.45+i*.11,.33,pan=((i%3)-1)*.4)
put(pop(900),15.35,.35)
put(ding(2093,1.0),15.88,.45); put(swipe(.4),15.82,.35)
for i in range(4): put(pop(1100+i*100,.1),15.4+i*.15,.25)
put(swipe(.4),16.3,.3)
put(whoosh(.7,300,9000,.5),17.25,.8); put(glitch(.3),17.4,.3)
for t0 in [17.82,19.22,20.52]:
    put(whoosh(.45,400,7000,.7),t0-.3,.55); put(impact(1.1,120,45,.35),t0+.05,.5); put(pop(1400,.08),t0+.4,.35)
put(swipe(.4),17.7,.3); put(swipe(.4),20.95,.25)
put(riser(1.4),20.8,.65); put(whoosh(.8,200,8000,.85),21.45,.7)
put(impact(2.2,150,30,.6),22.18,1.0); put(glitch(.2),22.18,.25)
put(whoosh(.5,300,6000,.6),23.0,.45); put(swipe(.4),24.0,.3)
put(pop(800),24.45,.45); put(whoosh(.4,500,6000,.6),24.6,.25)
put(click(),25.0,.8); put(pop(1600,.08),25.03,.4); put(ding(2637,.7),25.1,.25)
put(riser(.8),25.8,.4); put(whoosh(.7,200,7000,.5),26.1,.6)
put(impact(2.5,140,30,.5),26.58,.9); put(shimmer(2.0),26.65,.6)
put(swipe(.4),26.75,.3); put(swipe(.4),27.0,.25); put(pop(900),27.3,.3); put(ding(1975,1.2),27.65,.35)

# ---------- MUSIC (120 BPM) ----------
BPM=120; beat=60/BPM
mus=np.zeros(N+SR*4)
def note(f,d,typ='saw',det=.0):
    tt=t_(d); ph=f*tt
    if typ=='saw': y=sum((2*(((ph*(1+k*det))%1))-1) for k in (-1,0,1))/3
    elif typ=='sine': y=np.sin(2*np.pi*ph)
    else: y=np.sign(np.sin(2*np.pi*ph))
    return y
def kick():
    tt=t_(.45); f=45+120*np.exp(-tt*28); y=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*7)
    return np.tanh(y*1.8)*.9
def snare():
    tt=t_(.3); y=lp_fast(rng.standard_normal(len(tt)),7000)*np.exp(-tt*16)*.6+np.sin(2*np.pi*190*tt)*np.exp(-tt*25)*.5
    return reverb(y,.6,.25)
def hat(open_=False):
    tt=t_(.25 if open_ else .05); y=hp(rng.standard_normal(len(tt)),7000)*np.exp(-tt*(14 if open_ else 80)); return y*.35
def addm(sig,t,g=1.):
    o=int(t*SR); e=min(len(mus),o+len(sig)); mus[o:e]+=sig[:e-o]*g
# Am - F - C - G  (2 beats each? use 1 bar each = 4 beats = 2s)
prog=[(220.0,[220.0,261.63,329.63]),(174.61,[174.61,220.0,261.63]),(130.81,[261.63,329.63,392.0]),(196.0,[196.0,246.94,293.66])]
K,Sn,H,Ho=kick(),snare(),hat(),hat(True)
# hook: dark drone + heartbeat
dr=note(55,3.0,'saw',.01); dr=lp_fast(dr,400)*np.linspace(0,1,len(dr))**.5*.25; addm(dr,0)
for t0 in [0.55,1.1,1.72,2.2]: addm(K*.6,t0)
# main groove 3.0 -> 28.6 with breakdowns
bars=int((28.6-3.0)/(4*beat))+1
for b in range(bars):
    t0=3.0+b*4*beat; root,ch=prog[b%4]
    # pad
    pd=sum(note(f,4*beat,'saw',.006) for f in ch); pd=lp_fast(pd,1400)*env(len(pd),.25,.4)*.10
    addm(pd,t0)
    for q in range(8):
        tq=t0+q*beat/2
        if tq>=28.55: break
        brk = 21.2<=tq<22.18 or 25.9<=tq<26.58
        if q%2==0 and not brk: addm(K,tq,.8)
        if q in (2,6) and not brk: addm(Sn,tq,.35)
        if not brk: addm(Ho if q%2 else H,tq,.5)
        # bass (8ths, octave pump)
        if not brk:
            bn=note(root/2*(2 if q%4==3 else 1),beat/2*.9,'saw',.0); bn=lp_fast(bn,600)*env(len(bn),.004,.05)*.28
            addm(bn,tq)
        # pluck arp
        f=ch[[0,1,2,1,0,2,1,2][q]]*2
        pl=note(f,.3,'sq')*np.exp(-t_(.3)*14); pl=lp_fast(pl,3000)*.05
        addm(pl,tq)
# final chord tail
fc=sum(note(f,3.0,'saw',.006) for f in [220,261.63,329.63,440]); fc=lp_fast(fc,1800)*np.exp(-t_(3.0)*1.2)*.16; addm(fc,26.58)
mus=np.stack([mus,mus],1)
# stereo widen pad-ish via tiny delay on right
d=int(.012*SR); mus[d:,1]=mus[d:,1]*.7+mus[:-d,1]*.3

# ---------- VOICEOVER ----------
vo=np.zeros(N+SR*4)
for i,t0 in enumerate(VO_START):
    src=f"{D}/voiceover/l{i}.wav"; tmp=f"{D}/voiceover/p{i}.wav"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',src,'-af',
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,'
        'aresample=44100,highpass=f=90,equalizer=f=180:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=4,equalizer=f=8000:t=h:w=1:g=2,'
        'acompressor=threshold=-20dB:ratio=4:attack=5:release=80:makeup=4',
        '-ar','44100','-ac','1',tmp],check=True)
    s,_=sf.read(tmp); o=int(t0*SR); vo[o:o+len(s)]+=s
    print(f"VO {i}: {t0:.2f} -> {t0+len(s)/SR:.2f}")
vo=norm(vo,.9); vo_r=reverb(vo,.5,.08)[:len(vo)]
# ducking envelope
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ve=uniform_filter1d(maximum_filter1d(np.abs(vo),int(.15*SR)),int(.1*SR)); duck=1-0.6*np.clip(ve/0.15,0,1)
mus*=duck[:,None]; sfx*=(1-0.25*np.clip(ve/0.15,0,1))[:,None]

mix=mus*.55+sfx*.6+np.stack([vo_r,vo_r],1)*1.0
r=lambda x:20*np.log10(np.sqrt(np.mean(x[:N]**2))+1e-9)
m=ve[:N]>0.05
print("dB rms in VO regions  vo:",round(r(vo[:N][m]),1),"music:",round(r((mus*.55)[:N][m]),1),"sfx:",round(r((sfx*.6)[:N][m]),1))
mix=mix[:N]
fade=int(.4*SR); mix[-fade:]*=np.linspace(1,0,fade)[:,None]
mix=np.tanh(mix*1.1)/np.tanh(1.1)
mix=norm(mix,.95)
sf.write(f"{D}/build/soundtrack.wav",mix,SR)
print("ok")
