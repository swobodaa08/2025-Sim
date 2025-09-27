import re

# Príklad vstupného textu (vložíš svoj celý zoznam)
data = """
Team: MŠK Žilina
elo: 999
goals_scored: 12
goals_conceded: 4
yellow: 73
red: 8
win: 5
draw: 1
loss: 0

Team: FK Železiarne Podbrezová
elo: 987
goals_scored: 12
goals_conceded: 6
yellow: 73
red: 8
win: 4
draw: 1
loss: 1

Team: FC Spartak Trnava
elo: 980
goals_scored: 11
goals_conceded: 4
yellow: 73
red: 8
win: 4
draw: 0
loss: 2

Team: MFK Ružomberok
elo: 967
goals_scored: 13
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: FC Petržalka
elo: 960
goals_scored: 13
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: ŠK Slovan Bratislava futbal
elo: 955
goals_scored: 16
goals_conceded: 6
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: FC TATRAN Prešov
elo: 945
goals_scored: 8
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 0
loss: 3

Team: MFK Dukla Banská Bystrica
elo: 938
goals_scored: 7
goals_conceded: 10
yellow: 73
red: 8
win: 2
draw: 2
loss: 2

Team: FK DAC 1904 Dunajská Streda
elo: 935
goals_scored: 10
goals_conceded: 7
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: MFK Zemplín Michalovce
elo: 920
goals_scored: 9
goals_conceded: 10
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: FC KOŠICE
elo: 917
goals_scored: 6
goals_conceded: 10
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: AS Trenčín
elo: 914
goals_scored: 13
goals_conceded: 14
yellow: 73
red: 8
win: 2
draw: 0
loss: 4

Team: MŠK FOMAT Martin
elo: 911
goals_scored: 6
goals_conceded: 11
yellow: 73
red: 8
win: 0
draw: 2
loss: 4

Team: FK POHRONIE Žiar nad Hronom Dolná Ždaňa
elo: 900
goals_scored: 3
goals_conceded: 30
yellow: 73
red: 8
win: 0
draw: 0
loss: 6

Team: FK Poprad
elo: 699
goals_scored: 13
goals_conceded: 2
yellow: 73
red: 8
win: 5
draw: 1
loss: 0

Team: MFK Zvolen
elo: 685
goals_scored: 13
goals_conceded: 4
yellow: 73
red: 8
win: 5
draw: 0
loss: 1

Team: MŠK Tesla Stropkov
elo: 681
goals_scored: 11
goals_conceded: 7
yellow: 73
red: 8
win: 4
draw: 1
loss: 1

Team: FK Humenné
elo: 674
goals_scored: 15
goals_conceded: 12
yellow: 73
red: 8
win: 4
draw: 1
loss: 1

Team: MFK Tatran Liptovský Mikuláš
elo: 677
goals_scored: 17
goals_conceded: 5
yellow: 73
red: 8
win: 3
draw: 3
loss: 0

Team: SLAVOJ TREBIŠOV
elo: 670
goals_scored: 13
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 2
loss: 2

Team: MŠK NOVOHRAD Lučenec
elo: 680
goals_scored: 17
goals_conceded: 9
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: FK Spišská Nová Ves
elo: 668
goals_scored: 11
goals_conceded: 11
yellow: 73
red: 8
win: 3
draw: 1
loss: 2

Team: MŠK Námestovo
elo: 654
goals_scored: 16
goals_conceded: 11
yellow: 73
red: 8
win: 3
draw: 1
loss: 2


Team: MFK Snina
elo: 649
goals_scored: 10
goals_conceded: 18
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: MFK Dolný Kubín
elo: 637
goals_scored: 4
goals_conceded: 12
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: FC LOKOMOTÍVA KOŠICE
elo: 630
goals_scored: 6
goals_conceded: 16
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: MFK Vranov nad Topľou
elo: 621
goals_scored: 4
goals_conceded: 10
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: FK GALAKTIK
elo: 616
goals_scored: 8
goals_conceded: 19
yellow: 73
red: 8
win: 1
draw: 1
loss: 4

Team: Partizán Bardejov BŠK
elo: 609
goals_scored: 5
goals_conceded: 16
yellow: 73
red: 8
win: 0
draw: 2
loss: 4

Team: MFK Skalica
elo: 699
goals_scored: 25
goals_conceded: 3
yellow: 73
red: 8
win: 6
draw: 1
loss: 0

Team: FC ViOn Zlaté Moravce - Vráble
elo: 695
goals_scored: 19
goals_conceded: 9
yellow: 73
red: 8
win: 5
draw: 1
loss: 1

Team: FK Nitra
elo: 690
goals_scored: 17
goals_conceded: 14
yellow: 73
red: 8
win: 3
draw: 2
loss: 2

Team: FK Spartak Dubnica nad Váhom
elo: 687
goals_scored: 21
goals_conceded: 7
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: MŠK Púchov
elo: 681
goals_scored: 7
goals_conceded: 3
yellow: 73
red: 8
win: 3
draw: 2
loss: 1

Team: FC ŠTK 1914 Šamorín
elo: 680
goals_scored: 16
goals_conceded: 23
yellow: 73
red: 8
win: 3
draw: 1
loss: 3

Team: FK Dúbravka
elo: 670
goals_scored: 14
goals_conceded: 19
yellow: 73
red: 8
win: 2
draw: 3
loss: 2

Team: OK Častkovce
elo: 666
goals_scored: 17
goals_conceded: 22
yellow: 73
red: 8
win: 3
draw: 0
loss: 4

Team: FKM Karlova Ves Bratislava
elo: 660
goals_scored: 9
goals_conceded: 8
yellow: 73
red: 8
win: 3
draw: 0
loss: 3

Team: SDM Domino
elo: 649
goals_scored: 20
goals_conceded: 16
yellow: 73
red: 8
win: 2
draw: 2
loss: 2

Team: KFC Komárno futbal
elo: 647
goals_scored: 12
goals_conceded: 15
yellow: 73
red: 8
win: 2
draw: 2
loss: 2

Team: FK Senica
elo: 645
goals_scored: 12
goals_conceded: 12
yellow: 73
red: 8
win: 1
draw: 4
loss: 2

Team: FK Inter Bratislava
elo: 641
goals_scored: 15
goals_conceded: 17
yellow: 73
red: 8
win: 2
draw: 1
loss: 3

Team: FK Lokomotíva Trnava
elo: 638
goals_scored: 12
goals_conceded: 16
yellow: 73
red: 8
win: 2
draw: 0
loss: 5

Team: MŠK Senec
elo: 628
goals_scored: 4
goals_conceded: 11
yellow: 73
red: 8
win: 0
draw: 3
loss: 4

Team: MŠK Považská Bystrica
elo: 619
goals_scored: 2
goals_conceded: 27
yellow: 73
red: 8
win: 1
draw: 0
loss: 6

Team: MŠK Kysucké Nové Mesto
elo: 630
goals_scored: 44
goals_conceded: 4
yellow: 73
red: 8
win: 8
draw: 0
loss: 0

Team: MFK Dukla Banská Bystrica B
elo: 690
goals_scored: 95
goals_conceded: 0
yellow: 73
red: 8
win: 7
draw: 0
loss: 0

Team: TJ Tatran Krásno nad Kysucou
elo: 600
goals_scored: 32
goals_conceded: 4
yellow: 73
red: 8
win: 6
draw: 0
loss: 1

Team: FK ATTACK Vrútky
elo: 582
goals_scored: 23
goals_conceded: 12
yellow: 73
red: 8
win: 5
draw: 0
loss: 3

Team: ŠK Prameň Kováčová
elo: 579
goals_scored: 24
goals_conceded: 20
yellow: 73
red: 8
win: 4
draw: 1
loss: 3

Team: MFK Bytča
elo: 589
goals_scored: 16
goals_conceded: 9
yellow: 73
red: 8
win: 4
draw: 0
loss: 2

Team: MFK Nová Baňa
elo: 560
goals_scored: 13
goals_conceded: 31
yellow: 73
red: 8
win: 4
draw: 0
loss: 4

Team: FK Čadca
elo: 570
goals_scored: 20
goals_conceded: 27
yellow: 73
red: 8
win: 4
draw: 0
loss: 4

Team: FK BREZNO
elo: 560
goals_scored: 22
goals_conceded: 33
yellow: 73
red: 8
win: 3
draw: 2
loss: 3

Team: MFK Detva
elo: 562
goals_scored: 14
goals_conceded: 22
yellow: 73
red: 8
win: 3
draw: 0
loss: 5

Team: FA UNITED NKLG
elo: 570
goals_scored: 20
goals_conceded: 27
yellow: 73
red: 8
win: 2
draw: 2
loss: 4

Team: MŠK Rimavská Sobota
elo: 530
goals_scored: 15
goals_conceded: 18
yellow: 73
red: 8
win: 2
draw: 1
loss: 4

Team: OFK Hôrky
elo: 500
goals_scored: 14
goals_conceded: 36
yellow: 73
red: 8
win: 2
draw: 1
loss: 5

Team: Oravan Oravská Jasenica
elo: 480
goals_scored: 17
goals_conceded: 20
yellow: 73
red: 8
win: 2
draw: 0
loss: 6

Team: TJ JEDNOTA Bánová
elo: 470
goals_scored: 10
goals_conceded: 43
yellow: 73
red: 8
win: 1
draw: 1
loss: 5

Team: ŠK SÁSOVÁ
elo: 290
goals_scored: 2
goals_conceded: 75
yellow: 73
red: 8
win: 0
draw: 0
loss: 8
"""

# Rozdelí na bloky podľa tímov
blocks = [b.strip() for b in data.strip().split('\n\n') if b.strip()]

# Získa ELO a blok
def get_elo(block):
    m = re.search(r'elo:\s*(\d+)', block)
    return int(m.group(1)) if m else 0

# Zoradí bloky podľa ELO zostupne
sorted_blocks = sorted(blocks, key=get_elo, reverse=True)

# Výpis
for block in sorted_blocks:
    print(block)
    print()