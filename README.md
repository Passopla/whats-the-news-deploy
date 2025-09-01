# What's The News?

"What's The News?" is a fast-paced vocabulary game that challenges you to fill in the missing word in real headlines from around the globe. With a live feed of articles sourced directly from The Guardian's API, you can test your knowledge across a wide range of categories, from Technology and Science to Film and Art.

The game is built with a modern web stack, featuring a Phaser 3 front-end for the game client and a Node.js back-end (deployed as a serverless function on Vercel) to securely handle API requests.

**Play the live version on [itch.io](https://your-itch-io-link-here.itch.io/whats-the-news)!** 
*(Replace with your actual itch.io link)*

<img width="1879/2" height="969/2" alt="Opera Snapshot_2025-09-02_015556_whats-the-news-deploy vercel app" src="https://github.com/user-attachments/assets/40cbad2b-c4fb-4062-9a00-5869e1e47067" />
<img width="1879/2" height="969/2" alt="Opera Snapshot_2025-08-25_235007_localhost" src="https://github.com/user-attachments/assets/9acb049d-861a-4598-8007-77e1ce306a19" />


## Features

- **Live Headlines:** Every game is different, with questions pulled from the latest articles via The Guardian API.
- **Multiple Categories:** Choose from over a dozen categories like World News, Politics, Business, Music, and more to tailor your challenge.
- **Persistent Sessions:** Your score and lives are tracked across categories until you answer 50 questions or run out of lives.
- **Dynamic UI:** Answer options are presented in a clean, two-column layout.
- **Absurdist Humor:** Incorrect answers are slotted into the headline, creating funny "fake news" before the correct answer is revealed.
- **Modular & Expandable:** The category system is designed to be easily expandable by adding new entries to a configuration file.

## Tech Stack

- **Front-End:** [Phaser 3](https://phaser.io/) (HTML5 Game Framework), [Vite](https://vitejs.dev/)
- **Back-End:** [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/) (converted to a [Vercel Serverless Function](https://vercel.com/docs/functions))
- **Natural Language Processing:**
    - **[Compromise NLP](https://compromise.cool/):** A client-side library used for grammatical analysis to identify parts of speech (Nouns, Verbs, etc.) within headlines.
- **APIs:**
    - **[The Guardian API](https://open-platform.theguardian.com/):** For sourcing live news headlines.
    - **[Datamuse API](https://www.datamuse.com/api/):** For finding words that are semantically related to the correct answers to generate challenging distractors.
- **Deployment:**
    - The front-end and back-end are hosted on [Vercel](https://vercel.com/).
    - An alternative front-end build is playable on [itch.io](https://itch.io/).

## Local Development Setup

To run this project on your local machine, follow these steps:

#### 1. Prerequisites

- You must have [Node.js](https://nodejs.org/en/download/) (which includes npm) installed.
- You need a free API key from [The Guardian Open Platform](https://open-platform.theguardian.com/access/).

#### 2. Clone the Repository

git clone https://github.com/your-username/whats-the-news-deploy.git
cd whats-the-news-deploy
3. Install Dependencies
This will install all the necessary packages for both the front-end and the back-end.

npm install

4. Set Up Environment Variables

Create a new file in the root of the project named .env.
Add your Guardian API key and the API URL to this file:

Env
VITE_GUARDIAN_API_KEY="your-guardian-api-key-goes-here"
VITE_GUARDIAN_API_URL="https://content.guardianapis.com/search"

5. Run the Development Server
This project uses Vercel's development tools to run the front-end and the serverless back-end simultaneously.

# Install the Vercel CLI if you haven't already

npm install -g vercel

# Run the local development server

vercel dev

This will start the Vite server and the serverless functions. You can now access the game in your browser at the local address provided (usually http://localhost:3000).

6. Deployment
This project is configured for a full-stack deployment on Vercel.

Push the repository to GitHub.

Import the project into Vercel.

Add the VITE_GUARDIAN_API_KEY and VITE_GUARDIAN_API_URL as environment variables in the Vercel project settings.
Vercel will automatically build the front-end and deploy the api/news.js file as a serverless function.
An alternative build for itch.io can be created by creating an itch branch, modifying the serverUrl in src/main.js to the live Vercel URL, and running npm run build.

Acknowledgements
This project would not be possible without the rich free APIs provided by:
The Guardian for their comprehensive and accessible news API.
Datamuse & Compromise for their powerful word-finding APIs.
