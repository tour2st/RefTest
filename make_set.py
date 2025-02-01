import random
# method1 = CCNN frame 0
# method2 = CCNN frame 3
# method6 = hubert
source = ["SEF1","SEF2","SEM1","SEM2"]
target = ["TEF1","TEF2","TEM1","TEM2"]
# showdow 0 = CCNN0 vs CCNN3
# showdown1 = CCNN3 vs hubert
showdown = [["method1","method2"],["method2","method3"]]
text_num = 25

question = {}
for s in source:
    for t in target:
        for vs_method in showdown:
            question[(s,t,vs_method[0],vs_method[1])] = []

            for text_id in range(1,text_num+1):
                question[(s,t,vs_method[0],vs_method[1])].append(f'E3{text_id:04}')

            random.shuffle(question[(s,t,vs_method[0],vs_method[1])])

print('', end='{\n')
for set_id in range(0,25):

    print(f'"set{set_id + 1}":', end='{\n')
    print(f'"questions":', end='[\n')

    q_id = 1
    for s in source:
        for t in target:
            for vs_method in showdown:
                print('', end='{\n')
                
                if random.randint(0,1) == 0:
                    print(f'"questionIndex": {q_id},')
                    print(f'"refAudio": "assets/audio/ref/{t}_{question[(s,t,vs_method[0],vs_method[1])][set_id]}.wav",')
                    print(f'"method1Audio": "assets/audio/{vs_method[0]}/{s}_{t}_{question[(s,t,vs_method[0],vs_method[1])][set_id]}.wav",')
                    print(f'"method2Audio": "assets/audio/{vs_method[1]}/{s}_{t}_{question[(s,t,vs_method[0],vs_method[1])][set_id]}.wav"')
                else:                
                    print(f'"questionIndex": {q_id},')
                    print(f'"refAudio": "assets/audio/ref/{t}_{question[(s,t,vs_method[0],vs_method[1])][set_id]}.wav",')
                    print(f'"method1Audio": "assets/audio/{vs_method[1]}/{s}_{t}_{question[(s,t,vs_method[0],vs_method[1])][set_id]}.wav",')
                    print(f'"method2Audio": "assets/audio/{vs_method[0]}/{s}_{t}_{question[(s,t,vs_method[0],vs_method[1])][set_id]}.wav"')

                if q_id < 32:
                    print('', end='},\n')
                else:
                    print('', end='}\n')

                q_id += 1

    print('', end=']\n')

    if set_id < 24:
        print('', end='},\n')
    else:
        print('', end='}\n')

print('', end='}\n')
