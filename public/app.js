const $ = (id) => document.getElementById(id);
let chart;
let activeCity = "Pune";
let lastForecast = null;

const weatherCodes = {
  0:["Clear sky","☀"],1:["Mainly clear","🌤"],2:["Partly cloudy","⛅"],3:["Overcast","☁"],
  45:["Foggy","🌫"],48:["Rime fog","🌫"],51:["Light drizzle","🌦"],53:["Drizzle","🌦"],55:["Heavy drizzle","🌧"],
  56:["Freezing drizzle","🌧"],57:["Freezing drizzle","🌧"],61:["Light rain","🌦"],63:["Rain","🌧"],65:["Heavy rain","🌧"],
  66:["Freezing rain","🌧"],67:["Freezing rain","🌧"],71:["Light snow","🌨"],73:["Snow","🌨"],75:["Heavy snow","❄"],
  77:["Snow grains","🌨"],80:["Rain showers","🌦"],81:["Rain showers","🌧"],82:["Heavy showers","⛈"],
  85:["Snow showers","🌨"],86:["Heavy snow showers","❄"],95:["Thunderstorm","⛈"],96:["Thunderstorm with hail","⛈"],99:["Severe thunderstorm","⛈"]
};
function codeInfo(code){return weatherCodes[code] || ["Current conditions","🌤"];}
function fmtTime(value){if(!value)return "--:--";return new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});}
function dayName(value, index){return index===0?"Today":new Date(value+"T12:00:00").toLocaleDateString([], {weekday:"short"});}
function setNotice(message, show=true){$("notice").textContent=message;$("notice").classList.toggle("show",show);}
function uvText(value){if(value<=2)return "Low";if(value<=5)return "Moderate";if(value<=7)return "High";if(value<=10)return "Very high";return "Extreme";}
function windDirection(deg){return ["N","NE","E","SE","S","SW","W","NW"][Math.round(deg/45)%8];}
function localTimeNow(timezone){return new Intl.DateTimeFormat([], {weekday:"long",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:timezone}).format(new Date());}
function weatherTip(current, daily){
  if(current.uv_index>=6)return "UV levels are high. Consider shade, sunscreen and sunglasses around midday.";
  if(current.precipitation>0 || (daily.precipitation_probability_max?.[0]||0)>=50)return "Rain is possible today. Keep an umbrella handy if you are heading out.";
  if(current.wind_speed_10m>=30)return "It is breezy outside. Secure loose items and take care while cycling.";
  if(current.temperature_2m>=32)return "Warm conditions expected. Drink water regularly and avoid prolonged midday heat.";
  if(current.temperature_2m<=12)return "Cool conditions today. A light jacket may be useful outdoors.";
  return "Conditions look fairly comfortable. Check the hourly outlook before planning outdoor activities.";
}
function insightText(current, daily){
  const label=codeInfo(current.weather_code)[0].toLowerCase();
  const hi=Math.round(daily.temperature_2m_max[0]), lo=Math.round(daily.temperature_2m_min[0]);
  const rain=daily.precipitation_probability_max?.[0]||0;
  return `Expect ${label.toLowerCase()} with temperatures ranging from ${lo}°C to ${hi}°C. Relative humidity is ${Math.round(current.relative_humidity_2m)}% and the wind is moving at ${Math.round(current.wind_speed_10m)} km/h.${rain>=40?` Rain probability reaches ${rain}% today, so plan outdoor activities accordingly.`:""} Use the hourly chart for a closer look at changing temperatures.`;
}
async function geocode(city){
  const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  if(!response.ok)throw new Error("Could not search for this city.");
  const data=await response.json();
  if(!data.results?.length)throw new Error("City not found. Try a different spelling.");
  return data.results[0];
}
async function fetchForecast(place){
  const params=new URLSearchParams({
    latitude:place.latitude,longitude:place.longitude,
    current:"temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m",
    hourly:"temperature_2m,precipitation_probability,uv_index,visibility,weather_code",
    daily:"weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",
    forecast_days:"7",timezone:"auto"
  });
  const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if(!response.ok)throw new Error("Weather service is temporarily unavailable.");
  return response.json();
}
function renderChart(data){
  const nowIndex=Math.max(0,data.hourly.time.findIndex(t=>t>=data.current.time));
  const start=nowIndex<0?0:nowIndex;
  const times=data.hourly.time.slice(start,start+24);
  const temps=data.hourly.temperature_2m.slice(start,start+24);
  const labels=times.map(t=>new Date(t).toLocaleTimeString([],{hour:"numeric"}));
  const ctx=$("hourlyChart").getContext("2d");
  if(chart)chart.destroy();
  const gradient=ctx.createLinearGradient(0,0,0,210);gradient.addColorStop(0,"rgba(78,125,241,.23)");gradient.addColorStop(1,"rgba(78,125,241,0)");
  chart=new Chart(ctx,{type:"line",data:{labels,datasets:[{data:temps,borderColor:"#4e7df1",borderWidth:2.5,backgroundColor:gradient,fill:true,tension:.38,pointRadius:0,pointHoverRadius:5,pointHoverBackgroundColor:"#4e7df1"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{displayColors:false,callbacks:{label:c=>`${Math.round(c.raw)}°C`}}},interaction:{intersect:false,mode:"index"},scales:{x:{grid:{display:false},ticks:{color:"#99a6ba",maxTicksLimit:8,font:{size:9}}},y:{grid:{color:"rgba(150,165,190,.16)"},ticks:{color:"#99a6ba",font:{size:9},callback:v=>`${v}°`},border:{display:false}}}}});
  const min=Math.round(Math.min(...temps)),max=Math.round(Math.max(...temps));
  $("chartSummary").textContent=`${min}°–${max}°C expected over the next 24 hours`;
}
function renderDaily(daily){
  $("dailyForecast").innerHTML=daily.time.map((date,i)=>{
    const info=codeInfo(daily.weather_code[i]);
    const rain=daily.precipitation_probability_max?.[i]||0;
    return `<div class="day-card ${i===0?"today":""}"><div class="day-name">${dayName(date,i)}</div><div class="day-icon" title="${info[0]}">${info[1]}</div><div class="day-temps"><span>${Math.round(daily.temperature_2m_max[i])}°</span><span>${Math.round(daily.temperature_2m_min[i])}°</span></div><div class="day-rain">☂ ${rain}%</div></div>`;
  }).join("");
}
function renderCurrent(place,data){
  const c=data.current,d=data.daily,h=data.hourly;
  const info=codeInfo(c.weather_code);
  const nowIndex=Math.max(0,h.time.findIndex(t=>t>=c.time));
  $("locationName").textContent=[place.name,place.admin1,place.country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(", ");
  $("currentDate").textContent=localTimeNow(data.timezone);
  $("temperature").textContent=`${Math.round(c.temperature_2m)}°`;
  $("weatherIcon").textContent=info[1];
  $("condition").textContent=info[0];
  $("feelsLike").textContent=`${Math.round(c.apparent_temperature)}°C`;
  $("todayHigh").textContent=`${Math.round(d.temperature_2m_max[0])}°`;
  $("todayLow").textContent=`${Math.round(d.temperature_2m_min[0])}°`;
  $("humidity").textContent=Math.round(c.relative_humidity_2m);
  $("humidityBar").style.width=`${Math.max(0,Math.min(100,c.relative_humidity_2m))}%`;
  $("wind").textContent=Math.round(c.wind_speed_10m);
  $("windDirection").textContent=windDirection(c.wind_direction_10m);
  const uv=h.uv_index[nowIndex]??d.uv_index_max[0]??0;
  $("uv").textContent=Number(uv).toFixed(1);
  $("uvLabel").textContent=uvText(uv);
  $("pressure").textContent=Math.round(c.pressure_msl);
  const visibility=(h.visibility[nowIndex]??10000)/1000;
  $("visibility").textContent=visibility.toFixed(1);
  $("visibilityLabel").textContent=visibility>=10?"Clear range":visibility>=5?"Moderate range":"Reduced range";
  $("precipitation").textContent=Number(c.precipitation||0).toFixed(1);
  $("rainChance").textContent=`${h.precipitation_probability[nowIndex]??0}% chance`;
  $("sunrise").textContent=fmtTime(d.sunrise[0]);
  $("sunset").textContent=fmtTime(d.sunset[0]);
  const minutes=Math.max(0,(new Date(d.sunset[0])-new Date(d.sunrise[0]))/60000);
  $("daylight").textContent=`${Math.floor(minutes/60)}h ${Math.round(minutes%60)}m`;
  $("sunNote").textContent=`About ${Math.floor(minutes/60)} hours of daylight today.`;
  $("timezone").textContent=data.timezone;
  $("updatedAt").textContent=fmtTime(new Date().toISOString());
  $("weatherInsight").textContent=insightText(c,d);
  $("weatherTip").textContent=weatherTip(c,d);
  renderChart(data);renderDaily(d);
}
function getLocalHistory(){try{return JSON.parse(localStorage.getItem("weatherStationHistory")||"[]");}catch{return [];}}
function saveLocalHistory(record){
  const history=getLocalHistory().filter(x=>x.city.toLowerCase()!==record.city.toLowerCase());
  history.unshift(record);localStorage.setItem("weatherStationHistory",JSON.stringify(history.slice(0,8)));
}
function renderHistory(items, source){
  const local=getLocalHistory();
  const combined=[...items,...local].reduce((acc,item)=>{const key=(item.city||"").toLowerCase();if(key&&!acc.some(x=>x.city.toLowerCase()===key))acc.push(item);return acc;},[]).slice(0,8);
  $("historyList").innerHTML=combined.length?combined.map(item=>`<div class="history-item"><div><div class="history-city">${escapeHtml(item.city)}${item.country?`, ${escapeHtml(item.country)}`:""}</div><div class="history-meta">${item.searchedAt?new Date(item.searchedAt).toLocaleString(): "Saved on this device"}</div></div><div class="history-temp">${item.temperature==null?"—":`${Math.round(item.temperature)}°`}</div></div>`).join(""):'<div class="loading-row">Your recent searches will appear here.</div>';
  $("historySource").textContent=source==="mongodb"?"Recent searches synced from MongoDB and this browser.":"Recent searches are saved in this browser. Add MONGODB_URI to enable cloud history.";
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
async function loadHistory(){
  try{const res=await fetch("/api/history");const data=await res.json();renderHistory(data.items||[],data.source);}
  catch{renderHistory([],"local");}
}
async function searchCity(city){
  if(!city.trim())return;
  $("refreshBtn").disabled=true;$("refreshBtn").textContent="…";
  setNotice("Loading weather data…");
  try{
    const place=await geocode(city.trim());
    const data=await fetchForecast(place);
    activeCity=place.name;lastForecast={place,data};renderCurrent(place,data);
    const record={city:place.name,country:place.country||"",temperature:data.current.temperature_2m,condition:codeInfo(data.current.weather_code)[0],searchedAt:new Date().toISOString()};
    saveLocalHistory(record);
    fetch("/api/history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(record)}).catch(()=>{});
    await loadHistory();
    setNotice(`Weather updated for ${place.name}.`,false);
  }catch(err){setNotice(err.message||"Unable to load weather. Check your internet connection.");}
  finally{$("refreshBtn").disabled=false;$("refreshBtn").textContent="↻";}
}
$("searchForm").addEventListener("submit",e=>{e.preventDefault();searchCity($("cityInput").value);});
$("refreshBtn").addEventListener("click",()=>searchCity(activeCity));
$("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("weatherStationTheme",document.body.classList.contains("dark")?"dark":"light");if(lastForecast)renderChart(lastForecast.data);});
$("clearHistory").addEventListener("click",()=>{localStorage.removeItem("weatherStationHistory");loadHistory();});
if(localStorage.getItem("weatherStationTheme")==="dark")document.body.classList.add("dark");
searchCity("Pune");
