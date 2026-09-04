const SOURCE = 'https://itemshop.gg/valorant';

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&nbsp;/g, ' ')
  .replace(/<br\s*\/?>(\n)?/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ').trim();

const images = (html) => {
  const out = [];
  const re = /<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0]; const src = m[1];
    const alt = (tag.match(/\balt=["']([^"']*)["']/i) || [,''])[1];
    if ((src.includes('cdn.locker.gg') || src.includes('valorant-api.com')) && alt && !/^image$/i.test(alt)) {
      out.push({name: decode(alt.replace(/^Image:\s*/i,'')), image: src});
    }
  }
  return out;
};

const prices = (text) => [...text.matchAll(/\b\d{2,}(?:,\d{3})*\b/g)].map(x => Number(x[0].replace(/,/g,'')));

function parseShop(html) {
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
  const sections = [...cleanHtml.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => ({title: decode(m[1]), index: m.index, end: m.index + m[0].length}));
  const featuredIndex = sections.findIndex(s => s.title.toLowerCase() === 'featured bundles');
  if (featuredIndex < 0) throw new Error('Featured Bundles heading not found');
  const faqIndex = sections.findIndex((s, i) => i > featuredIndex && s.title.toLowerCase().includes('valorant'));
  const stop = faqIndex > 0 ? faqIndex : sections.length;

  const featuredStart = sections[featuredIndex].end;
  const featuredEnd = sections[featuredIndex + 1]?.index ?? cleanHtml.length;
  const featuredChunk = cleanHtml.slice(featuredStart, featuredEnd);
  const featuredImgs = images(featuredChunk);
  const featuredPrices = prices(decode(featuredChunk));
  const featuredNames = featuredImgs.filter((x,i,a)=>a.findIndex(y=>y.name===x.name)===i).slice(0, 8);

  const detailSections = [];
  for (let i = featuredIndex + 1; i < stop; i++) {
    const s = sections[i]; const end = sections[i+1]?.index ?? cleanHtml.length;
    const chunk = cleanHtml.slice(s.end, end);
    const imgs = images(chunk).filter((x,j,a)=>a.findIndex(y=>y.name===x.name)===j);
    const ps = prices(decode(chunk));
    detailSections.push({name:s.title, items:imgs.map((img,j)=>({name:img.name,type:'cosmetic',image:img.image,price:ps[j] ?? null}))});
  }

  return featuredNames.map((b,i) => {
    const detail = detailSections.find(d=>d.name.toLowerCase()===b.name.toLowerCase()) || detailSections[i];
    return {name:b.name,image:b.image,price:featuredPrices[i]??null,items:detail?.items||[]};
  }).filter(x=>x.name && !/featured bundles/i.test(x.name));
}

export default async function handler(req,res){
  try{
    const r=await fetch(SOURCE,{headers:{'user-agent':'VALORANT-Shop-Live/1.0'}});
    if(!r.ok) throw new Error(`upstream ${r.status}`);
    const html=await r.text(); const bundles=parseShop(html);
    res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
    res.status(200).json({ok:true,source:SOURCE,fetchedAt:new Date().toISOString(),bundles});
  }catch(e){
    res.status(502).json({ok:false,error:'Live store source is temporarily unavailable.'});
  }
}