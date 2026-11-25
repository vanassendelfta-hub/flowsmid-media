import numpy as np, sys, wave
dur=float(sys.argv[1]); out=sys.argv[2]; sr=44100
n=int(dur*sr); t=np.arange(n)/sr; mix=np.zeros(n)
bpm=96; beat=60/bpm; bar=4*beat
def f(m): return 440*2**((m-69)/12)
prog=[[60,64,67],[55,59,62],[57,60,64],[53,57,60]]  # C G Am F
def env(L,a,r):
    e=np.ones(L); ai=int(a*sr); ri=int(r*sr)
    e[:ai]=np.linspace(0,1,ai); e[-ri:]*=np.linspace(1,0,ri); return e
nb=int(dur/bar)+1
for b in range(nb):
    ch=prog[b%4]; s0=int(b*bar*sr); L=min(int(bar*sr), n-s0)
    if L<=0: break
    tt=np.arange(L)/sr
    pad=sum(np.sin(2*np.pi*f(m)*tt)+.5*np.sin(2*np.pi*f(m)*1.003*tt) for m in ch)*.05
    mix[s0:s0+L]+=pad*env(L,.4,.4)
    bass=np.sin(2*np.pi*f(ch[0]-24)*tt)*.12*env(L,.02,.3)
    mix[s0:s0+L]+=bass
    arp=[ch[0]+12,ch[1]+12,ch[2]+12,ch[1]+12,ch[0]+24,ch[2]+12,ch[1]+12,ch[2]+12]
    for i,m in enumerate(arp):
        p0=s0+int(i*beat/2*sr); Lp=min(int(.6*sr),n-p0)
        if Lp<=0: continue
        tp=np.arange(Lp)/sr
        pl=(np.sin(2*np.pi*f(m)*tp)+.3*np.sin(2*np.pi*2*f(m)*tp))*np.exp(-tp*7)*.07
        mix[p0:p0+Lp]+=pl
    for k in range(4):  # zachte shaker
        p0=s0+int((k+.5)*beat*sr); Lp=min(int(.05*sr),n-p0)
        if Lp>0: mix[p0:p0+Lp]+=np.random.randn(Lp)*np.exp(-np.arange(Lp)/sr*90)*.015
fi=int(1.5*sr); fo=int(2.5*sr)
mix[:fi]*=np.linspace(0,1,fi); mix[-fo:]*=np.linspace(1,0,fo)
mix/=np.max(np.abs(mix))*1.25
d=(mix*32767).astype(np.int16); st=np.repeat(d[:,None],2,axis=1)
w=wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(st.tobytes()); w.close()
