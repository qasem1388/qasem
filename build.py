"""One-command build of the Louis Martin ad.

    python3 build.py              # render picture + audio, export every version
    python3 build.py --audio-only # re-mix audio onto the existing picture (fast)

Outputs (in output/):
    louis_martin_ad_no_vo.mp4     music + sound effects, no voice-over
    louis_martin_ad_final.mp4     + voice-over with automatic music ducking
                                  (only when recordings exist in assets/vo/)
"""
import argparse
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(ROOT, "build")
O = os.path.join(ROOT, "output")

MUSIC_GAIN = 0.55
SFX_GAIN = 0.8
LOUDNESS = "loudnorm=I=-14:TP=-1.5:LRA=11"  # social-platform loudness target


def run(cmd):
    print("+", " ".join(cmd) if isinstance(cmd, list) else cmd)
    subprocess.run(cmd, check=True)


def measure(inputs, fc):
    """First loudnorm pass: returns the measured values for an exact, linear second pass."""
    import json
    r = subprocess.run(["ffmpeg", "-hide_banner", *inputs, "-filter_complex",
                        fc.replace(LOUDNESS + "[a]", LOUDNESS + ":print_format=json"), "-f", "null", "-"],
                       capture_output=True, text=True, check=True).stderr
    m = json.loads(r[r.rindex("{"):r.rindex("}") + 1])
    return (f"{LOUDNESS}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")


def mux(video, out, with_vo):
    inputs = ["-i", video, "-i", f"{B}/music.wav", "-i", f"{B}/sfx.wav"]
    if with_vo:
        inputs += ["-i", f"{B}/vo.wav"]
        fc = (f"[1]volume={MUSIC_GAIN}[m];[2]volume={SFX_GAIN}[s];[3]asplit[v1][v2];"
              # duck the music by ~10-12 dB whenever the voice speaks
              "[m][v1]sidechaincompress=threshold=0.05:ratio=4:attack=25:release=400[md];"
              f"[md][s][v2]amix=inputs=3:normalize=0,{LOUDNESS}[a]")
    else:
        fc = f"[1]volume={MUSIC_GAIN}[m];[2]volume={SFX_GAIN}[s];[m][s]amix=inputs=2:normalize=0,{LOUDNESS}[a]"
    fc = fc.replace(LOUDNESS + "[a]", measure(inputs, fc) + "[a]")
    # delivery encode: H.264 High, capped bitrate so Snapchat / Instagram accept it without heavy re-compression
    run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "14M", "-bufsize", "28M",
         "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p", "-r", "30",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", "30", "-movflags", "+faststart", out])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio-only", action="store_true")
    a = ap.parse_args()
    os.makedirs(O, exist_ok=True)
    video = f"{B}/video_noaudio.mp4"
    if not a.audio_only or not os.path.exists(video):
        run([sys.executable, f"{ROOT}/src/render.py", "--out", video])
    run([sys.executable, f"{ROOT}/src/audio.py"])
    mux(video, f"{O}/louis_martin_ad_no_vo.mp4", False)
    final = f"{O}/louis_martin_ad_final.mp4"
    if os.path.exists(f"{B}/vo.wav"):
        mux(video, final, True)
    else:
        if os.path.exists(final):
            os.remove(final)
        print("\nNo voice-over recordings found in assets/vo/ - exported the no-VO version only.")
    print("\nDone ->", O)


if __name__ == "__main__":
    main()
