import { EXTRA } from './words-extra.js';

// Словарь для юзов. Три градации крутости:
//   1 — обычные слова, 2 — крутые/сленг/эстетика, 3 — топовые.
// Если слово есть в нескольких списках, побеждает более высокая градация.
// Только латиница a-z, длина от 3 символов.

const GRADE_1 = `
cat dog sun moon star sky sea lake river hill rock tree leaf wood grass rose lily daisy apple pear plum
lemon lime peach mango cherry berry melon grape bread cake pie milk tea coffee juice soda candy sugar salt
pepper honey cheese pizza burger taco sushi ramen noodle rice bean corn potato tomato onion carrot cookie
donut waffle pancake butter cream toast bacon egg ham
table chair lamp door window house home room bed sofa desk book pen paper note card map key lock box bag
hat cap shoe sock shirt coat dress ring watch clock phone
bear deer duck frog fish crab shark whale seal otter panda koala zebra horse sheep cow pig hen mouse rat
bat owl hawk eagle crow dove swan bee ant moth snail snake lizard turtle rabbit squirrel monkey camel
llama pony puppy kitten bunny
run jump walk swim dance sing play game win lose fast slow big small tall short happy lucky brave calm
free kind cool warm cold dark light soft hard sweet sour
red blue green pink black white gray brown purple orange yellow
day night week month year hour minute second today
cloud wind sand mud dust stone cliff cave forest field garden flower petal seed root branch
cup mug plate bowl fork spoon knife pan pot bottle glass jar
car bus train plane boat ship bike taxi road bridge street city town
man boy girl baby friend buddy mate pal bro sis kid
love hope joy fun smile laugh dream wish peace
ball goal team score race match kick
code app web net site link chat mail post text photo video music song band movie show
one two three four five six seven eight nine ten zero
north south east west up down left right
spring summer autumn winter monday friday sunday
gift prize toy doll puzzle
tulip orchid lotus bamboo cactus maple oak pine birch willow cedar
paint brush color shape line dot circle square
pocket wallet coin cash bank money price deal shop store market
school class math art
hero helper pilot chef doctor nurse farmer baker painter writer singer driver sailor
smart clever funny silly crazy sleepy lazy busy
cookie muffin jelly pudding syrup mint olive pasta salad soup steak fries chips popcorn
wave beach shell coast bay harbor pond puddle creek stream waterfall
bone tooth hair nose eye ear hand foot head heart
swing slide ladder tent camp trail path gate fence wall roof floor
bell drum flute harp piano guitar violin horn
sock scarf glove boot jacket
robin finch sparrow parrot penguin turkey goose
tail paw claw wing fur
hotel cafe diner bar club park zoo mall
pizza candle mirror pillow blanket curtain carpet
`;

const GRADE_2 = `
neon drip glow lunar solar cyber pixel glitch matrix vector quantum turbo nitro rocket laser sonic hyper
ultra mega super giga nano retro vapor wave synth bass beat drop remix vinyl radio disco funk soul jazz
rock punk metal grunge indie lofi chill mood vibes swag fresh fire ice frost snow blaze flame ember ash
smoke fog mist rain thunder lightning bolt spark flash shine shiny sparkle glitter silver steel iron
cobalt ruby jade onyx opal pearl amber coral velvet silk satin ghoul zombie vampire wraith specter spirit
yolo goat lit based cringe sus rizz sigma chad wojak pepe doge meme troll noob pro sweat clutch tryhard
gamer streamer hacker coder dev geek nerd techie bot droid android robot cyborg mecha
tokyo paris miami vegas london berlin dubai milan rome kyoto seoul bali ibiza monaco havana brooklyn
harlem soho venice sahara arctic tundra jungle desert canyon volcano glacier island oasis horizon zenith
vortex prism echo pulse orbit phase flux shift blur haze dusk dawn midnight twilight sunset sunrise
stellar astro cosmic lunatic mystic magic wild savage feral
jinx hex rune relic totem talisman amulet charm spell curse omen riddle enigma puzzle mirage
cobra falcon panther jaguar cheetah leopard lynx coyote mustang stallion hawk raptor condor kraken
hydra griffin sphinx golem goblin troll ogre elf dwarf orc
cash bucks bills stack paid bank wealth luxury velvet gucci
frozen toxic acid venom plasma cyan magenta indigo violet crimson scarlet azure ivory ebony
bonk yeet zoom boom bang pow zap bzz wham slam
night owl nomad drifter wander voyage pilot racer driver rider biker skater surfer
hustle grind focus rush chase ghosting stealth silent quiet shadowy
cinema studio vision visual canvas sketch mural poster artist
fusion hybrid vertex apex summit peak ridge
`;

const GRADE_3 = `
god king queen lord boss ace apex alpha omega zen void nova titan phantom shadow ghost venom viper raven
wolf fox lion tiger dragon phoenix reaper saint sin vibe flex rich gold diamond crown royal elite prime
legend myth fate karma chaos storm blade katana ninja samurai ronin hunter sniper rogue rebel outlaw
bandit mafia don capo mogul tycoon baron duke prince emperor kaiser tsar czar sultan pharaoh oracle
prophet sage monk guru master genius wizard mage witch demon angel devil lucifer hades zeus thor odin
loki ares atlas orion sirius vega lyra cosmos galaxy nebula quasar pulsar comet meteor eclipse aurora
`;

// ---------- категории ----------
// Все имена и ники — просто строки для игры, ни к каким реальным аккаунтам не привязаны.

// Короткие настоящие имена — ценятся выше обычных слов
const NAMES = `
alex max leo mia emma anna lisa nina kate lily zoe eva ava ella maya luna jack john mike tom ben sam dan
tim jake luke noah liam owen ryan adam eric finn ivan oleg igor misha dima vlad artem denis nikita sasha
masha dasha katya olga yana vera sofia diana alina milena arina kira lola bella chloe grace hannah julia
sara sarah nick kevin brian chris david james henry oliver oscar felix hugo theo jade ivy rose amy ada
leon marco paolo luca mateo diego carlos pablo sergio andre pierre jean louis hans karl otto
`;

// Мемы: классика — в топ, остальные — крутые
const MEMES_TOP = `pepe doge wojak gigachad sigma skibidi rizz ohio npc stonks amogus gyatt mewing`;
const MEMES = `
kek lol lmao bruh bonk simp copium hopium cope seethe ratio rekt pog poggers kappa lul omegalul sheesh slay
yass fam bestie nocap bussin karen boomer zoomer doomer cheems swole bazinga yeet vibecheck
trollface rickroll sussy baka kawaii uwu owo waifu otaku senpai
`;

// Известные люди и ники (блогеры, музыканты, спортсмены, технари) — самая дорогая категория
const STARS = `
elon musk durov messi ronaldo neymar mbappe haaland lebron kobe curry tyson mcgregor khabib drake eminem
rihanna beyonce kanye snoop travis weeknd bieber selena adele shakira madonna bowie elvis lennon marley
tupac biggie lizzo mrbeast pewdiepie markiplier ninja shroud tfue technoblade ibai rubius kizaru morgen
oxxy miyagi jobs gates bezos zuck vitalik satoshi nakamoto altman
`;

// Поп-культура: персонажи
const POP = `
mario luigi zelda link pikachu goku naruto batman joker yoda vader shrek elsa sonic kratos neo trinity
morpheus gandalf frodo hulk thanos ironman
`;


// Ключевые слова: то, за что платят владельцы каналов и брендов (новости, путешествия, крипта, ставки,
// магазины, работа). Цена за ключевик выше, чем за обычное слово.
const BIZ = `
news travel crypto bitcoin casino poker bet betting forex trade trader trading invest loan credit bank store market
deal sale promo coupon discount vpn hosting domain ads marketing agency studio design tech media radio games gaming
esports fitness health medical pharma beauty fashion food recipe jobs career remote freelance courses learn law legal
insurance estate realty rent cars auto taxi delivery finance wallet stock stocks nft token defi mining airdrop signals
bonus cashback giveaway lottery jackpot slots bingo dating anime movies cinema sport football soccer tennis hockey
boxing daily global official support help info service premium vip elite luxury shop money cash gold diamond startup
venture capital fund pay payment bills tax tour hotel flights ticket tickets booking cafe gym yoga salon barber tattoo
dental clinic lawyer academy college university exam tutor english china japan korea
`;

const parse = (s) => s.split(/\s+/).filter((w) => /^[a-z]{3,}$/.test(w));

// Порядок важен: при повторе побеждает более высокая градация,
// при равной — категория из списка ниже.
const LISTS = [
  { grade: 1, cat: 'word', list: GRADE_1 },
  { grade: 2, cat: 'word', list: GRADE_2 },
  { grade: 3, cat: 'word', list: GRADE_3 },
  { grade: 2, cat: 'biz', list: BIZ },
  { grade: 2, cat: 'name', list: NAMES },
  { grade: 2, cat: 'meme', list: MEMES },
  { grade: 3, cat: 'meme', list: MEMES_TOP },
  { grade: 2, cat: 'pop', list: POP },
  { grade: 3, cat: 'star', list: STARS },
];

export const WORD_GRADE = {};
export const WORD_CAT = {};
for (const { grade, cat, list } of LISTS) {
  for (const w of parse(list)) {
    if (!(w in WORD_GRADE) || grade >= WORD_GRADE[w]) {
      WORD_GRADE[w] = grade;
      WORD_CAT[w] = cat;
    }
  }
}

// «Корзины» для генератора: у каждой свой шанс при выборе слова
export const BUCKETS = { w1: [], w2: [], w3: [], biz: [], name: [], meme: [], star: [], pop: [] };
for (const w of Object.keys(WORD_GRADE)) {
  const c = WORD_CAT[w];
  if (c === 'word') BUCKETS[`w${WORD_GRADE[w]}`].push(w);
  else BUCKETS[c].push(w);
}

// Расширенный словарь: только для оценки, в «корзины» дропа не попадает
for (const w of parse(EXTRA)) {
  if (!(w in WORD_GRADE)) {
    WORD_GRADE[w] = 1;
    WORD_CAT[w] = 'word';
  }
}

export const WORD_COUNT = Object.keys(WORD_GRADE).length;
export const MAX_WORD_LEN = Math.max(...Object.keys(WORD_GRADE).map((w) => w.length));
