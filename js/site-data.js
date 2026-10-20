// ===== ここを書き換えるとサイト全体に反映されます =====

window.SITE = {
  brand: "HOTEL BRAND",
  companyName: "株式会社〇〇〇〇",
  tagline: "旅の時間を、もっと深く。",
  heroCopy: "その土地にしかない時間へ。",
  heroSub: "季節と文化を味わう、わたしたちの宿",
  phone: "00-0000-0000",
  phoneHours: "受付 9:00〜20:00",
  email: "info@example.com",
  address: "〒000-0000 〇〇県〇〇市〇〇 0-0-0",
  reservationUrl: "",
  company: [
    ["会社名", "株式会社〇〇〇〇"],
    ["設立", "0000年0月"],
    ["代表者", "代表取締役 〇〇 〇〇"],
    ["所在地", "〒000-0000 〇〇県〇〇市〇〇 0-0-0"],
    ["事業内容", "ホテル・旅館の運営"],
    ["電話番号", "00-0000-0000"]
  ]
};

window.HERO_IMAGES = [
  "https://picsum.photos/seed/hotel-hero-1/1920/1080",
  "https://picsum.photos/seed/hotel-hero-2/1920/1080",
  "https://picsum.photos/seed/hotel-hero-3/1920/1080"
];

window.PURPOSES = [
  { id: "onsen", label: "温泉でくつろぐ", img: "https://picsum.photos/seed/purpose-onsen/600/800" },
  { id: "family", label: "家族で過ごす", img: "https://picsum.photos/seed/purpose-family/600/800" },
  { id: "anniversary", label: "記念日の旅", img: "https://picsum.photos/seed/purpose-anniv/600/800" },
  { id: "nature", label: "自然に浸る", img: "https://picsum.photos/seed/purpose-nature/600/800" },
  { id: "city", label: "街を楽しむ", img: "https://picsum.photos/seed/purpose-city/600/800" },
  { id: "solo", label: "ひとり旅", img: "https://picsum.photos/seed/purpose-solo/600/800" }
];

window.BRANDS = [
  { id: "luxury", label: "ラグジュアリー", desc: "圧倒的非日常を味わう、特別な滞在。" },
  { id: "ryokan", label: "温泉旅館", desc: "その土地の文化に触れる、上質な温泉旅館。" },
  { id: "resort", label: "リゾート", desc: "家族や仲間と、遊びつくすリゾート。" },
  { id: "city", label: "シティホテル", desc: "街に寝泊まりするように、観光を楽しむ。" }
];

window.REGIONS = [
  { id: "hokkaido", label: "北海道" },
  { id: "tohoku", label: "東北" },
  { id: "kanto", label: "関東" },
  { id: "chubu", label: "中部" },
  { id: "kinki", label: "近畿" },
  { id: "kyushu", label: "九州・沖縄" }
];

window.PROPERTIES = [
  {
    id: "a", name: "ホテル名 A", brand: "luxury", region: "kanto", area: "〇〇県 〇〇市",
    tags: ["anniversary", "nature"], badge: "",
    catch: "森に抱かれる、静寂の離れ",
    desc: "ここに施設の紹介文が入ります。立地、客室、食事、体験など、宿の魅力を2〜3文で伝えます。",
    features: ["全室露天風呂付き", "季節のコース料理", "森のアクティビティ"],
    phone: "00-0000-0001", address: "〇〇県〇〇市〇〇 0-0-0",
    img: "https://picsum.photos/seed/prop-a/900/700"
  },
  {
    id: "b", name: "ホテル名 B", brand: "ryokan", region: "tohoku", area: "〇〇県 〇〇温泉",
    tags: ["onsen", "anniversary"], badge: "",
    catch: "湯けむりと郷土の文化に浸る",
    desc: "ここに施設の紹介文が入ります。立地、客室、食事、体験など、宿の魅力を2〜3文で伝えます。",
    features: ["源泉かけ流し大浴場", "郷土の会席料理", "伝統工芸の体験"],
    phone: "00-0000-0002", address: "〇〇県〇〇市〇〇 0-0-0",
    img: "https://picsum.photos/seed/prop-b/900/700"
  },
  {
    id: "c", name: "ホテル名 C", brand: "resort", region: "kyushu", area: "〇〇県 〇〇島",
    tags: ["family", "nature"], badge: "2027年春 開業",
    catch: "海と遊ぶ、家族のための楽園",
    desc: "ここに施設の紹介文が入ります。立地、客室、食事、体験など、宿の魅力を2〜3文で伝えます。",
    features: ["プライベートビーチ", "キッズクラブ", "マリンアクティビティ"],
    phone: "00-0000-0003", address: "〇〇県〇〇郡〇〇 0-0-0",
    img: "https://picsum.photos/seed/prop-c/900/700"
  },
  {
    id: "d", name: "ホテル名 D", brand: "city", region: "kinki", area: "〇〇府 〇〇市",
    tags: ["city", "solo"], badge: "",
    catch: "街の魅力を、ご近所さんのように",
    desc: "ここに施設の紹介文が入ります。立地、客室、食事、体験など、宿の魅力を2〜3文で伝えます。",
    features: ["街歩きガイドツアー", "24時間ラウンジ", "駅から徒歩3分"],
    phone: "00-0000-0004", address: "〇〇府〇〇市〇〇 0-0-0",
    img: "https://picsum.photos/seed/prop-d/900/700"
  },
  {
    id: "e", name: "ホテル名 E", brand: "ryokan", region: "chubu", area: "〇〇県 〇〇温泉",
    tags: ["onsen", "solo"], badge: "リニューアル",
    catch: "山あいの湯で、ひとり静かに",
    desc: "ここに施設の紹介文が入ります。立地、客室、食事、体験など、宿の魅力を2〜3文で伝えます。",
    features: ["貸切露天風呂", "ひとり旅プラン", "地酒の飲み比べ"],
    phone: "00-0000-0005", address: "〇〇県〇〇郡〇〇 0-0-0",
    img: "https://picsum.photos/seed/prop-e/900/700"
  },
  {
    id: "f", name: "ホテル名 F", brand: "resort", region: "hokkaido", area: "北海道 〇〇郡",
    tags: ["family", "nature"], badge: "",
    catch: "雪と森の大自然を遊びつくす",
    desc: "ここに施設の紹介文が入ります。立地、客室、食事、体験など、宿の魅力を2〜3文で伝えます。",
    features: ["スキーイン・スキーアウト", "絶景テラス", "季節のネイチャーツアー"],
    phone: "00-0000-0006", address: "北海道〇〇郡〇〇 0-0-0",
    img: "https://picsum.photos/seed/prop-f/900/700"
  }
];

window.NEWS = [
  { date: "2026.10.01", label: "開業", title: "ホテル名 C、2027年春に開業決定", img: "https://picsum.photos/seed/news-1/800/600", propertyId: "c" },
  { date: "2026.09.15", label: "リニューアル", title: "ホテル名 E、全館リニューアルオープン", img: "https://picsum.photos/seed/news-2/800/600", propertyId: "e" },
  { date: "2026.09.01", label: "季節", title: "秋の紅葉を楽しむ特別プランのご案内", img: "https://picsum.photos/seed/news-3/800/600", propertyId: "a" },
  { date: "2026.08.20", label: "体験", title: "冬の雪あそびアクティビティ予約開始", img: "https://picsum.photos/seed/news-4/800/600", propertyId: "f" },
  { date: "2026.08.01", label: "お知らせ", title: "公式サイトをリニューアルしました", img: "https://picsum.photos/seed/news-5/800/600", propertyId: "" }
];
