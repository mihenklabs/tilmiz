"""ClArTTS metadata.csv içinden 8 sn üstü klipleri süzer (4 GB GPU bellek sınırı). Kullanım: python tools/tts/filter_long.py D:/tts-egitim"""
import soundfile as sf, sys, os
root=sys.argv[1]; rows=open(root+"/data/metadata.csv",encoding="utf-8").read().splitlines()
keep=[];d=[]
for r in rows:
    f=r.split("|")[0]; p=root+"/data/wav/"+(f if f.endswith(".wav") else f+".wav")
    x=sf.info(p).duration; d.append(x)
    if x<=8.0: keep.append(r)
d.sort(); print(len(rows),len(keep),"median",d[len(d)//2],"p90",d[int(len(d)*.9)],"max",d[-1])
open(root+"/data/metadata-8s.csv","w",encoding="utf-8").write("\n".join(keep)+"\n")
