i = 0
recording = False
current_buffer = ""
with open("outputMagium.txt","r") as f:
    for line in f.readlines():
        if "scene" in line.lower() and "movement" in line.lower():
            recording = True
        elif "achievement box" in line.lower():
            recording = False
            with open(f"{i}.txt","w") as f_out:
                f_out.write(current_buffer)
            current_buffer = ""
            i += 1
        elif recording:
            current_buffer += line

