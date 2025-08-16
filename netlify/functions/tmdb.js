const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Example: /tmdb?path=movie/popular&page=1
  const path = event.queryStringParameters.path || "movie/popular";
  const page = event.queryStringParameters.page || 1;

  const apiUrl = `https://api.themoviedb.org/3/${path}?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=${page}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch data" }),
    };
  }
};
