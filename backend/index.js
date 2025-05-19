require('dotenv').config();
const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const WEATHERAPI_KEY = process.env.OPENWEATHER_API_KEY;

app.post("/webhook", async (req, res) => {
  try {
    const intent = req.body.queryResult.intent.displayName;
    const parameters = req.body.queryResult.parameters;
    console.log("Intent:", intent);
    console.log("Parameters:", parameters);

    let responseText = "I'm not sure about that. Please try again.";

    const extractCity = (param) => {
      if (!param) return null;
      if (Array.isArray(param)) return param.length > 0 ? param[0] : null;
      if (typeof param === "string") return param;
      if (typeof param === "object" && param.city) return param.city;
      return null;
    };

   async function getCurrentWeather(city) {
  try {
    const url = `http://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city)}`;
    const res = await axios.get(url);
    const data = res.data;
    const temp = data.current.temp_c;
    const desc = data.current.condition.text;
    return `It's currently ${temp}°C with ${desc} in ${city}.`;
  } catch (error) {
    console.error("Error in getCurrentWeather:", error.response?.data || error.message);
    return `Sorry, I couldn't fetch the current weather for ${city}.`;
  }
}

async function getWeatherForecast(city, dateStr) {
  try {
    // WeatherAPI forecast endpoint supports up to 7 days
    const url = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city)}&days=7`;
    const res = await axios.get(url);
    const forecastDays = res.data.forecast.forecastday;

    const targetDate = new Date(dateStr);
    if (isNaN(targetDate)) {
      return `I couldn't understand the date ${dateStr}.`;
    }

    const today = new Date();
    const targetUTC = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const daysDiff = Math.round((targetUTC - todayUTC) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      return `You asked for a past date (${dateStr}). I can only provide forecasts for today and future dates.`;
    }
    if (daysDiff >= forecastDays.length) {
      return `I can only provide forecasts up to ${forecastDays.length} days in advance. Please ask about a date within that range.`;
    }

    const forecastForDate = forecastDays[daysDiff];
    if (!forecastForDate) {
      return `Sorry, I don't have forecast data for ${dateStr}.`;
    }

    const day = forecastForDate.day;
    const desc = day.condition.text;
    const maxTemp = day.maxtemp_c;
    const minTemp = day.mintemp_c;
    const chanceOfRain = day.daily_chance_of_rain || 0;
    const chanceOfSnow = day.daily_chance_of_snow || 0;

    let dateLabel;
    if (daysDiff === 0) dateLabel = "today";
    else if (daysDiff === 1) dateLabel = "tomorrow";
    else dateLabel = `on ${targetDate.toDateString()}`;

    let rainSnowPart = "";
    if (chanceOfRain > 0) rainSnowPart += ` There's a ${chanceOfRain}% chance of rain.`;
    if (chanceOfSnow > 0) rainSnowPart += ` There's a ${chanceOfSnow}% chance of snow.`;

    return `The forecast for ${dateLabel} in ${city} is a high of ${Math.round(maxTemp)}°C and a low of ${Math.round(minTemp)}°C with ${desc}.${rainSnowPart}`;
  } catch (error) {
    console.error("Error in getWeatherForecast:", error.response?.data || error.message);
    return `Sorry, I couldn't fetch the forecast for ${city} on ${dateStr}.`;
  }
}

async function getWeatherByTime(city, dateTimeStr) {
  try {
    // WeatherAPI forecast endpoint includes hourly data
    const url = `http://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city)}&days=2`;
    const res = await axios.get(url);
    const forecastDays = res.data.forecast.forecastday;

    const targetDate = new Date(dateTimeStr);
    if (isNaN(targetDate)) {
      return `I couldn't understand the time ${dateTimeStr}.`;
    }

    // Flatten hourly data from available days
    let allHourly = [];
    forecastDays.forEach(day => {
      allHourly = allHourly.concat(day.hour);
    });

    // Find closest hour to requested time
    let closestHour = allHourly.reduce((prev, curr) => {
      return Math.abs(new Date(curr.time).getTime() - targetDate.getTime()) < Math.abs(new Date(prev.time).getTime() - targetDate.getTime())
        ? curr
        : prev;
    });

    const temp = closestHour.temp_c;
    const desc = closestHour.condition.text;
    const localTime = closestHour.time;

    return `The weather in ${city} at ${localTime} will be ${temp}°C with ${desc}.`;
  } catch (error) {
    console.error("Error in getWeatherByTime:", error.response?.data || error.message);
    return `Sorry, I couldn't fetch the weather for ${city} at the requested time.`;
  }
}

async function compareWeather(city1, city2) {
  try {
    const [weather1, weather2] = await Promise.all([
      getCurrentWeather(city1),
      getCurrentWeather(city2),
    ]);

    // Fetch detailed data again for comparison (not just summary string)
    const url1 = `http://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city1)}`;
    const url2 = `http://api.weatherapi.com/v1/current.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(city2)}`;

    const [res1, res2] = await Promise.all([axios.get(url1), axios.get(url2)]);
    const data1 = res1.data.current;
    const data2 = res2.data.current;

    let comparison = `Current weather comparison between ${city1} and ${city2}:\n`;

    comparison += `${city1}: ${data1.temp_c}°C, ${data1.condition.text}\n`;
    comparison += `${city2}: ${data2.temp_c}°C, ${data2.condition.text}\n`;

    if (data1.temp_c > data2.temp_c) {
      comparison += `${city1} is warmer than ${city2}.`;
    } else if (data1.temp_c < data2.temp_c) {
      comparison += `${city2} is warmer than ${city1}.`;
    } else {
      comparison += `Both cities have the same temperature.`;
    }

    return comparison;
  } catch (error) {
    console.error("Error in compareWeather:", error.response?.data || error.message);
    return `Sorry, I couldn't compare the weather between ${city1} and ${city2}.`;
  }
}


    switch (intent) {
      case "Welcome Intent":
        responseText = "Hi! I'm Mausam, your personal weather assistant. Ask me about the weather anywhere!";
        break;

      case "Help Intent":
        responseText = "You can ask me about the current weather, tomorrow’s forecast, or compare two cities.";
        break;

      case "Current Weather Intent":
        {
          const city = extractCity(parameters["geo-city"] || parameters["location"]);
          responseText = city ? await getCurrentWeather(city) : "Please tell me the city you want the weather for.";
        }
        break;

      case "Weather Forecast Intent":
        {
          const city = extractCity(parameters["geo-city"] || parameters["location"]);
          let dateParam = parameters["date"] || parameters["@sys.date"] || parameters["date-time"];
          if (Array.isArray(dateParam)) dateParam = dateParam[0];

          if (!city) {
            responseText = "Please provide the city for the forecast.";
          } else if (!dateParam) {
            responseText = "Please provide the date you want the forecast for.";
          } else {
            const dateStr = new Date(dateParam).toISOString().split("T")[0];
            responseText = await getWeatherForecast(city, dateStr);
          }
        }
        break;

      case "Weather by Time Intent":
        {
          const city = extractCity(parameters["geo-city"] || parameters["location"]);
          const time = parameters["time"] || parameters["@sys.time"] || parameters["date-time"];
          if (!city) {
            responseText = "Please provide the city.";
          } else if (!time) {
            responseText = "Please provide the time you want the weather for.";
          } else {
            let dateTimeStr = time;
            if (parameters["date"]) {
              dateTimeStr = `${parameters["date"]}T${time}`;
            }
            responseText = await getWeatherByTime(city, dateTimeStr);
          }
        }
        break;

      case "Weather Comparison Intent":
        {
          let cities = parameters["geo-city"] || parameters["location"];
          if (!cities) {
            responseText = "Please provide two cities to compare.";
            break;
          }
          if (!Array.isArray(cities)) cities = [cities];
          if (cities.length < 2) {
            responseText = "Please provide two cities to compare.";
            break;
          }
          responseText = await compareWeather(cities[0], cities[1]);
        }
        break;

      case "Fallback Intent":
        responseText = "Sorry, I didn’t get that. Can you rephrase?";
        break;

      default:
        responseText = "I am not sure how to help with that. Please try asking about the weather.";
        break;
    }

    res.json({ fulfillmentText: responseText });
  } catch (error) {
    console.error("❌ Error in webhook:", error.response ? error.response.data : error.message);
    res.json({ fulfillmentText: "I couldn't fetch the weather. Please try again later." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Webhook server running on port ${port}`));
