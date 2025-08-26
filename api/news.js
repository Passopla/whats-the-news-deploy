import 'dotenv/config';
import fetch from 'node-fetch';

// This is the required Vercel serverless function signature.
// It must be the default export.
export default async function handler(req, res) 
    {
        // --- Manual CORS Handling ---
        // Manual Vercel headers in the function.
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*'); // Or specific domain
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
        // Handle the preflight OPTIONS request
        if (req.method === 'OPTIONS')
            {
                res.status(200).end();
                return;
            }

        // Get the API key from environment variables
        const apiKey = process.env.VITE_GUARDIAN_API_KEY;
        const apiUrl = process.env.VITE_GUARDIAN_API_URL;
        if (!apiKey || !apiUrl)
            {
                return res.status(500).json({ error: 'Server configuration error' });
            }

        // Get the category from `req.query` instead of an Express object.
        const category = req.query.category || 'general';
        console.log(`Received request for category: ${category}`);

        let fullGuardianUrl = '';

        const specialTags = 
            {
                'men': 'lifeandstyle/men',
                'women': 'lifeandstyle/women',
                'dating': 'lifeandstyle/dating',
                'family': 'lifeandstyle/family'
            };

        if (specialTags[category])
            {
            const tagToQuery = specialTags[category];
            fullGuardianUrl = `${apiUrl}?api-key=${apiKey}&page-size=50&show-fields=thumbnail,headline&tag=${tagToQuery}`;
            } else 
                {
                    let sectionsToQuery = '';
                    switch (category) 
                        {
                            // ... (your entire switch statement goes here, unchanged)
                            case 'music': sectionsToQuery = 'music'; break;
                            case 'film': sectionsToQuery = 'film'; break;
                            case 'technology': sectionsToQuery = 'technology'; break;
                            case 'lifeandstyle': sectionsToQuery = 'lifeandstyle'; break;
                            case 'travel': sectionsToQuery = 'travel'; break;
                            case 'artanddesign': sectionsToQuery = 'artanddesign'; break;
                            case 'tv-and-radio': sectionsToQuery = 'tv-and-radio'; break;
                            case 'health-and-wellbeing': sectionsToQuery = 'health-and-wellbeing'; break;
                            case 'family': sectionsToQuery = 'family'; break;
                            case 'world': sectionsToQuery = 'world'; break;
                            case 'politics': sectionsToQuery = 'politics'; break;
                            case 'business': sectionsToQuery = 'business'; break;
                            case 'science': sectionsToQuery = 'science'; break;
                            case 'wellness': sectionsToQuery = 'wellness'; break;
                            case 'general':
                            default:
                                sectionsToQuery = 'music|film|artanddesign|tv-and-radio';
                                break;
                        }
                    fullGuardianUrl = `${apiUrl}?api-key=${apiKey}&page-size=50&show-fields=thumbnail,headline&section=${sectionsToQuery}`;
                }

        console.log('Fetching from Guardian API:', fullGuardianUrl);

        try {
                const apiResponse = await fetch(fullGuardianUrl);
                const data = await apiResponse.json();
                // Use res.status().json() to send the response
                res.status(200).json(data);
            } catch (error) 
                {
                    console.error('Failed to fetch from Guardian API:', error);
                    res.status(500).json({ error: 'Failed to fetch news' });
                }
    }