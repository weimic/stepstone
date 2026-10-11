### numberbatch (160 dims, int8)

Pairs scored: 116 should-link, 51 should-not, 20 borderline. Median rank: link 16, not 10065, borderline 490. AUC (link ranked closer than non-link): 0.999

| K | links accepted | non-links rejected | borderline accepted |
| ---: | ---: | ---: | ---: |
| 50 | 74% | 100% | 15% |
| 100 | 83% | 100% | 20% |
| 150 | 88% | 100% | 25% |
| 200 | 90% | 100% | 25% |
| 300 | 94% | 100% | 35% |
| 400 | 94% | 100% | 40% |
| 600 | 97% | 100% | 60% |
| 800 | 98% | 100% | 60% |
| 1200 | 99% | 98% | 65% |

Weakest should-link pairs: sand-castle (2400), river-stone (1045), cheese-mouse (784), dragon-fire (722), key-piano (584), chalk-board (417), snowman-carrot (411), owl-night (296)
Closest should-not pairs: cookie-glacier (1019), cabbage-orchestra (1858), lemon-lighthouse (2022), umbrella-penguin (2370), saddle-yogurt (2884)
Borderline: honey-tea (90), tea-cozy (971), cozy-sweater (204), warmth-sweater (426), hive-warmth (4716), honey-sweater (17068), moon-cheese (4383), pond-lily (519), frog-prince (280), river-bridge (7), stone-soup (16099), cookie-jar (37), winter-cozy (462), autumn-sweater (537), rain-puddle (127), library-quiet (11127), candle-birthday (346), garden-gnome (2164), owl-wise (1862), bread-oven (48)

Top-300 neighbour overlap vs float 300d: 83.7%

### Everyday pairs (held out)

| kind | pairs | vectors only | with phrase links |
| --- | ---: | ---: | ---: |
| compound | 95 | 44% | 95% |
| assoc | 52 | 87% | 88% |

Still out of reach: sun-set, cotton-candy, life-jacket, rocking-chair, sun-hat, park-swing, park-tree, kitten-yarn, scarf-winter, frog-lily, fox-forest
