import sherpa_onnx, soundfile as sf, sys, json, numpy as np
D=sys.argv[1]; out=sys.argv[2]
m=D+"/vits-piper-ar_JO-kareem-medium"
cfg=sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=m+"/ar_JO-kareem-medium.onnx",tokens=m+"/tokens.txt",data_dir=m+"/espeak-ng-data"),num_threads=4))
tts=sherpa_onnx.OfflineTts(cfg)
lines=json.load(open(out+"/lines.json"))
res=[]
for i,(t,speed) in enumerate(lines):
    a=tts.generate(t,sid=0,speed=speed)
    s=np.array(a.samples); sf.write(f"{out}/l{i}.wav",s,a.sample_rate)
    res.append(round(len(s)/a.sample_rate,2))
print(res, sum(res))
