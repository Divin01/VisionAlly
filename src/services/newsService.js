const API_KEY = '';
const API_BASE_URL = 'https://eventregistry.org/api/v1';

export class NewsService {
  static async getLatestNews(updatesAfterUri = null) {
    try {
      const requestBody = {
        apiKey: API_KEY,
        articleBodyLen: -1,
        includeArticleConcepts: true,
        includeArticleCategories: true,
        includeArticleImage: true,
        includeArticleTitle: true,
        includeArticleBasicInfo: true,
        includeArticleBody: true,
        keyword: [
          'violence',
          'gender based violence',
          'crime',
          'assault',
          'rape',
          'murder',
          'safety',
          'emergency',
          'police',
          'femicide',
          'domestic violence',
          'abuse',
          'sexual assault',
          'robbery',
          'hijacking',
          'kidnapping'
        ],
        keywordOper: 'or',
        lang: ['eng'],
        dataType: ['news'],
        locationUri: [
          'http://en.wikipedia.org/wiki/South_Africa',
          'http://en.wikipedia.org/wiki/Johannesburg'
        ],
        recentActivityArticlesMaxArticleCount: 50,
        isDuplicateFilter: 'skipDuplicates',
        includeSourceTitle: true,
        includeArticleAuthors: true,
        includeArticleSentiment: true
      };

      // Add updates after URI if provided
      if (updatesAfterUri) {
        requestBody.recentActivityArticlesNewsUpdatesAfterUri = updatesAfterUri;
      }

      const response = await fetch(`${API_BASE_URL}/minuteStreamArticles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.articles) {
        return {
          articles: data.articles,
          lastUri: data.articles.length > 0 ? data.articles[0].uri : updatesAfterUri
        };
      }
      
      return { articles: [], lastUri: updatesAfterUri };
    } catch (error) {
      console.error('Error fetching news:', error);
      return { articles: [], lastUri: updatesAfterUri };
    }
  }

  static formatArticle(article) {
    return {
      id: article.uri,
      title: article.title || 'No title available',
      description: article.body?.substring(0, 150) + '...' || 'No description available',
      image: article.image,
      source: article.source?.title || 'Unknown Source',
      url: article.url,
      time: article.dateTimePub ? 
        new Date(article.dateTimePub).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Recently',
      author: article.authors?.[0]?.name || '',
      location: article.location || 'South Africa',
      sentiment: article.sentiment || 0
    };
  }
}