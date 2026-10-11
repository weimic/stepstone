# Sanity-set evaluation (2026-10-09)

Vocabulary: 20,000 words.

### numberbatch (full 300 dims, float)

Pairs scored: 116 should-link, 51 should-not, 20 borderline. Median rank: link 13, not 10478, borderline 408. AUC (link ranked closer than non-link): 0.999

| K | links accepted | non-links rejected | borderline accepted |
| ---: | ---: | ---: | ---: |
| 50 | 79% | 100% | 10% |
| 100 | 87% | 100% | 30% |
| 150 | 90% | 100% | 30% |
| 200 | 93% | 100% | 35% |
| 300 | 95% | 100% | 45% |
| 400 | 97% | 100% | 50% |
| 600 | 98% | 100% | 55% |
| 800 | 98% | 100% | 70% |
| 1200 | 98% | 100% | 70% |

Weakest should-link pairs: river-stone (1590), sand-castle (1425), chalk-board (566), dragon-fire (512), snowman-carrot (322), cheese-mouse (313), toast-jam (283), key-piano (205)
Closest should-not pairs: lantern-spinach (1225), cabbage-orchestra (1398), umbrella-penguin (1796), cookie-glacier (2039), mitten-cactus (2041)
Borderline: honey-tea (96), tea-cozy (688), cozy-sweater (166), warmth-sweater (366), hive-warmth (4704), honey-sweater (11556), moon-cheese (3580), pond-lily (451), frog-prince (92), river-bridge (6), stone-soup (13104), cookie-jar (59), winter-cozy (264), autumn-sweater (711), rain-puddle (91), library-quiet (6287), candle-birthday (257), garden-gnome (691), owl-wise (1435), bread-oven (48)

### glove (full 300 dims, float)

Pairs scored: 116 should-link, 51 should-not, 20 borderline. Median rank: link 48, not 11172, borderline 679. AUC (link ranked closer than non-link): 0.981

| K | links accepted | non-links rejected | borderline accepted |
| ---: | ---: | ---: | ---: |
| 50 | 53% | 100% | 20% |
| 100 | 63% | 100% | 25% |
| 150 | 69% | 100% | 30% |
| 200 | 72% | 100% | 30% |
| 300 | 80% | 98% | 35% |
| 400 | 84% | 98% | 35% |
| 600 | 87% | 98% | 50% |
| 800 | 89% | 98% | 50% |
| 1200 | 91% | 96% | 55% |

Weakest should-link pairs: mitten-winter (14384), owl-night (5991), rain-umbrella (3297), chalk-board (2474), dragon-fire (2342), snowman-carrot (2263), key-piano (2015), butterfly-wing (1761)
Closest should-not pairs: acorn-laptop (237), mitten-cactus (1193), pillow-volcano (1290), pebble-trumpet (1806), candle-tractor (2158)
Borderline: honey-tea (84), tea-cozy (430), cozy-sweater (144), warmth-sweater (1597), hive-warmth (5211), honey-sweater (4736), moon-cheese (9935), pond-lily (29), frog-prince (812), river-bridge (4), stone-soup (2481), cookie-jar (6), winter-cozy (2342), autumn-sweater (2896), rain-puddle (2075), library-quiet (7653), candle-birthday (278), garden-gnome (547), owl-wise (443), bread-oven (42)
