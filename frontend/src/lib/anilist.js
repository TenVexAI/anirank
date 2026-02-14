const ANILIST_API_URL = import.meta.env.VITE_ANILIST_API_URL || 'https://graphql.anilist.co';

const SEARCH_ANIME_QUERY = `
query SearchAnime($search: String!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      id
      title {
        english
        romaji
        native
      }
      synonyms
      coverImage {
        large
      }
      bannerImage
      format
      status
      source
      genres
      tags {
        name
        rank
        isMediaSpoiler
      }
      description(asHtml: false)
      averageScore
      episodes
      duration
      studios {
        nodes {
          name
          isAnimationStudio
        }
      }
      trailer {
        id
        site
        thumbnail
      }
      externalLinks {
        site
        url
        type
      }
      relations {
        edges {
          relationType
          node {
            id
            title {
              english
              romaji
            }
            format
            status
            coverImage {
              medium
            }
          }
        }
      }
      siteUrl
    }
  }
}
`;

const SEARCH_CHARACTER_QUERY = `
query SearchCharacter($search: String!, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    characters(search: $search, sort: SEARCH_MATCH) {
      id
      name {
        full
        native
        userPreferred
      }
      image {
        large
        medium
      }
      media(perPage: 3, type: ANIME) {
        nodes {
          id
          title {
            english
            romaji
          }
          coverImage {
            medium
          }
        }
      }
    }
  }
}
`;

const BROWSE_ANIME_QUERY = `
query BrowseAnime($page: Int, $perPage: Int, $search: String, $genre_in: [String], $seasonYear: Int, $season: MediaSeason, $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort], $isAdult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media(type: ANIME, search: $search, genre_in: $genre_in, seasonYear: $seasonYear, season: $season, format: $format, status: $status, sort: $sort, isAdult: $isAdult) {
      id
      title {
        english
        romaji
        native
      }
      coverImage {
        large
      }
      bannerImage
      format
      status
      source
      genres
      tags {
        name
        rank
        isMediaSpoiler
      }
      description(asHtml: false)
      averageScore
      meanScore
      popularity
      trending
      favourites
      episodes
      duration
      season
      seasonYear
      startDate { year month day }
      studios {
        nodes {
          name
          isAnimationStudio
        }
      }
      trailer {
        id
        site
        thumbnail
      }
      externalLinks {
        site
        url
        type
      }
      siteUrl
    }
  }
}
`;

async function anilistFetch(query, variables) {
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After');
    if (response.status === 429 && retryAfter) {
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
    }
    throw new Error(`AniList API error: ${response.status}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join(', '));
  }

  return json.data.Page;
}

export async function searchAnime(search, page = 1, perPage = 10) {
  return anilistFetch(SEARCH_ANIME_QUERY, { search, page, perPage });
}

export async function searchCharacters(search, page = 1, perPage = 10) {
  return anilistFetch(SEARCH_CHARACTER_QUERY, { search, page, perPage });
}

export async function browseAnime(filters = {}, page = 1, perPage = 24) {
  const variables = { page, perPage, isAdult: false };
  if (filters.search) variables.search = filters.search;
  if (filters.genres?.length) variables.genre_in = filters.genres;
  if (filters.year) variables.seasonYear = filters.year;
  if (filters.season) variables.season = filters.season;
  if (filters.format) variables.format = filters.format;
  if (filters.status) variables.status = filters.status;
  variables.sort = filters.sort ? [filters.sort] : ['TRENDING_DESC'];
  return anilistFetch(BROWSE_ANIME_QUERY, variables);
}
