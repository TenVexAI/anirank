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

export async function searchAnime(search, page = 1, perPage = 10) {
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: SEARCH_ANIME_QUERY,
      variables: { search, page, perPage },
    }),
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
