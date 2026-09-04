const { openSession, bearer } = require('./_session');
const VP = '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741';
const RAD = 'e59aa87c-4cbf-517a-5983-6e81511be9b7';
const PLATFORM = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
let assets = null;
async function loadAssets(){
  if(assets) return assets;
  const r=await fetch('https://valorant-api.com/v1/weapons/skins');
  if(!r.ok) throw new Error('Could not load VALORANT skin metadata.');
  const skins=(await r.json()).data||[]; const byId=new Map();
  for(const skin of skins){byId.set(String(skin.uuid).toLowerCase(),skin);for(const level of skin.levels||[])byId.set(String(level.uuid).toLowerCase(),skin)}
  assets=byId; return assets;
}
async function clientVersion(){try{const r=await fetch('https://valorant-api.com/v1/version');if(r.ok)return (await r.json()).data?.riotClientVersion||''}catch{}return ''}
async function riotJson(url,s,method='GET',body){
  const v=await clientVersion(); const r=await fetch(url,{method,headers:{Authorization:`Bearer ${s.accessToken}`,'X-Riot-Entitlements-JWT':s.entitlementsToken,'X-Riot-ClientPlatform':PLATFORM,...(v?{'X-Riot-ClientVersion':v}:{}),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text(); let d={}; try{d=JSON.parse(text)}catch{}
  if(!r.ok){if(r.status===400&&d.errorCode==='BAD_CLAIMS')throw new Error('Your Riot session expired. Please sign in again.');if(r.status===429)throw new Error('VALORANT rate-limited the request. Please try again shortly.');throw new Error(`VALORANT store request failed (${r.status}).`)}
  return d;
}
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'GET required'});
  const session=openSession(bearer(req));
  if(!session)return res.status(401).json({ok:false,signedIn:false,error:'Sign in again.'});
  try{
    const store=await riotJson(`https://pd.${session.shard}.a.pvp.net/store/v3/storefront/${session.puuid}`,session,'POST',{});
    let wallet={}; try{wallet=await riotJson(`https://pd.${session.shard}.a.pvp.net/store/v1/wallet/${session.puuid}`,session)}catch{}
    const byId=await loadAssets();
    const raw=store?.SkinsPanelLayout?.SingleItemStoreOffers||store?.SkinsPanelLayout?.SingleItemOffers||[];
    const offers=raw.map(o=>{const id=String(o.OfferID||'').toLowerCase();const rewardId=String(o.Rewards?.[0]?.ItemID||'').toLowerCase();const skin=byId.get(id)||byId.get(rewardId);return {uuid:skin?.uuid||o.OfferID,name:skin?.displayName||'Unknown Skin',image:skin?.displayIcon||skin?.chromas?.[0]?.fullRender||'',price:Number(o.Cost?.[VP]??0),tier:skin?.contentTierUuid||null}});
    const remaining=Number(store?.SkinsPanelLayout?.SingleItemOffersRemainingDurationInSeconds||0);
    res.setHeader('Cache-Control','private, no-store');
    res.status(200).json({ok:true,account:session.account,fetchedAt:new Date().toISOString(),expiresAt:Date.now()+remaining*1000,secondsRemaining:remaining,offers,wallet:{vp:Number(wallet?.Balances?.[VP]??0),radianite:Number(wallet?.Balances?.[RAD]??0)}});
  }catch(e){console.error('Shop fetch error:',e.message);res.status(502).json({ok:false,error:e.message||'Could not load your shop.'})}
};
